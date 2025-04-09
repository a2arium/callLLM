import { z } from 'zod';
import { LLMCaller } from '../../core/LLMCaller';
import { ModelManager } from '../../core/models/ModelManager';
import { ChatController } from '../../core/chat/ChatController';
import { StreamingService } from '../../core/streaming/StreamingService';
import { ResponseProcessor } from '../../core/processors/ResponseProcessor';
import { UniversalMessage, UniversalChatResponse, UniversalStreamResponse, ModelInfo, FinishReason, UniversalChatParams, JSONSchemaDefinition } from '../../interfaces/UniversalInterfaces';

// Mock implementations
jest.mock('../../core/models/ModelManager');
jest.mock('../../core/chat/ChatController');
jest.mock('../../core/streaming/StreamingService');
jest.mock('../../core/processors/ResponseProcessor');

describe('LLMCaller Integration Tests', () => {
    let llmCaller: LLMCaller;
    let modelManager: ModelManager;
    let chatController: jest.Mocked<ChatController>;
    let streamingService: jest.Mocked<StreamingService>;
    let responseProcessor: ResponseProcessor;

    const testMessages: UniversalMessage[] = [
        { role: 'user', content: 'Hello' }
    ];

    const testSchema = z.object({
        name: z.string(),
        age: z.number()
    });

    const mockModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 0.0001,
        outputPricePerMillion: 0.0002,
        maxRequestTokens: 4000,
        maxResponseTokens: 4000,
        characteristics: {
            qualityIndex: 80,
            outputSpeed: 20,
            firstTokenLatency: 500
        },
        capabilities: {
            jsonMode: true,
            streaming: true,
            toolCalls: true,
            parallelToolCalls: false,
            batchProcessing: false,
            systemMessages: true,
            temperature: true
        }
    } satisfies ModelInfo;

    const mockModelInfoNoJson = {
        name: 'test-model-no-json',
        inputPricePerMillion: 0.0001,
        outputPricePerMillion: 0.0002,
        maxRequestTokens: 4000,
        maxResponseTokens: 4000,
        characteristics: {
            qualityIndex: 80,
            outputSpeed: 20,
            firstTokenLatency: 500
        },
        capabilities: {
            jsonMode: false,
            streaming: true,
            toolCalls: true,
            parallelToolCalls: false,
            batchProcessing: false,
            systemMessages: true,
            temperature: true
        }
    } satisfies ModelInfo;

    const mockModelInfoNoCapabilities = {
        name: 'test-model-no-capabilities',
        inputPricePerMillion: 0.0001,
        outputPricePerMillion: 0.0002,
        maxRequestTokens: 4000,
        maxResponseTokens: 4000,
        characteristics: {
            qualityIndex: 80,
            outputSpeed: 20,
            firstTokenLatency: 500
        }
    } satisfies ModelInfo;

    beforeEach(() => {
        responseProcessor = new ResponseProcessor();
        modelManager = {
            getModel: jest.fn(),
            addModel: jest.fn(),
            getAvailableModels: jest.fn(),
            updateModel: jest.fn(),
            clearModels: jest.fn(),
            hasModel: jest.fn(),
            resolveModel: jest.fn()
        } as unknown as jest.Mocked<ModelManager>;
        const mockExecute = jest.fn<Promise<UniversalChatResponse>, [UniversalChatParams]>();
        mockExecute.mockResolvedValue({
            content: '{"message": "Hello there!"}',
            role: 'assistant',
            metadata: {
                finishReason: FinishReason.STOP
            }
        });

        chatController = {
            execute: mockExecute,
            setToolOrchestrator: jest.fn()
        } as unknown as jest.Mocked<ChatController>;

        const mockCreateStream = jest.fn<AsyncIterable<UniversalStreamResponse>, [UniversalChatParams, string, string | undefined]>();
        mockCreateStream.mockImplementation(async function* () {
            yield {
                content: '{"message": "Hello there!"}',
                role: 'assistant',
                isComplete: true,
                metadata: {
                    finishReason: FinishReason.STOP
                }
            };
        });

        streamingService = {
            createStream: mockCreateStream,
            setCallerId: jest.fn(),
            setUsageCallback: jest.fn(),
            getTokenCalculator: jest.fn(),
            getResponseProcessor: jest.fn()
        } as unknown as jest.Mocked<StreamingService>;

        // Mock the model manager
        jest.spyOn(modelManager, 'getModel').mockImplementation((modelName: string) => {
            if (modelName === 'test-model') {
                return mockModelInfo;
            } else if (modelName === 'test-model-no-json') {
                return mockModelInfoNoJson;
            } else {
                return mockModelInfoNoCapabilities;
            }
        });

        llmCaller = new LLMCaller({
            model: 'test-model',
            modelManager,
            responseProcessor,
            chatController,
            streamingService
        });
    });

    describe('call method', () => {
        it('should use native JSON mode when model supports it', async () => {
            const messages: UniversalMessage[] = [
                { role: 'user', content: 'Hello' }
            ];
            const jsonSchema = {
                name: 'test',
                schema: '{"type":"object","properties":{"message":{"type":"string"}}}'
            };

            await llmCaller.call(messages, { jsonSchema });

            expect(chatController.execute).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: expect.any(Array),
                    responseFormat: 'json'
                })
            );
        });

        it('should use prompt injection when model does not support JSON mode', async () => {
            const messages: UniversalMessage[] = [
                { role: 'user', content: 'Hello' }
            ];
            const jsonSchema = {
                name: 'test',
                schema: '{"type":"object","properties":{"message":{"type":"string"}}}'
            };

            const mockResponse: UniversalChatResponse = {
                content: '{"message": "Hello there!"}',
                role: 'assistant',
                metadata: {
                    finishReason: FinishReason.STOP
                }
            };

            // Create a new LLMCaller with the model that doesn't support JSON mode
            const noJsonModeLLMCaller = new LLMCaller({
                model: 'test-model-no-json',
                modelManager,
                responseProcessor,
                chatController,
                streamingService
            });

            (chatController.execute as jest.Mock).mockResolvedValueOnce(mockResponse);

            await noJsonModeLLMCaller.call(messages, { jsonSchema });

            expect(chatController.execute).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: expect.any(Array),
                    responseFormat: 'text'
                })
            );
        });

        it('should use normal text flow when no JSON is requested', async () => {
            const messages: UniversalMessage[] = [
                { role: 'user', content: 'Hello' }
            ];

            const mockResponse: UniversalChatResponse = {
                content: 'Hello there!',
                role: 'assistant',
                metadata: {
                    finishReason: FinishReason.STOP
                }
            };

            (chatController.execute as jest.Mock).mockResolvedValueOnce(mockResponse);

            await llmCaller.call(messages, { responseFormat: 'text' });

            expect(chatController.execute).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: expect.any(Array),
                    responseFormat: 'text'
                })
            );
        });
    });

    describe('stream method', () => {
        it('should use native JSON mode for streaming when model supports it', async () => {
            // Reset the mocks to ensure clean state
            jest.clearAllMocks();

            const messages: UniversalMessage[] = [
                { role: 'user', content: 'Hello' }
            ];
            const jsonSchema = {
                name: 'test',
                schema: '{"type":"object","properties":{"message":{"type":"string"}}}'
            };

            await llmCaller.stream(messages, { jsonSchema });

            expect(streamingService.createStream).toHaveBeenCalled();
            const callArgs = streamingService.createStream.mock.calls[0];
            expect(callArgs[0].responseFormat).toBe('json');
            expect(callArgs[1]).toBe('test-model');
        });

        it('should use prompt injection for streaming when model does not support JSON mode', async () => {
            // Reset the mocks to ensure clean state
            jest.clearAllMocks();

            const messages: UniversalMessage[] = [
                { role: 'user', content: 'Hello' }
            ];
            const jsonSchema = {
                name: 'test',
                schema: '{"type":"object","properties":{"message":{"type":"string"}}}'
            };

            // Create a new LLMCaller with the model that doesn't support JSON mode
            const noJsonModeLLMCaller = new LLMCaller({
                model: 'test-model-no-json',
                modelManager,
                responseProcessor,
                chatController,
                streamingService
            });

            await noJsonModeLLMCaller.stream(messages, { jsonSchema });

            expect(streamingService.createStream).toHaveBeenCalled();
            const callArgs = streamingService.createStream.mock.calls[0];
            expect(callArgs[0].responseFormat).toBe('text');
            expect(callArgs[1]).toBe('test-model-no-json');
        });
    });
}); 