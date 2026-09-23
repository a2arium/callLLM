import { isProviderHttpError } from './ProviderHttpError.ts';
import { isProviderTransportError } from './ProviderTransportError.ts';

export type ProviderErrorProvenance = {
    status?: number;
    providerCode?: string;
    requestId?: string;
    responseId?: string;
};

const OWN_ERROR_CODES = new Set([
    'PROVIDER_HTTP_ERROR',
    'PROVIDER_TRANSPORT_ERROR',
    'STRUCTURED_OUTPUT_ERROR'
]);

/**
 * Read HTTP status from common SDK shapes (`status`) or transport wrappers (`statusCode`).
 */
export function extractProviderStatus(error: unknown): number | undefined {
    if (isProviderHttpError(error)) {
        return error.status;
    }
    if (isProviderTransportError(error)) {
        return error.statusCode;
    }
    if (!(error instanceof Error)) {
        return undefined;
    }
    if ('status' in error && typeof (error as { status?: unknown }).status === 'number') {
        return (error as { status: number }).status;
    }
    if ('statusCode' in error && typeof (error as { statusCode?: unknown }).statusCode === 'number') {
        return (error as { statusCode: number }).statusCode;
    }
    const matches = error.message.match(/\b([45]\d{2})\b/);
    if (matches?.[1]) {
        return parseInt(matches[1], 10);
    }
    return undefined;
}

/**
 * Normalize request identity from `requestId` or SDK `request_id`.
 */
export function extractProviderRequestIds(error: unknown): {
    requestId?: string;
    responseId?: string;
} {
    if (isProviderHttpError(error) || isProviderTransportError(error)) {
        return { requestId: error.requestId, responseId: error.responseId };
    }
    if (!(error instanceof Error)) {
        return {};
    }
    const record = error as Error & {
        requestId?: unknown;
        request_id?: unknown;
        responseId?: unknown;
    };
    const requestId =
        typeof record.requestId === 'string'
            ? record.requestId
            : typeof record.request_id === 'string'
              ? record.request_id
              : undefined;
    const responseId = typeof record.responseId === 'string' ? record.responseId : undefined;
    return { requestId, responseId };
}

/**
 * Provider/SDK error code (`code`), excluding CallLLM type discriminants.
 */
export function extractProviderCode(error: unknown): string | undefined {
    if (isProviderHttpError(error)) {
        return error.providerCode;
    }
    if (!(error instanceof Error)) {
        return undefined;
    }
    if (!('code' in error) || typeof (error as { code?: unknown }).code !== 'string') {
        return undefined;
    }
    const code = (error as { code: string }).code;
    if (OWN_ERROR_CODES.has(code)) {
        return undefined;
    }
    return code;
}

export function extractProviderProvenance(error: unknown): ProviderErrorProvenance {
    const { requestId, responseId } = extractProviderRequestIds(error);
    return {
        status: extractProviderStatus(error),
        providerCode: extractProviderCode(error),
        requestId,
        responseId
    };
}
