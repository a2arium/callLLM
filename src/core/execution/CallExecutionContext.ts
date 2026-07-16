import { v4 as uuidv4 } from 'uuid';
import type { LLMExecutionControl, LLMTerminalReason } from '../../interfaces/ExecutionInterfaces.ts';
import { LLMAbortError, LLMTimeoutError, isLLMCancellationError } from './errors.ts';
import type { UsageCallback } from '../../interfaces/UsageInterfaces.ts';
import type { TelemetryCollector } from '../telemetry/collector/TelemetryCollector.ts';
import type { ConversationContext } from '../telemetry/collector/types.ts';

const MAX_TIMEOUT_MS = 2_147_483_647;

export type CallExecutionOptions = {
    signal?: AbortSignal;
    timeoutMs?: number;
    usageCallback?: UsageCallback;
    callerId?: string;
};

type ExecutionState = 'active' | 'committing' | 'terminal';

/** Owns cancellation, deadline and exactly-once lifecycle state for one public operation. */
export class CallExecutionContext implements LLMExecutionControl {
    public readonly callId = uuidv4();
    public readonly startedAt = Date.now();
    public readonly signal: AbortSignal;
    public readonly usageCallback?: UsageCallback;
    public readonly callerId?: string;
    public telemetryCollector?: TelemetryCollector;
    public conversationContext?: ConversationContext;

    private readonly controller = new AbortController();
    private readonly externalSignal?: AbortSignal;
    private readonly timeoutMs?: number;
    private readonly deadlineAt?: number;
    private timer?: ReturnType<typeof setTimeout>;
    private state: ExecutionState = 'active';
    private terminalReason?: LLMTerminalReason;
    private terminalAt?: number;
    private cancellationError?: LLMAbortError | LLMTimeoutError;
    private readonly values = new Map<unknown, unknown>();
    private readonly commitActions: Array<() => void | Promise<void>> = [];
    private readonly rollbackActions: Array<() => void | Promise<void>> = [];
    private rolledBack = false;

    private readonly onExternalAbort = (): void => {
        this.abort(new LLMAbortError('LLM operation was aborted', {
            cause: this.externalSignal?.reason
        }), 'cancelled');
    };

    constructor(options: CallExecutionOptions = {}) {
        validateTimeoutMs(options.timeoutMs);
        this.externalSignal = options.signal;
        this.timeoutMs = options.timeoutMs;
        this.usageCallback = options.usageCallback;
        this.callerId = options.callerId;
        this.deadlineAt = options.timeoutMs === undefined ? undefined : this.startedAt + options.timeoutMs;
        this.signal = this.controller.signal;

        if (options.signal?.aborted) {
            this.onExternalAbort();
            return;
        }

        options.signal?.addEventListener('abort', this.onExternalAbort, { once: true });
        if (options.timeoutMs !== undefined) {
            this.timer = setTimeout(() => {
                this.abort(new LLMTimeoutError(options.timeoutMs as number), 'timeout');
            }, options.timeoutMs);
        }
    }

    public get isControlled(): boolean {
        return this.externalSignal !== undefined || this.timeoutMs !== undefined;
    }

    public get needsPropagation(): boolean {
        return this.isControlled || this.usageCallback !== undefined;
    }

    public get remainingMs(): number | undefined {
        return this.deadlineAt === undefined ? undefined : Math.max(0, this.deadlineAt - Date.now());
    }

    public get reason(): LLMTerminalReason | undefined {
        return this.terminalReason;
    }

    public get endedAt(): number | undefined {
        return this.terminalAt;
    }

    public throwIfAborted(): void {
        if (this.cancellationError) throw this.cancellationError;
    }

    public getOrCreate<T>(key: unknown, factory: () => T): T {
        if (!this.values.has(key)) this.values.set(key, factory());
        return this.values.get(key) as T;
    }

    public setTelemetryContext(collector: TelemetryCollector | undefined, conversation: ConversationContext | undefined): void {
        this.telemetryCollector = collector;
        this.conversationContext = conversation;
    }

    public onCommit(action: () => void | Promise<void>): void {
        this.commitActions.push(action);
    }

    public onRollback(action: () => void | Promise<void>): void {
        this.rollbackActions.push(action);
    }

    public async runCommitActions(): Promise<void> {
        for (const action of this.commitActions) await action();
        this.commitActions.length = 0;
        this.rollbackActions.length = 0;
    }

    public async rollback(): Promise<void> {
        if (this.rolledBack) return;
        this.rolledBack = true;
        const actions = this.rollbackActions.splice(0).reverse();
        this.commitActions.length = 0;
        await Promise.allSettled(actions.map(action => Promise.resolve().then(action)));
    }

    public async awaitOrAbort<T>(operation: PromiseLike<T> | (() => PromiseLike<T>)): Promise<T> {
        this.throwIfAborted();
        const promise = Promise.resolve(typeof operation === 'function' ? operation() : operation);
        if (!this.isControlled) return promise;

        let removeListener: (() => void) | undefined;
        const aborted = new Promise<never>((_resolve, reject) => {
            const listener = (): void => reject(this.cancellationError ?? new LLMAbortError());
            this.signal.addEventListener('abort', listener, { once: true });
            removeListener = () => this.signal.removeEventListener('abort', listener);
        });

        try {
            return await Promise.race([promise, aborted]);
        } finally {
            removeListener?.();
        }
    }

    /** Atomically prevents a later timeout from defeating a completed operation. */
    public beginCommit(): void {
        this.throwIfAborted();
        if (this.state !== 'active') {
            throw new Error(`Cannot begin commit from execution state "${this.state}"`);
        }
        this.state = 'committing';
        this.clearTimer();
    }

    public complete(): void {
        if (this.state === 'terminal') return;
        if (this.state === 'active') this.beginCommit();
        this.finish('completed');
    }

    public fail(error: unknown): void {
        if (this.state === 'terminal') return;
        if (isLLMCancellationError(error)) {
            this.abort(error, error instanceof LLMTimeoutError ? 'timeout' : 'cancelled');
            return;
        }
        this.finish('provider_error');
    }

    /** Used when a streaming consumer stops before natural completion. */
    public cancel(cause?: unknown): void {
        this.abort(new LLMAbortError('LLM stream consumption was cancelled', { cause }), 'cancelled');
    }

    public dispose(): void {
        this.clearTimer();
        this.externalSignal?.removeEventListener('abort', this.onExternalAbort);
    }

    private abort(error: LLMAbortError | LLMTimeoutError, reason: 'timeout' | 'cancelled'): void {
        if (this.state !== 'active') return;
        this.cancellationError = error;
        this.state = 'terminal';
        this.terminalReason = reason;
        this.terminalAt = Date.now();
        this.clearTimer();
        this.externalSignal?.removeEventListener('abort', this.onExternalAbort);
        this.controller.abort(error);
    }

    private finish(reason: 'completed' | 'provider_error'): void {
        this.state = 'terminal';
        this.terminalReason = reason;
        this.terminalAt = Date.now();
        this.dispose();
    }

    private clearTimer(): void {
        if (this.timer !== undefined) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
    }
}

export function validateTimeoutMs(timeoutMs: number | undefined): void {
    if (timeoutMs === undefined) return;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_TIMEOUT_MS) {
        throw new RangeError(`timeoutMs must be an integer between 1 and ${MAX_TIMEOUT_MS}`);
    }
}
