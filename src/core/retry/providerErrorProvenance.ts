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

const MAX_CAUSE_DEPTH = 5;

/**
 * Walk `cause` links with a bounded depth, guarding against cycles.
 */
export function walkErrorCauses(error: unknown, maxDepth = MAX_CAUSE_DEPTH): unknown[] {
    const out: unknown[] = [];
    const seen = new Set<unknown>();
    let current: unknown = error;
    for (let i = 0; i < maxDepth && current != null; i++) {
        if (seen.has(current)) {
            break;
        }
        seen.add(current);
        out.push(current);
        if (typeof current === 'object' && current !== null && 'cause' in current) {
            current = (current as { cause: unknown }).cause;
        } else {
            break;
        }
    }
    return out;
}

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
 * Normalize request identity from `requestId`, SDK `requestID`, or `request_id`.
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
        requestID?: unknown;
        request_id?: unknown;
        responseId?: unknown;
    };
    const requestId =
        typeof record.requestId === 'string'
            ? record.requestId
            : typeof record.requestID === 'string'
              ? record.requestID
              : typeof record.request_id === 'string'
                ? record.request_id
                : undefined;
    const responseId = typeof record.responseId === 'string' ? record.responseId : undefined;
    return { requestId, responseId };
}

/**
 * Provider/SDK error code (`code` or `providerCode`), excluding CallLLM type discriminants.
 */
export function extractProviderCode(error: unknown): string | undefined {
    if (isProviderHttpError(error)) {
        return error.providerCode;
    }
    if (!(error instanceof Error)) {
        return undefined;
    }
    const withProviderCode = error as Error & { providerCode?: unknown };
    if (typeof withProviderCode.providerCode === 'string') {
        return withProviderCode.providerCode;
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

function firstDefined<T>(values: Array<T | undefined>): T | undefined {
    for (const value of values) {
        if (value !== undefined) {
            return value;
        }
    }
    return undefined;
}

/**
 * Collect bounded provider identity from an error and its cause chain.
 * Prefer nearer frames; do not invent usage or charge from status alone.
 */
export function extractProviderProvenance(error: unknown): ProviderErrorProvenance {
    const chain = walkErrorCauses(error);
    const statuses = chain.map((node) => extractProviderStatus(node));
    // Prefer an explicit numeric status field over message-parsed status when both exist.
    let status: number | undefined;
    for (const node of chain) {
        if (!(node instanceof Error)) continue;
        if ('status' in node && typeof (node as { status?: unknown }).status === 'number') {
            status = (node as { status: number }).status;
            break;
        }
        if ('statusCode' in node && typeof (node as { statusCode?: unknown }).statusCode === 'number') {
            status = (node as { statusCode: number }).statusCode;
            break;
        }
    }
    if (status === undefined) {
        status = firstDefined(statuses);
    }

    const requestIds = chain.map((node) => extractProviderRequestIds(node));
    const codes = chain.map((node) => extractProviderCode(node));

    return {
        status,
        providerCode: firstDefined(codes),
        requestId: firstDefined(requestIds.map((ids) => ids.requestId)),
        responseId: firstDefined(requestIds.map((ids) => ids.responseId))
    };
}
