import { describe, expect, it } from '@jest/globals';
import { explainCapabilityMatch } from '../../../../core/models/CapabilityMatcher.ts';
import { inferRerankRequestRequirements } from '../../../../core/models/RequestInference.ts';
import { getOperationCost } from '../../../../core/models/ModelScoring.ts';
import type { ModelInfo } from '../../../../interfaces/UniversalInterfaces.ts';

const model: ModelInfo = {
    name: 'reranker',
    inputPricePerMillion: 1,
    outputPricePerMillion: 0,
    rerankPricing: { unit: 'document', price: 0.2, per: 100 },
    maxRequestTokens: 1000,
    maxResponseTokens: 0,
    capabilities: {
        reranking: { documentTypes: ['text'], maxDocuments: 10, maxTotalTokens: 1000 },
        input: { text: true },
        output: { text: false }
    },
    characteristics: { qualityIndex: 80, outputSpeed: 0, firstTokenLatency: 0 }
};

describe('rerank request selection', () => {
    it('infers capability, provider interface, token estimate, and score context', () => {
        const inferred = inferRerankRequestRequirements({
            query: 'hello',
            documents: ['one', 'two']
        });
        expect(inferred.operation).toBe('rerank');
        expect(inferred.requirements.reranking).toMatchObject({
            required: true,
            documentType: 'text',
            documentCount: 2
        });
        expect(inferred.requirements.providerInterfaces?.rerankCall).toBe(true);
        expect(inferred.scoreContext.documentCount).toBe(2);
    });

    it('requires both model capability and provider interface', () => {
        const candidate = { provider: 'siliconflow' as const, model };
        const requirement = {
            textInput: true as const,
            reranking: { required: true, documentType: 'text' as const, documentCount: 2 },
            providerInterfaces: { rerankCall: true }
        };
        expect(explainCapabilityMatch(candidate, requirement, { rerankCall: true }).matches).toBe(true);
        expect(explainCapabilityMatch(candidate, requirement, { rerankCall: false }).rejectionReasons)
            .toContain('provider rerankCall interface is not available');
        expect(explainCapabilityMatch(candidate, {
            ...requirement,
            reranking: { ...requirement.reranking, documentCount: 11 }
        }, { rerankCall: true }).matches).toBe(false);
    });

    it('estimates operation cost from the configured meter', () => {
        expect(getOperationCost(model, 'rerank', { documentCount: 50 })).toBeCloseTo(0.1);
        expect(getOperationCost({
            ...model,
            rerankPricing: { unit: 'token', price: 2, per: 1_000_000 }
        }, 'rerank', { estimatedInputTokens: 10_000 })).toBeCloseTo(0.02);
    });
});
