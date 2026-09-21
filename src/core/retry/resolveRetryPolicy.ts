import { RETRYABLE_STATUS_CODES } from './utils/networkErrors.ts';
import type {
    RetryPolicy,
    RetryStructuredOutputReason,
    UniversalChatSettings
} from '../../interfaces/UniversalInterfaces.ts';

const ALL_SO_REASONS: RetryStructuredOutputReason[] = [
    'refusal',
    'max_output_tokens',
    'empty',
    'non_json',
    'json_parse',
    'schema_validation'
];

export type ResolvedRetryPolicy = {
    transport: {
        maxRetries: number;
        baseDelayMs: number;
        retryableStatusCodes: number[];
    };
    structuredOutput: {
        maxRetries: number;
        retryReasons: RetryStructuredOutputReason[];
    };
    content: {
        maxRetries: number;
        enabled: boolean;
    };
};

/**
 * Resolve class-scoped ceilings from settings.
 * - No `retryPolicy`: legacy shared `maxRetries` (default 3) for all classes.
 * - With `retryPolicy`: omitted classes default to 0.
 */
export function resolveRetryPolicy(settings?: UniversalChatSettings | null): ResolvedRetryPolicy {
    const legacyMax = settings?.maxRetries ?? 3;
    const contentEnabled = settings?.shouldRetryDueToContent !== false;
    const policy: RetryPolicy | undefined = settings?.retryPolicy;

    if (!policy) {
        return {
            transport: {
                maxRetries: legacyMax,
                baseDelayMs: 1000,
                retryableStatusCodes: [...RETRYABLE_STATUS_CODES]
            },
            structuredOutput: {
                maxRetries: legacyMax,
                retryReasons: [...ALL_SO_REASONS]
            },
            content: {
                maxRetries: legacyMax,
                enabled: contentEnabled
            }
        };
    }

    const transportMax = policy.transport?.maxRetries ?? 0;
    const soMax = policy.structuredOutput?.maxRetries ?? 0;
    const contentMax = policy.content?.maxRetries ?? 0;

    return {
        transport: {
            maxRetries: transportMax,
            baseDelayMs: policy.transport?.baseDelayMs ?? 1000,
            retryableStatusCodes: policy.transport?.retryableStatusCodes
                ? [...policy.transport.retryableStatusCodes]
                : [...RETRYABLE_STATUS_CODES]
        },
        structuredOutput: {
            maxRetries: soMax,
            retryReasons: policy.structuredOutput?.retryReasons?.length
                ? [...policy.structuredOutput.retryReasons]
                : [...ALL_SO_REASONS]
        },
        content: {
            maxRetries: contentMax,
            enabled: contentEnabled
        }
    };
}
