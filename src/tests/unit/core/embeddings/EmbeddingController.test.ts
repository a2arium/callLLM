// @ts-nocheck
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EmbeddingController } from '../../../../core/embeddings/EmbeddingController.ts';
import { BaseAdapter } from '../../../../adapters/base/baseAdapter.ts';
import { ModelManager } from '../../../../core/models/ModelManager.ts';
import { TokenCalculator } from '../../../../core/models/TokenCalculator.ts';
import { CapabilityError } from '../../../../core/models/CapabilityError.ts';
import type { EmbeddingParams, EmbeddingResponse, ModelCapabilities } from '../../../../interfaces/UniversalInterfaces.ts';

// Create a mock adapter that implements embedding support
class MockEmbeddingAdapter extends BaseAdapter {
    async chatCall(): Promise<any> {
        throw new Error('Not implemented');
    }

    async streamCall(): Promise<any> {
        throw new Error('Not implemented');
    }

    convertToProviderParams(): unknown {
        throw new Error('Not implemented');
    }

    convertFromProviderResponse(): any {
        throw new Error('Not implemented');
    }

    convertFromProviderStreamResponse(): any {
        throw new Error('Not implemented');
    }

    // Implement embedding methods
    async embeddingCall(model: string, params: EmbeddingParams): Promise<EmbeddingResponse> {
        return {
            embeddings: [
                {
                    embedding: new Array(1536).fill(0).map(() => Math.random()),
                    index: 0,
                    object: 'embedding'
                }
            ],
            model,
            usage: {
                tokens: {
                    input: { total: 10, cached: 0 },
                    output: { total: 0, reasoning: 0 },
                    total: 10
                },
                costs: {
                    input: { total: 0.0002, cached: 0 },
                    output: { total: 0, reasoning: 0 },
                    total: 0.0002
                }
            },
            metadata: {
                created: Date.now(),
                model
            }
        };
    }
}

describe('EmbeddingController', () => {
    let embeddingController: EmbeddingController;
    let mockAdapter: MockEmbeddingAdapter;
    let mockModelManager: any;
    let mockTokenCalculator: any;

    beforeEach(() => {
        // Create mock instances
        mockAdapter = new MockEmbeddingAdapter({ apiKey: 'test-key' });

        // Create manual mocks
        mockModelManager = {
            getModel: jest.fn().mockReturnValue({
                name: 'text-embedding-3-small',
                capabilities: {
                    embeddings: {
                        maxInputLength: 8192,
                        dimensions: [512, 1536],
                        defaultDimensions: 1536,
                        encodingFormats: ['float', 'base64']
                    },
                    input: { text: true },
                    output: { text: false }
                }
            })
        };

        mockTokenCalculator = {
            calculateTokens: jest.fn().mockReturnValue(10)
        };

        // Mock ModelManager static method
        jest.spyOn(ModelManager, 'getCapabilities').mockReturnValue({
            embeddings: {
                maxInputLength: 8192,
                dimensions: [512, 1536],
                defaultDimensions: 1536,
                encodingFormats: ['float', 'base64']
            },
            input: { text: true },
            output: { text: false }
        });

        // Create embedding controller
        embeddingController = new EmbeddingController(
            mockAdapter,
            mockModelManager,
            mockTokenCalculator
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('generateEmbeddings', () => {
        it('should generate embeddings for single text input', async () => {
            const params: EmbeddingParams = {
                input: 'Hello, world!',
                model: 'text-embedding-3-small'
            };

            const result = await embeddingController.generateEmbeddings(params);

            expect(result).toBeDefined();
            expect(result.embeddings).toHaveLength(1);
            expect(result.embeddings[0].embedding).toHaveLength(1536);
            expect(result.embeddings[0].index).toBe(0);
            expect(result.embeddings[0].object).toBe('embedding');
            expect(result.model).toBe('text-embedding-3-small');
            expect(result.usage.tokens.total).toBe(10);
            expect(result.usage.costs.total).toBe(0.0002);
        });

        it('should generate embeddings for batch text input', async () => {
            const params: EmbeddingParams = {
                input: ['Hello, world!', 'How are you?'],
                model: 'text-embedding-3-small'
            };

            const result = await embeddingController.generateEmbeddings(params);

            expect(result).toBeDefined();
            expect(result.embeddings).toHaveLength(1); // Mock adapter returns single embedding
            expect(result.model).toBe('text-embedding-3-small');
        });

        it('should throw CapabilityError for model without embedding support', async () => {
            // Mock a model without embedding capabilities
            jest.spyOn(ModelManager, 'getCapabilities').mockReturnValue({
                input: { text: true },
                output: { text: true }
            });

            const params: EmbeddingParams = {
                input: 'Hello, world!',
                model: 'gpt-4'
            };

            await expect(embeddingController.generateEmbeddings(params))
                .rejects
                .toThrow(CapabilityError);
        });

        it('should throw CapabilityError when adapter does not support embeddings', async () => {
            // Create controller with adapter that doesn't support embeddings
            const nonEmbeddingAdapter = {
                embeddingCall: undefined
            } as any;

            const controller = new EmbeddingController(
                nonEmbeddingAdapter,
                mockModelManager,
                mockTokenCalculator
            );

            const params: EmbeddingParams = {
                input: 'Hello, world!',
                model: 'text-embedding-3-small'
            };

            await expect(controller.generateEmbeddings(params))
                .rejects
                .toThrow(CapabilityError);
        });
    });

    describe('checkEmbeddingCapabilities', () => {
        it('should return capabilities for embedding model', () => {
            const capabilities = embeddingController.checkEmbeddingCapabilities('text-embedding-3-small');

            expect(capabilities.supported).toBe(true);
            expect(capabilities.maxInputLength).toBe(8192);
            expect(capabilities.dimensions).toEqual([512, 1536]);
            expect(capabilities.defaultDimensions).toBe(1536);
            expect(capabilities.encodingFormats).toEqual(['float', 'base64']);
        });

        it('should return unsupported for non-embedding model', () => {
            // Mock a model without embedding capabilities
            jest.spyOn(ModelManager, 'getCapabilities').mockReturnValue({
                input: { text: true },
                output: { text: true }
            });

            const capabilities = embeddingController.checkEmbeddingCapabilities('gpt-4');

            expect(capabilities.supported).toBe(false);
        });
    });

    describe('usage tracking', () => {
        it('should trigger per-call usage callback when provided', async () => {
            const mockUsageCallback = jest.fn();
            const params: EmbeddingParams = {
                input: 'Hello, world!',
                model: 'text-embedding-3-small',
                usageCallback: mockUsageCallback
            };

            const result = await embeddingController.generateEmbeddings(params);

            expect(mockUsageCallback).toHaveBeenCalledTimes(1);
            expect(mockUsageCallback).toHaveBeenCalledWith({
                callerId: 'unknown',
                usage: result.usage,
                timestamp: expect.any(Number)
            });
        });

        it('should trigger global usage callback when provided', async () => {
            const mockGlobalCallback = jest.fn();
            const controllerWithGlobalCallback = new EmbeddingController(
                mockAdapter,
                mockModelManager,
                mockTokenCalculator,
                mockGlobalCallback,
                'test-caller-id'
            );

            const params: EmbeddingParams = {
                input: 'Hello, world!',
                model: 'text-embedding-3-small'
            };

            await controllerWithGlobalCallback.generateEmbeddings(params);

            expect(mockGlobalCallback).toHaveBeenCalledTimes(1);
            expect(mockGlobalCallback).toHaveBeenCalledWith({
                callerId: 'test-caller-id',
                usage: expect.objectContaining({
                    tokens: expect.objectContaining({
                        total: 10,
                        input: expect.objectContaining({ total: 10 }),
                        output: expect.objectContaining({ total: 0 })
                    }),
                    costs: expect.objectContaining({
                        total: 0.0002
                    })
                }),
                timestamp: expect.any(Number)
            });
        });

        it('should trigger both global and per-call callbacks when both provided', async () => {
            const mockGlobalCallback = jest.fn();
            const mockPerCallCallback = jest.fn();

            const controllerWithGlobalCallback = new EmbeddingController(
                mockAdapter,
                mockModelManager,
                mockTokenCalculator,
                mockGlobalCallback,
                'test-caller-id'
            );

            const params: EmbeddingParams = {
                input: 'Hello, world!',
                model: 'text-embedding-3-small',
                usageCallback: mockPerCallCallback
            };

            await controllerWithGlobalCallback.generateEmbeddings(params);

            expect(mockGlobalCallback).toHaveBeenCalledTimes(1);
            expect(mockPerCallCallback).toHaveBeenCalledTimes(1);
        });

        it('should handle async usage callbacks', async () => {
            let callbackCompleted = false;
            const mockAsyncCallback = jest.fn().mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                callbackCompleted = true;
            });

            const params: EmbeddingParams = {
                input: 'Hello, world!',
                model: 'text-embedding-3-small',
                usageCallback: mockAsyncCallback
            };

            await embeddingController.generateEmbeddings(params);

            expect(mockAsyncCallback).toHaveBeenCalledTimes(1);
            expect(callbackCompleted).toBe(true);
        });

        it('should provide correct usage data structure to callback', async () => {
            let capturedUsageData: any;
            const mockUsageCallback = jest.fn().mockImplementation((usageData) => {
                capturedUsageData = usageData;
            });

            const params: EmbeddingParams = {
                input: 'Hello, world!',
                model: 'text-embedding-3-small',
                usageCallback: mockUsageCallback
            };

            await embeddingController.generateEmbeddings(params);

            expect(capturedUsageData).toEqual({
                callerId: 'unknown',
                usage: {
                    tokens: {
                        input: { total: 10, cached: 0 },
                        output: { total: 0, reasoning: 0 },
                        total: 10
                    },
                    costs: {
                        input: { total: 0.0002, cached: 0 },
                        output: { total: 0, reasoning: 0 },
                        total: 0.0002
                    }
                },
                timestamp: expect.any(Number)
            });
        });

        it('should handle callback errors gracefully', async () => {
            const mockFailingCallback = jest.fn().mockRejectedValue(new Error('Callback error'));

            const params: EmbeddingParams = {
                input: 'Hello, world!',
                model: 'text-embedding-3-small',
                usageCallback: mockFailingCallback
            };

            // Should not throw even if callback fails
            const result = await embeddingController.generateEmbeddings(params);

            expect(result).toBeDefined();
            expect(mockFailingCallback).toHaveBeenCalledTimes(1);
        });

        it('should work without any usage callbacks', async () => {
            const params: EmbeddingParams = {
                input: 'Hello, world!',
                model: 'text-embedding-3-small'
            };

            const result = await embeddingController.generateEmbeddings(params);

            expect(result).toBeDefined();
            expect(result.usage).toBeDefined();
        });

        it('should use custom caller ID when provided', async () => {
            const mockUsageCallback = jest.fn();
            const controllerWithCallerId = new EmbeddingController(
                mockAdapter,
                mockModelManager,
                mockTokenCalculator,
                undefined,
                'custom-caller-123'
            );

            const params: EmbeddingParams = {
                input: 'Hello, world!',
                model: 'text-embedding-3-small',
                usageCallback: mockUsageCallback
            };

            await controllerWithCallerId.generateEmbeddings(params);

            expect(mockUsageCallback).toHaveBeenCalledWith({
                callerId: 'custom-caller-123',
                usage: expect.any(Object),
                timestamp: expect.any(Number)
            });
        });
    });
}); 