import { OpenAI } from 'openai';
import { OpenAIAdapter } from '../../../../adapters/openai/adapter';
import { Converter } from '../../../../adapters/openai/converter';
import { StreamHandler } from '../../../../adapters/openai/stream';
import { Validator } from '../../../../adapters/openai/validator';
import { FinishReason } from '../../../../interfaces/UniversalInterfaces';
import type { UniversalChatParams } from '../../../../interfaces/UniversalInterfaces';
import type { OpenAIModelParams } from '../../../../adapters/openai/types';

// Mock dependencies
jest.mock('openai');
jest.mock('../../../../adapters/openai/converter');
jest.mock('../../../../adapters/openai/stream');
jest.mock('../../../../adapters/openai/validator');

describe('OpenAIAdapter', () => {
    const mockApiKey = 'test-api-key';
    const mockOrg = 'test-org';
    const mockBaseUrl = 'https://test.openai.com';
    const mockModel = 'gpt-4';
    const mockParams: UniversalChatParams = {
        messages: [{ role: 'user', content: 'test' }]
    };

    let mockOpenAIClient: jest.MockedObject<OpenAI>;
    let mockConverter: jest.Mocked<Converter>;
    let mockStreamHandler: jest.Mocked<StreamHandler>;
    let mockValidator: jest.Mocked<Validator>;
    let adapter: OpenAIAdapter;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Setup OpenAI client mock
        const mockCreate = jest.fn();
        mockOpenAIClient = {
            chat: {
                completions: {
                    create: mockCreate
                }
            }
        } as unknown as jest.MockedObject<OpenAI>;
        (OpenAI as unknown as jest.Mock).mockImplementation(() => mockOpenAIClient);

        // Setup other mocks
        mockConverter = {
            convertToProviderParams: jest.fn(),
            convertFromProviderResponse: jest.fn(),
            convertStreamResponse: jest.fn(),
            setModel: jest.fn(),
            setParams: jest.fn(),
            getCurrentParams: jest.fn()
        } as unknown as jest.Mocked<Converter>;
        (Converter as jest.Mock).mockImplementation(() => mockConverter);

        mockStreamHandler = {
            handleStream: jest.fn()
        } as unknown as jest.Mocked<StreamHandler>;
        (StreamHandler as jest.Mock).mockImplementation(() => mockStreamHandler);

        mockValidator = {
            validateParams: jest.fn()
        } as unknown as jest.Mocked<Validator>;
        (Validator as jest.Mock).mockImplementation(() => mockValidator);

        // Mock implementations
        mockConverter.convertToProviderParams.mockReturnValue({
            model: mockModel,
            messages: [{ role: 'user', content: 'test' }]
        } as unknown as OpenAIModelParams);
        mockConverter.convertFromProviderResponse.mockReturnValue({
            content: 'test response',
            role: 'assistant',
            metadata: {
                finishReason: FinishReason.STOP,
                responseFormat: 'text'
            }
        });
        mockConverter.getCurrentParams.mockReturnValue(mockParams);
        mockConverter.convertStreamResponse.mockReturnValue({
            content: 'test stream',
            role: 'assistant',
            isComplete: true,
            metadata: {
                finishReason: FinishReason.STOP,
                responseFormat: 'text'
            }
        });
        mockStreamHandler.handleStream.mockImplementation(async function* () {
            yield {
                content: 'test stream',
                role: 'assistant',
                isComplete: true,
                metadata: {
                    finishReason: FinishReason.STOP,
                    responseFormat: 'text'
                }
            };
        });

        // Create adapter instance
        adapter = new OpenAIAdapter({ apiKey: mockApiKey });

        // Mock the models map
        (adapter as any).models = new Map([
            ['gpt-4', {
                name: 'gpt-4',
                inputPricePerMillion: 30,
                outputPricePerMillion: 60,
                maxRequestTokens: 8192,
                maxResponseTokens: 4096,
                characteristics: {
                    qualityIndex: 90,
                    outputSpeed: 100,
                    firstTokenLatency: 200
                }
            }]
        ]);
    });

    describe('constructor', () => {
        it('should create instance with API key from config', () => {
            const adapter = new OpenAIAdapter({ apiKey: mockApiKey });
            expect(adapter).toBeInstanceOf(OpenAIAdapter);
            expect(OpenAI).toHaveBeenCalledWith({
                apiKey: mockApiKey,
                organization: undefined,
                baseURL: undefined
            });
        });

        it('should create instance with full config', () => {
            const adapter = new OpenAIAdapter({
                apiKey: mockApiKey,
                organization: mockOrg,
                baseUrl: mockBaseUrl
            });
            expect(adapter).toBeInstanceOf(OpenAIAdapter);
            expect(OpenAI).toHaveBeenCalledWith({
                apiKey: mockApiKey,
                organization: mockOrg,
                baseURL: mockBaseUrl
            });
        });

        it('should throw error if API key is missing', () => {
            process.env.OPENAI_API_KEY = '';
            expect(() => new OpenAIAdapter()).toThrow('OpenAI API key is required');
        });
    });

    describe('chatCall', () => {
        let adapter: OpenAIAdapter;
        const mockModelInfo = {
            name: 'gpt-4',
            inputPricePerMillion: 30,
            outputPricePerMillion: 60,
            maxRequestTokens: 8192,
            maxResponseTokens: 4096,
            characteristics: {
                qualityIndex: 90,
                outputSpeed: 100,
                firstTokenLatency: 200
            }
        };

        beforeEach(() => {
            adapter = new OpenAIAdapter({ apiKey: mockApiKey });
            (mockOpenAIClient.chat.completions.create as jest.Mock).mockResolvedValue({
                choices: [{
                    message: { content: 'test response', role: 'assistant' },
                    finish_reason: 'stop'
                }]
            });

            // Mock the models map
            (adapter as any).models = new Map([
                ['gpt-4', mockModelInfo]
            ]);
        });

        it('should make successful chat call', async () => {
            const response = await adapter.chatCall(mockModel, mockParams);
            expect(mockValidator.validateParams).toHaveBeenCalledWith(mockParams);
            expect(mockConverter.setModel).toHaveBeenCalledWith(mockModelInfo);
            expect(mockConverter.setParams).toHaveBeenCalledWith(mockParams);
            expect(mockConverter.convertToProviderParams).toHaveBeenCalledWith({
                messages: [{ role: 'user', content: 'test' }],
                settings: {
                    stream: false
                }
            });
            expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalled();
            expect(mockConverter.convertFromProviderResponse).toHaveBeenCalled();
            expect(response).toEqual({
                content: 'test response',
                role: 'assistant',
                metadata: {
                    finishReason: FinishReason.STOP,
                    responseFormat: 'text'
                }
            });
        });

        it('should handle errors', async () => {
            (mockOpenAIClient.chat.completions.create as jest.Mock).mockRejectedValue(new Error('API error'));
            await expect(adapter.chatCall(mockModel, mockParams)).rejects.toThrow('API error');
        });

        it('should handle model info when available', async () => {
            await adapter.chatCall('gpt-4', mockParams);
            expect(mockConverter.setModel).toHaveBeenCalledWith(mockModelInfo);
            expect(mockConverter.setParams).toHaveBeenCalledWith(mockParams);
        });

        it('should work without model info', async () => {
            await adapter.chatCall('non-existent-model', mockParams);
            expect(mockConverter.setModel).not.toHaveBeenCalled();
            expect(mockConverter.setParams).toHaveBeenCalledWith(mockParams);
        });
    });

    describe('streamCall', () => {
        let adapter: OpenAIAdapter;

        beforeEach(() => {
            adapter = new OpenAIAdapter({ apiKey: mockApiKey });
            const mockStream = {
                async *[Symbol.asyncIterator]() {
                    yield {
                        choices: [{
                            delta: { content: 'test stream', role: 'assistant' },
                            finish_reason: 'stop'
                        }]
                    };
                }
            };
            (mockOpenAIClient.chat.completions.create as jest.Mock).mockResolvedValue(mockStream);

            // Mock the models map
            (adapter as any).models = new Map([
                ['gpt-4', {
                    name: 'gpt-4',
                    inputPricePerMillion: 30,
                    outputPricePerMillion: 60,
                    maxRequestTokens: 8192,
                    maxResponseTokens: 4096,
                    characteristics: {
                        qualityIndex: 90,
                        outputSpeed: 100,
                        firstTokenLatency: 200
                    }
                }]
            ]);
        });

        it('should make successful stream call', async () => {
            const stream = await adapter.streamCall(mockModel, mockParams);
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            expect(mockValidator.validateParams).toHaveBeenCalledWith(mockParams);
            expect(mockConverter.setParams).toHaveBeenCalledWith(mockParams);
            expect(mockConverter.convertToProviderParams).toHaveBeenCalledWith({
                messages: [{ role: 'user', content: 'test' }],
                settings: {
                    stream: true
                }
            });
            expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
                expect.objectContaining({ stream: true })
            );
            expect(mockStreamHandler.handleStream).toHaveBeenCalled();
            expect(chunks).toEqual([{
                content: 'test stream',
                role: 'assistant',
                isComplete: true,
                metadata: {
                    finishReason: FinishReason.STOP,
                    responseFormat: 'text'
                }
            }]);
        });

        it('should handle stream errors', async () => {
            (mockOpenAIClient.chat.completions.create as jest.Mock).mockRejectedValue(new Error('Stream error'));
            await expect(adapter.streamCall(mockModel, mockParams)).rejects.toThrow('Stream error');
        });

        it('should handle model info when available', async () => {
            await adapter.streamCall('gpt-4', mockParams);
            expect(mockConverter.setModel).toHaveBeenCalledWith({
                name: 'gpt-4',
                inputPricePerMillion: 30,
                outputPricePerMillion: 60,
                maxRequestTokens: 8192,
                maxResponseTokens: 4096,
                characteristics: {
                    qualityIndex: 90,
                    outputSpeed: 100,
                    firstTokenLatency: 200
                }
            });
            expect(mockConverter.setParams).toHaveBeenCalledWith(mockParams);
        });

        it('should work without model info', async () => {
            await adapter.streamCall('non-existent-model', mockParams);
            expect(mockConverter.setModel).not.toHaveBeenCalled();
            expect(mockConverter.setParams).toHaveBeenCalledWith(mockParams);
        });
    });

    describe('conversion methods', () => {
        let adapter: OpenAIAdapter;

        beforeEach(() => {
            adapter = new OpenAIAdapter({ apiKey: mockApiKey });
            mockConverter.convertStreamResponse.mockReturnValue({
                content: '',
                role: 'assistant',
                isComplete: true,
                metadata: {
                    finishReason: FinishReason.NULL,
                    responseFormat: 'text'
                }
            });
            mockConverter.getCurrentParams.mockReturnValue(mockParams);
        });

        it('should convert to provider params', () => {
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }]
            };
            const result = adapter.convertToProviderParams(mockModel, params);
            expect(mockConverter.convertToProviderParams).toHaveBeenCalledWith(params);
            expect(result).toEqual({
                model: mockModel,
                messages: [{ role: 'user', content: 'test' }]
            });
        });

        it('should convert from provider response', () => {
            const mockResponse = {
                choices: [{
                    message: { content: 'test', role: 'assistant' },
                    finish_reason: 'stop'
                }]
            };
            mockConverter.convertFromProviderResponse.mockReturnValue({
                content: 'test response',
                role: 'assistant'
            });
            const result = adapter.convertFromProviderResponse(mockResponse);
            expect(mockConverter.convertFromProviderResponse).toHaveBeenCalledWith(mockResponse);
            expect(result).toEqual({
                content: 'test response',
                role: 'assistant'
            });
        });

        it('should convert from provider stream response', () => {
            const mockStreamResponse = {
                choices: [{
                    delta: { content: 'test', role: 'assistant' },
                    finish_reason: 'stop'
                }]
            };
            mockConverter.convertStreamResponse.mockReturnValue({
                content: 'test',
                role: 'assistant',
                isComplete: true,
                metadata: {
                    finishReason: FinishReason.STOP,
                    responseFormat: 'text'
                }
            });
            const result = adapter.convertFromProviderStreamResponse(mockStreamResponse);
            expect(mockConverter.convertStreamResponse).toHaveBeenCalledWith(mockStreamResponse, mockParams);
            expect(result).toEqual({
                content: 'test',
                role: 'assistant',
                isComplete: true,
                metadata: {
                    finishReason: FinishReason.STOP,
                    responseFormat: 'text'
                }
            });
        });

        it('should handle empty stream response', () => {
            const mockStreamResponse = {
                choices: [{
                    delta: {},
                    finish_reason: null
                }]
            };
            mockConverter.convertStreamResponse.mockReturnValue({
                content: '',
                role: 'assistant',
                isComplete: false,
                metadata: {
                    finishReason: FinishReason.NULL,
                    responseFormat: 'text'
                }
            });
            const result = adapter.convertFromProviderStreamResponse(mockStreamResponse);
            expect(mockConverter.convertStreamResponse).toHaveBeenCalledWith(mockStreamResponse, mockParams);
            expect(result).toEqual({
                content: '',
                role: 'assistant',
                isComplete: false,
                metadata: {
                    finishReason: FinishReason.NULL,
                    responseFormat: 'text'
                }
            });
        });

        describe('convertFromProviderStreamResponse edge cases', () => {
            beforeEach(() => {
                adapter = new OpenAIAdapter({ apiKey: mockApiKey });
                mockConverter.convertStreamResponse.mockReturnValue({
                    content: '',
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: FinishReason.NULL,
                        responseFormat: 'text'
                    }
                });
                mockConverter.getCurrentParams.mockReturnValue(mockParams);
            });

            it('should handle missing delta in choice', () => {
                const mockStreamResponse = {
                    choices: [{ finish_reason: 'stop' }]
                };
                mockConverter.convertStreamResponse.mockReturnValue({
                    content: '',
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: FinishReason.STOP,
                        responseFormat: 'text'
                    }
                });
                const result = adapter.convertFromProviderStreamResponse(mockStreamResponse);
                expect(result).toEqual({
                    content: '',
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: FinishReason.STOP,
                        responseFormat: 'text'
                    }
                });
            });

            it('should handle undefined finish_reason', () => {
                const mockStreamResponse = {
                    choices: [{
                        delta: { content: 'test', role: 'assistant' },
                        finish_reason: undefined
                    }]
                };
                mockConverter.convertStreamResponse.mockReturnValue({
                    content: 'test',
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: FinishReason.NULL,
                        responseFormat: 'text'
                    }
                });
                const result = adapter.convertFromProviderStreamResponse(mockStreamResponse);
                expect(result).toEqual({
                    content: 'test',
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: FinishReason.NULL,
                        responseFormat: 'text'
                    }
                });
            });

            it('should handle missing content in delta', () => {
                const mockStreamResponse = {
                    choices: [{
                        delta: { role: 'assistant' },
                        finish_reason: null
                    }]
                };
                mockConverter.convertStreamResponse.mockReturnValue({
                    content: '',
                    role: 'assistant',
                    isComplete: false,
                    metadata: {
                        finishReason: FinishReason.NULL,
                        responseFormat: 'text'
                    }
                });
                const result = adapter.convertFromProviderStreamResponse(mockStreamResponse);
                expect(result).toEqual({
                    content: '',
                    role: 'assistant',
                    isComplete: false,
                    metadata: {
                        finishReason: FinishReason.NULL,
                        responseFormat: 'text'
                    }
                });
            });

            it('should handle missing role in delta', () => {
                const mockStreamResponse = {
                    choices: [{
                        delta: { content: 'test' },
                        finish_reason: null
                    }]
                };
                mockConverter.convertStreamResponse.mockReturnValue({
                    content: 'test',
                    role: 'assistant',
                    isComplete: false,
                    metadata: {
                        finishReason: FinishReason.NULL,
                        responseFormat: 'text'
                    }
                });
                const result = adapter.convertFromProviderStreamResponse(mockStreamResponse);
                expect(result).toEqual({
                    content: 'test',
                    role: 'assistant',
                    isComplete: false,
                    metadata: {
                        finishReason: FinishReason.NULL,
                        responseFormat: 'text'
                    }
                });
            });
        });

        describe('error handling', () => {
            let adapter: OpenAIAdapter;

            beforeEach(() => {
                adapter = new OpenAIAdapter({ apiKey: mockApiKey });
                // Mock converter to throw errors for invalid responses
                mockConverter.convertFromProviderResponse
                    .mockImplementation((response) => {
                        if (!response || !response.choices?.[0]?.message) {
                            throw new Error('Invalid response');
                        }
                        return {
                            content: 'test response',
                            role: 'assistant'
                        };
                    });
            });

            it('should handle null response in convertFromProviderResponse', () => {
                expect(() => adapter.convertFromProviderResponse(null)).toThrow('Invalid response');
            });

            it('should handle undefined response in convertFromProviderResponse', () => {
                expect(() => adapter.convertFromProviderResponse(undefined)).toThrow('Invalid response');
            });

            it('should handle malformed response in convertFromProviderResponse', () => {
                const malformedResponse = {
                    choices: [{ wrong_field: 'test' }]
                };
                expect(() => adapter.convertFromProviderResponse(malformedResponse)).toThrow('Invalid response');
            });

            it('should handle null response in convertFromProviderStreamResponse', () => {
                const mockStreamResponse = { choices: [{}] };
                const result = adapter.convertFromProviderStreamResponse(mockStreamResponse);
                expect(result).toEqual({
                    content: '',
                    role: 'assistant',
                    isComplete: true,
                    metadata: {
                        finishReason: FinishReason.NULL,
                        responseFormat: 'text'
                    }
                });
            });
        });
    });
}); 