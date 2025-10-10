import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { LLMCaller } from '../../../../core/caller/LLMCaller.ts';
import { ProviderManager } from '../../../../core/caller/ProviderManager.ts';
import { ModelManager } from '../../../../core/models/ModelManager.ts';
import { TokenCalculator } from '../../../../core/models/TokenCalculator.ts';
import type { RegisteredProviders } from '../../../../adapters/index.ts';
import type { EmbeddingResponse, ModelInfo } from '../../../../interfaces/UniversalInterfaces.ts';
import { CapabilityError } from '../../../../core/models/CapabilityError.ts';

// Minimal mock BaseAdapter with embedding support
class MockEmbeddingAdapter {
    public async embeddingCall(model: string): Promise<EmbeddingResponse> {
        return {
            embeddings: [{ embedding: Array(4).fill(0.1), index: 0, object: 'embedding' }],
            model,
            usage: {
                tokens: { input: { total: 10, cached: 0 }, output: { total: 0, reasoning: 0 }, total: 10 },
                costs: { input: { total: 0.0001, cached: 0 }, output: { total: 0, reasoning: 0 }, total: 0.0001 }
            },
            metadata: { created: Date.now(), model }
        };
    }
}

describe('LLMCaller embeddings API', () => {
    let providerManager: any;
    let modelManager: any;
    let tokenCalculator: any;

    beforeEach(() => {
        providerManager = {
            getProvider: jest.fn().mockReturnValue(new MockEmbeddingAdapter())
        } as unknown as ProviderManager;

        const embeddingModel: ModelInfo = {
            name: 'text-embedding-3-small',
            inputPricePerMillion: 0.01,
            outputPricePerMillion: 0,
            maxRequestTokens: 8192,
            maxResponseTokens: 0,
            capabilities: {
                streaming: false,
                toolCalls: false,
                embeddings: {
                    maxInputLength: 8192,
                    dimensions: [512, 1536],
                    defaultDimensions: 1536,
                    encodingFormats: ['float', 'base64']
                },
                input: { text: true },
                output: { text: false }
            },
            characteristics: { qualityIndex: 1, outputSpeed: 0, firstTokenLatency: 1 }
        };

        modelManager = {
            getModel: jest.fn().mockReturnValue(embeddingModel),
            getAvailableModels: jest.fn().mockReturnValue([embeddingModel])
        } as unknown as ModelManager;

        tokenCalculator = new TokenCalculator();

        // Ensure static capabilities resolve for our tests
        jest.spyOn(ModelManager, 'getCapabilities').mockImplementation((name: string) => {
            if (name === 'text-embedding-3-small') {
                return embeddingModel.capabilities as any;
            }
            return { streaming: true, input: { text: true }, output: { text: true } } as any;
        });
    });

    it('embeddings() delegates to EmbeddingController and returns response', async () => {
        const llm = new LLMCaller('openai' as RegisteredProviders, 'gpt-4.1', 'sys', {
            providerManager,
            modelManager,
            tokenCalculator
        });

        const res = await llm.embeddings({ input: 'hi', model: 'text-embedding-3-small' });
        expect(res.model).toBe('text-embedding-3-small');
        expect(res.embeddings).toHaveLength(1);
        expect(res.embeddings[0].embedding.length).toBe(4);
        expect(res.usage.tokens.total).toBe(10);
    });

    it('embeddings() throws when model lacks embedding capability', async () => {
        // Mock a non-embedding model
        const nonEmbeddingModel: ModelInfo = {
            name: 'gpt-4.1',
            inputPricePerMillion: 0.01,
            outputPricePerMillion: 0.02,
            maxRequestTokens: 4000,
            maxResponseTokens: 1000,
            capabilities: {
                streaming: true,
                toolCalls: true,
                input: { text: true },
                output: { text: true }
            },
            characteristics: { qualityIndex: 90, outputSpeed: 50, firstTokenLatency: 300 }
        };

        // Mock getModel to return non-embedding model
        modelManager.getModel.mockReturnValue(nonEmbeddingModel);

        // Mock getCapabilities for this model
        (ModelManager.getCapabilities as any).mockReturnValueOnce({
            input: { text: true },
            output: { text: true }
        });

        const llm = new LLMCaller('openai' as RegisteredProviders, 'gpt-4.1', 'sys', {
            providerManager,
            modelManager,
            tokenCalculator
        });

        await expect(llm.embeddings({ input: 'hi', model: 'gpt-4.1' })).rejects.toThrow(CapabilityError);
    });

    it('getAvailableEmbeddingModels() returns embedding models', () => {
        const llm = new LLMCaller('openai' as RegisteredProviders, 'gpt-4.1', 'sys', {
            providerManager,
            modelManager,
            tokenCalculator
        });
        const names = llm.getAvailableEmbeddingModels();
        expect(names).toEqual(['text-embedding-3-small']);
    });

    it('checkEmbeddingCapabilities() returns detailed capabilities', () => {
        const llm = new LLMCaller('openai' as RegisteredProviders, 'gpt-4.1', 'sys', {
            providerManager,
            modelManager,
            tokenCalculator
        });
        const caps = llm.checkEmbeddingCapabilities('text-embedding-3-small');
        expect(caps.supported).toBe(true);
        expect(caps.dimensions).toEqual([512, 1536]);
        expect(caps.defaultDimensions).toBe(1536);
        expect(caps.encodingFormats).toEqual(['float', 'base64']);
    });
});


