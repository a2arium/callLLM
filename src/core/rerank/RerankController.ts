import type { BaseAdapter } from '../../adapters/base/baseAdapter.ts';
import type { LLMExecutionControl } from '../../interfaces/ExecutionInterfaces.ts';
import type {
    RerankCallOptions,
    RerankParams,
    RerankResponse,
    RerankResult
} from '../../interfaces/UniversalInterfaces.ts';
import { CapabilityError } from '../models/CapabilityError.ts';

export class RerankController {
    constructor(private readonly adapter: BaseAdapter) {}

    async rerank(
        model: string,
        options: RerankCallOptions,
        control?: LLMExecutionControl
    ): Promise<RerankResponse> {
        const { params, documentIds } = this.normalize(options);
        if (typeof this.adapter.rerankCall !== 'function') {
            throw new CapabilityError('Provider does not support reranking');
        }
        const response = await this.adapter.rerankCall(model, params, control);
        return {
            ...response,
            model: response.model || model,
            results: this.validateResults(response.results, params.documents.length, params.topN)
                .map(result => ({
                    ...result,
                    ...(documentIds[result.index] ? { documentId: documentIds[result.index] } : {})
                }))
        };
    }

    private normalize(options: RerankCallOptions): {
        params: RerankParams;
        documentIds: Array<string | undefined>;
    } {
        if (typeof options.query !== 'string' || options.query.trim().length === 0) {
            throw new TypeError('Rerank query must be a non-empty string');
        }
        if (!Array.isArray(options.documents) || options.documents.length === 0) {
            throw new TypeError('Rerank documents must contain at least one document');
        }
        if (options.topN !== undefined && (
            !Number.isInteger(options.topN) ||
            options.topN < 1 ||
            options.topN > options.documents.length
        )) {
            throw new RangeError('Rerank topN must be an integer between 1 and the document count');
        }

        const ids = new Set<string>();
        const documentIds: Array<string | undefined> = [];
        const documents = options.documents.map((document, index) => {
            const text = typeof document === 'string' ? document : document.text;
            if (typeof text !== 'string' || text.trim().length === 0) {
                throw new TypeError(`Rerank document at index ${index} must contain non-empty text`);
            }
            if (typeof document !== 'string' && document.id !== undefined) {
                if (typeof document.id !== 'string' || document.id.trim().length === 0) {
                    throw new TypeError(`Rerank document ID at index ${index} must be non-empty`);
                }
                if (ids.has(document.id)) {
                    throw new TypeError(`Duplicate rerank document ID: ${document.id}`);
                }
                ids.add(document.id);
                documentIds[index] = document.id;
            }
            return text;
        });

        return {
            params: {
                query: options.query,
                documents,
                topN: options.topN,
                providerOptions: options.settings?.providerOptions
            },
            documentIds
        };
    }

    private validateResults(
        results: RerankResult[],
        documentCount: number,
        topN?: number
    ): RerankResult[] {
        if (!Array.isArray(results)) {
            throw new TypeError('Rerank provider response results must be an array');
        }
        if (results.length > (topN ?? documentCount)) {
            throw new RangeError('Rerank provider returned more results than requested');
        }
        const indices = new Set<number>();
        for (const result of results) {
            if (!Number.isInteger(result.index) || result.index < 0 || result.index >= documentCount) {
                throw new RangeError(`Rerank provider returned invalid document index: ${result.index}`);
            }
            if (indices.has(result.index)) {
                throw new RangeError(`Rerank provider returned duplicate document index: ${result.index}`);
            }
            indices.add(result.index);
            if (result.relevanceScore !== undefined && !Number.isFinite(result.relevanceScore)) {
                throw new TypeError('Rerank relevanceScore must be finite when present');
            }
        }
        return results;
    }
}
