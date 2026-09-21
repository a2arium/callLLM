import type {
    CallMessagesOptions,
    RequestScopedTextMessage,
    UniversalMessage
} from '../../interfaces/UniversalInterfaces.ts';

const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);
const ALLOWED_MESSAGE_KEYS = new Set(['role', 'content']);

/** Keys that belong to LLMCallOptions but are not part of CallMessagesOptions. */
const FORBIDDEN_CALL_MESSAGES_OPTION_KEYS = [
    'text',
    'historyMode',
    'file',
    'files',
    'mask',
    'data',
    'endingMessage',
    'input',
    'output',
    'outputPath',
    'maxCharsPerChunk',
    'maxChunkIterations',
    'maxParallelRequests'
] as const;

export type CallMessagesValidationReason =
    | 'empty_array'
    | 'invalid_message'
    | 'empty_content'
    | 'unsupported_role'
    | 'extra_fields'
    | 'multiple_system'
    | 'final_not_user'
    | 'unsupported_option';

export type CallMessagesValidationErrorOptions = {
    message: string;
    reason: CallMessagesValidationReason;
    index?: number;
    field?: string;
};

/**
 * Typed validation failure for request-scoped callMessages input.
 * Thrown before any provider contact.
 */
export class CallMessagesValidationError extends Error {
    public readonly name = 'CallMessagesValidationError';
    public readonly code = 'CALL_MESSAGES_VALIDATION_ERROR' as const;
    public readonly reason: CallMessagesValidationReason;
    public readonly index?: number;
    public readonly field?: string;

    constructor(options: CallMessagesValidationErrorOptions) {
        super(options.message);
        this.reason = options.reason;
        this.index = options.index;
        this.field = options.field;
    }
}

export type RequestContextOverflowErrorOptions = {
    message: string;
    tokenCount: number;
    maxRequestTokens: number;
    reservedResponseTokens: number;
};

/**
 * Thrown when a seeded transcript cannot fit the resolved model context.
 * callMessages never auto-chunks; overflow fails explicitly.
 */
export class RequestContextOverflowError extends Error {
    public readonly name = 'RequestContextOverflowError';
    public readonly code = 'REQUEST_CONTEXT_OVERFLOW' as const;
    public readonly tokenCount: number;
    public readonly maxRequestTokens: number;
    public readonly reservedResponseTokens: number;

    constructor(options: RequestContextOverflowErrorOptions) {
        super(options.message);
        this.tokenCount = options.tokenCount;
        this.maxRequestTokens = options.maxRequestTokens;
        this.reservedResponseTokens = options.reservedResponseTokens;
    }
}

/**
 * Validate and defensively clone a request-scoped transcript.
 * Preserves content exactly (including whitespace); never drops, collapses, or reorders.
 */
export function validateAndCloneRequestMessages(
    messages: readonly RequestScopedTextMessage[]
): UniversalMessage[] {
    if (!Array.isArray(messages) || messages.length === 0) {
        throw new CallMessagesValidationError({
            message: 'callMessages requires at least one message',
            reason: 'empty_array'
        });
    }

    const cloned: UniversalMessage[] = [];
    let systemCount = 0;

    for (let index = 0; index < messages.length; index++) {
        const raw = messages[index] as unknown;
        if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
            throw new CallMessagesValidationError({
                message: `callMessages message at index ${index} must be an object`,
                reason: 'invalid_message',
                index
            });
        }

        const record = raw as Record<string, unknown>;
        const extraKeys = Object.keys(record).filter(key => !ALLOWED_MESSAGE_KEYS.has(key));
        if (extraKeys.length > 0) {
            throw new CallMessagesValidationError({
                message: `callMessages message at index ${index} has unsupported fields: ${extraKeys.join(', ')}`,
                reason: 'extra_fields',
                index,
                field: extraKeys[0]
            });
        }

        const role = record.role;
        if (typeof role !== 'string' || !ALLOWED_ROLES.has(role)) {
            throw new CallMessagesValidationError({
                message: `callMessages message at index ${index} has unsupported role: ${String(role)}`,
                reason: 'unsupported_role',
                index,
                field: 'role'
            });
        }

        const content = record.content;
        if (typeof content !== 'string') {
            throw new CallMessagesValidationError({
                message: `callMessages message at index ${index} content must be a string`,
                reason: 'invalid_message',
                index,
                field: 'content'
            });
        }

        if (content === '') {
            throw new CallMessagesValidationError({
                message: `callMessages message at index ${index} has empty content`,
                reason: 'empty_content',
                index,
                field: 'content'
            });
        }

        if (role === 'system') {
            systemCount += 1;
            if (systemCount > 1) {
                throw new CallMessagesValidationError({
                    message: 'callMessages accepts at most one system message',
                    reason: 'multiple_system',
                    index
                });
            }
        }

        cloned.push({ role: role as UniversalMessage['role'], content });
    }

    const last = cloned[cloned.length - 1];
    if (last.role !== 'user') {
        throw new CallMessagesValidationError({
            message: 'callMessages requires the final message to have role "user"',
            reason: 'final_not_user',
            index: cloned.length - 1
        });
    }

    return cloned;
}

/**
 * Runtime-reject option keys that are intentionally absent from CallMessagesOptions.
 */
export function assertCallMessagesOptions(options: CallMessagesOptions | undefined): void {
    if (options === undefined) return;
    const record = options as Record<string, unknown>;
    for (const key of FORBIDDEN_CALL_MESSAGES_OPTION_KEYS) {
        if (record[key] !== undefined) {
            throw new CallMessagesValidationError({
                message: `callMessages does not support option "${key}"`,
                reason: 'unsupported_option',
                field: key
            });
        }
    }
}
