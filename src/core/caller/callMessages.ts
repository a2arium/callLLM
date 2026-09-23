import type {
    CallMessagesOptions,
    ProviderStoragePolicy,
    RequestScopedTextMessage,
    UniversalChatSettings,
    UniversalMessage
} from '../../interfaces/UniversalInterfaces.ts';

const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);
const ALLOWED_MESSAGE_KEYS = new Set(['role', 'content']);
const ALLOWED_PROVIDER_STORAGE_POLICIES = new Set<ProviderStoragePolicy>(['disabled']);

/** Providers with a verified mapping for providerStorage: 'disabled'. */
const PROVIDER_STORAGE_DISABLED_SUPPORT = new Set(['openai', 'vercel']);

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
    | 'unsupported_option'
    | 'provider_storage_conflict';

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

export type ProviderStorageUnsupportedErrorOptions = {
    message: string;
    provider: string;
    policy: ProviderStoragePolicy;
};

/**
 * Thrown when providerStorage cannot be satisfied by the resolved provider.
 * Fail-closed before any provider contact.
 */
export class ProviderStorageUnsupportedError extends Error {
    public readonly name = 'ProviderStorageUnsupportedError';
    public readonly code = 'PROVIDER_STORAGE_UNSUPPORTED' as const;
    public readonly provider: string;
    public readonly policy: ProviderStoragePolicy;

    constructor(options: ProviderStorageUnsupportedErrorOptions) {
        super(options.message);
        this.provider = options.provider;
        this.policy = options.policy;
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

    if (record.providerStorage !== undefined) {
        if (typeof record.providerStorage !== 'string'
            || !ALLOWED_PROVIDER_STORAGE_POLICIES.has(record.providerStorage as ProviderStoragePolicy)) {
            throw new CallMessagesValidationError({
                message: `callMessages providerStorage must be "disabled" when set (received ${JSON.stringify(record.providerStorage)})`,
                reason: 'unsupported_option',
                field: 'providerStorage'
            });
        }
    }
}

function readOpenAIStore(settings: UniversalChatSettings | undefined): boolean | undefined {
    const openai = settings?.providerOptions?.openai;
    if (openai === undefined || openai === null || typeof openai !== 'object' || Array.isArray(openai)) {
        return undefined;
    }
    const store = (openai as Record<string, unknown>).store;
    return typeof store === 'boolean' ? store : undefined;
}

function readGatewayZeroDataRetention(settings: UniversalChatSettings | undefined): boolean | undefined {
    const gateway = settings?.providerOptions?.gateway;
    if (gateway === undefined || gateway === null || typeof gateway !== 'object' || Array.isArray(gateway)) {
        return undefined;
    }
    const zeroDataRetention = (gateway as Record<string, unknown>).zeroDataRetention;
    return typeof zeroDataRetention === 'boolean' ? zeroDataRetention : undefined;
}

function asPlainObject(value: unknown): Record<string, unknown> {
    if (value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return { ...(value as Record<string, unknown>) };
    }
    return {};
}

/**
 * Translate providerStorage into verified provider-specific settings.
 * Omission is a no-op. 'disabled' is fail-closed for unsupported providers.
 * Does not claim to disable CallLLM telemetry, billing, or provider safety retention.
 */
export function applyProviderStoragePolicy(
    settings: UniversalChatSettings | undefined,
    policy: ProviderStoragePolicy | undefined,
    provider: string
): UniversalChatSettings | undefined {
    if (policy === undefined) return settings;

    if (policy !== 'disabled') {
        throw new CallMessagesValidationError({
            message: `callMessages providerStorage must be "disabled" when set (received ${JSON.stringify(policy)})`,
            reason: 'unsupported_option',
            field: 'providerStorage'
        });
    }

    if (!PROVIDER_STORAGE_DISABLED_SUPPORT.has(provider)) {
        throw new ProviderStorageUnsupportedError({
            message: `providerStorage: "disabled" is not supported by provider "${provider}"`,
            provider,
            policy: 'disabled'
        });
    }

    const existingProviderOptions = settings?.providerOptions ?? {};

    if (provider === 'openai') {
        if (readOpenAIStore(settings) === true) {
            throw new CallMessagesValidationError({
                message: 'providerStorage: "disabled" conflicts with settings.providerOptions.openai.store: true',
                reason: 'provider_storage_conflict',
                field: 'providerStorage'
            });
        }

        return {
            ...settings,
            providerOptions: {
                ...existingProviderOptions,
                openai: {
                    ...asPlainObject(existingProviderOptions.openai),
                    store: false
                }
            }
        };
    }

    // vercel → AI Gateway zero-data-retention routing
    if (readGatewayZeroDataRetention(settings) === false) {
        throw new CallMessagesValidationError({
            message: 'providerStorage: "disabled" conflicts with settings.providerOptions.gateway.zeroDataRetention: false',
            reason: 'provider_storage_conflict',
            field: 'providerStorage'
        });
    }

    return {
        ...settings,
        providerOptions: {
            ...existingProviderOptions,
            gateway: {
                ...asPlainObject(existingProviderOptions.gateway),
                zeroDataRetention: true
            }
        }
    };
}
