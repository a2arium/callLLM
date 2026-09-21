import type {
    RetryFailureClass,
    RetryStructuredOutputReason,
    Usage
} from '../../interfaces/UniversalInterfaces.ts';
import { isLLMCancellationError } from '../execution/errors.ts';
import {
    isStructuredOutputError,
    type StructuredOutputFailureReason
} from '../processors/StructuredOutputError.ts';
import { isNetworkError, RETRYABLE_STATUS_CODES } from './utils/networkErrors.ts';
import { isProviderTransportError } from './ProviderTransportError.ts';

export type RetryClassification = {
    /** When undefined, the failure must not be retried. */
    retryClass?: RetryFailureClass;
    reason?: string;
    statusCode?: number;
    requestId?: string;
    responseId?: string;
    usage?: Usage;
    usageAmbiguous: boolean;
    costUnresolved: boolean;
};

export type ClassifyRetryFailureOptions = {
    retryableStatusCodes?: number[];
};

function extractStatusCode(error: Error): number | undefined {
    if ('status' in error && typeof (error as { status?: number }).status === 'number') {
        return (error as { status: number }).status;
    }
    const matches = error.message.match(/\b([45]\d{2})\b/);
    if (matches && matches[1]) {
        return parseInt(matches[1], 10);
    }
    return undefined;
}

function extractIds(error: Error): { requestId?: string; responseId?: string } {
    const requestId =
        'requestId' in error && typeof (error as { requestId?: unknown }).requestId === 'string'
            ? (error as { requestId: string }).requestId
            : undefined;
    const responseId =
        'responseId' in error && typeof (error as { responseId?: unknown }).responseId === 'string'
            ? (error as { responseId: string }).responseId
            : undefined;
    return { requestId, responseId };
}

function isUsageAmbiguousTimeout(message: string): boolean {
    const m = message.toLowerCase();
    // Timeouts / premature closes after the request may already have been accepted.
    return (
        m.includes('timeout') ||
        m.includes('timed out') ||
        m.includes('premature close') ||
        m.includes('request timeout') ||
        m.includes('socket hang up')
    );
}

function isClearMissBeforeResponse(message: string): boolean {
    const m = message.toLowerCase().replace(/_/g, ' ');
    return (
        m.includes('enotfound') ||
        m.includes('econnrefused') ||
        m.includes('ehostunreach') ||
        m.includes('enetunreach') ||
        m.includes('getaddrinfo') ||
        m.includes('dns')
    );
}

/**
 * Classify an operation failure into a retry class for selective ceilings.
 * Cancellation is never retryable (`retryClass` undefined).
 */
export function classifyRetryFailure(
    error: unknown,
    options?: ClassifyRetryFailureOptions
): RetryClassification {
    if (!error) {
        return { usageAmbiguous: false, costUnresolved: false };
    }

    if (isLLMCancellationError(error)) {
        return { usageAmbiguous: false, costUnresolved: false };
    }

    if (isStructuredOutputError(error)) {
        return {
            retryClass: 'structuredOutput',
            reason: error.reason as StructuredOutputFailureReason,
            usage: error.usage,
            usageAmbiguous: false,
            costUnresolved: !error.usage,
            requestId: undefined,
            responseId: undefined
        };
    }

    if (isProviderTransportError(error)) {
        return {
            retryClass: 'transport',
            reason: error.reason,
            statusCode: error.statusCode,
            requestId: error.requestId,
            responseId: error.responseId,
            usage: error.usage,
            usageAmbiguous: error.usageAmbiguous,
            costUnresolved: error.costUnresolved
        };
    }

    if (!(error instanceof Error)) {
        return { usageAmbiguous: false, costUnresolved: false };
    }

    const { requestId, responseId } = extractIds(error);

    if (error.message.startsWith('Response content triggered retry')) {
        return {
            retryClass: 'content',
            reason: error.message,
            requestId,
            responseId,
            usageAmbiguous: false,
            costUnresolved: false
        };
    }

    // Legacy message-based JSON/schema failures (pre-StructuredOutputError paths)
    if (
        error.message.includes('Failed to parse JSON response') ||
        error.message.includes('Failed to validate response')
    ) {
        const reason: RetryStructuredOutputReason = error.message.includes('Failed to validate')
            ? 'schema_validation'
            : 'json_parse';
        return {
            retryClass: 'structuredOutput',
            reason,
            requestId,
            responseId,
            usageAmbiguous: false,
            costUnresolved: true
        };
    }

    const statusCodes = options?.retryableStatusCodes ?? RETRYABLE_STATUS_CODES;
    const statusCode = extractStatusCode(error);
    if (statusCode !== undefined && statusCodes.includes(statusCode)) {
        // HTTP response received — cost may or may not be billed; treat 5xx/429 as ambiguous when no usage.
        const usageAmbiguous = statusCode === 408 || statusCode >= 500;
        return {
            retryClass: 'transport',
            reason: `http_${statusCode}`,
            statusCode,
            requestId,
            responseId,
            usageAmbiguous,
            costUnresolved: usageAmbiguous
        };
    }

    if (isNetworkError(error)) {
        const clearMiss = isClearMissBeforeResponse(error.message);
        const ambiguous = !clearMiss && isUsageAmbiguousTimeout(error.message);
        return {
            retryClass: 'transport',
            reason: clearMiss ? 'dns_or_unreachable' : ambiguous ? 'timeout_or_disconnect' : 'network',
            statusCode,
            requestId,
            responseId,
            usageAmbiguous: ambiguous,
            costUnresolved: ambiguous
        };
    }

    return {
        statusCode,
        requestId,
        responseId,
        usageAmbiguous: false,
        costUnresolved: false
    };
}
