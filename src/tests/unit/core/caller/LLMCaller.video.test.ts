import { jest } from '@jest/globals';
import { LLMCaller } from '../../../../core/caller/LLMCaller.ts';
import { ProviderManager } from '../../../../core/caller/ProviderManager.ts';
import { CapabilityError } from '../../../../core/models/CapabilityError.ts';
import type {
    UniversalChatResponse,
    ModelCapabilities,
    Usage
} from '../../../../interfaces/UniversalInterfaces.ts';
import type { VideoCallParams } from '../../../../interfaces/LLMProvider.ts';

// Variables for mocked modules
let ModelManager: any;
let mockModelManager: any;
let mockTelemetryCollector: any;

// Mock ModelManager
jest.unstable_mockModule('@/core/models/ModelManager.ts', () => {
    const mockSora2Model = {
        name: 'sora-2',
        provider: 'openai',
        type: 'video',
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        outputPricePerSecond: 0.10,
        maxRequestTokens: 0,
        maxResponseTokens: 0,
        contextWindow: 0,
        characteristics: {
            qualityIndex: 85,
            outputSpeed: 5,
            firstTokenLatency: 0
        },
        capabilities: {
            streaming: false,
            toolCalls: false,
            parallelToolCalls: false,
            batchProcessing: false,
            reasoning: false,
            input: {
                text: true,
                image: true
            },
            output: {
                text: false,
                audio: true,
                video: {
                    sizes: ['1280x720', '720x1280'],
                    maxSeconds: 60,
                    variants: ['video', 'thumbnail', 'spritesheet']
                }
            }
        }
    };

    const mockSora2ProModel = {
        ...mockSora2Model,
        name: 'sora-2-pro',
        outputPricePerSecond: 0.30,
        characteristics: {
            qualityIndex: 95,
            outputSpeed: 3,
            firstTokenLatency: 0
        }
    };

    const mockGetModel = jest.fn().mockImplementation((modelName) => {
        if (modelName === 'sora-2') return mockSora2Model;
        if (modelName === 'sora-2-pro') return mockSora2ProModel;
        return null;
    });

    return {
        __esModule: true,
        ModelManager: jest.fn().mockImplementation(() => ({
            getModel: mockGetModel,
            getAvailableModels: jest.fn().mockReturnValue([mockSora2Model, mockSora2ProModel])
        })),
        getCapabilities: jest.fn().mockImplementation((modelName) => {
            if (modelName === 'sora-2' || modelName === 'sora-2-pro') {
                return mockSora2Model.capabilities;
            }
            return null;
        })
    };
});

// Mock HistoryManager
jest.unstable_mockModule('@/core/history/HistoryManager.ts', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
        addMessage: jest.fn(),
        getMessages: jest.fn().mockReturnValue([]),
        getMessageHistory: jest.fn().mockReturnValue([]),
        getSystemMessage: jest.fn().mockReturnValue('You are a helpful assistant.'),
        initializeWithSystemMessage: jest.fn()
    }))
}));

// Mock TelemetryCollector
jest.unstable_mockModule('@/core/telemetry/collector/TelemetryCollector.ts', () => ({
    __esModule: true,
    TelemetryCollector: jest.fn().mockImplementation(() => {
        const mockConversationCtx = {
            conversationId: 'test-conv-123',
            startedAt: Date.now()
        };
        const mockLLMCtx = {
            llmCallId: 'test-llm-456',
            conversationId: 'test-conv-123',
            startedAt: Date.now(),
            provider: 'openai',
            model: 'sora-2',
            streaming: false
        };

        return {
            startConversation: jest.fn().mockReturnValue(mockConversationCtx),
            startLLM: jest.fn().mockReturnValue(mockLLMCtx),
            addPrompt: jest.fn(),
            addChoice: jest.fn(),
            endLLM: jest.fn(),
            endConversation: jest.fn().mockResolvedValue(undefined),
            awaitReady: jest.fn().mockResolvedValue(undefined)
        };
    })
}));

describe('LLMCaller - Video Generation', () => {
    let caller: LLMCaller;
    let mockProvider: any;
    let mockProviderManager: any;
    let originalEnv: NodeJS.ProcessEnv;

    beforeAll(async () => {
        // Save original env
        originalEnv = { ...process.env };

        // Set dummy API keys for tests
        process.env.OPENAI_API_KEY = 'test-openai-key';
        process.env.CEREBRAS_API_KEY = 'test-cerebras-key';

        // Import ModelManager after mocking
        const mm = await import('@/core/models/ModelManager.ts');
        ModelManager = mm.ModelManager;
        mockModelManager = new ModelManager();
    });

    afterAll(() => {
        // Restore original env
        process.env = originalEnv;
    });

    beforeEach(() => {
        // Create mock provider with video support
        mockProvider = {
            chatCall: jest.fn(),
            streamCall: jest.fn(),
            videoCall: jest.fn().mockResolvedValue({
                content: null,
                role: 'assistant',
                metadata: {
                    model: 'sora-2',
                    videoJobId: 'video_test_123',
                    videoStatus: 'completed',
                    videoProgress: 1.0,
                    videoSavedPath: '/output/video.mp4',
                    usage: {
                        tokens: {
                            input: { total: 0, cached: 0 },
                            output: { total: 0, reasoning: 0, videoSeconds: 4 },
                            total: 0
                        },
                        costs: {
                            input: { total: 0, cached: 0 },
                            output: { total: 0.4, reasoning: 0, video: 0.4 },
                            total: 0.4
                        }
                    }
                }
            }),
            retrieveVideo: jest.fn().mockResolvedValue({
                id: 'video_test_123',
                status: 'completed',
                progress: 1.0
            }),
            downloadVideo: jest.fn().mockResolvedValue(undefined),
            convertResponseToFormat: jest.fn().mockImplementation((response) => response)
        };

        // Create mock ProviderManager
        mockProviderManager = {
            getProvider: jest.fn().mockReturnValue(mockProvider),
            getCurrentProviderName: jest.fn().mockReturnValue('openai'),
            supportsVideoGeneration: jest.fn().mockReturnValue(true),
            getVideoProvider: jest.fn().mockReturnValue(mockProvider),
            callVideoOperation: jest.fn().mockImplementation((model, params) => {
                return mockProvider.videoCall(model, params);
            })
        };

        // Create LLMCaller with mock provider manager
        caller = new LLMCaller('openai', 'sora-2', 'You are a helpful assistant.');
        (caller as any).providerManager = mockProviderManager;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Video generation routing', () => {
        test('should route to videoCall when output.video is specified', async () => {
            const response = await caller.call({
                text: 'A serene mountain landscape',
                output: {
                    video: {
                        size: '1280x720',
                        seconds: 4,
                        wait: 'poll'
                    }
                },
                outputPath: '/output/video.mp4'
            });

            expect(mockProvider.videoCall).toHaveBeenCalledWith('sora-2', {
                prompt: 'A serene mountain landscape',
                image: undefined,
                size: '1280x720',
                seconds: 4,
                wait: 'poll',
                variant: undefined,
                outputPath: '/output/video.mp4'
            });

            expect(response).toHaveLength(1);
            expect(response[0].metadata?.videoJobId).toBe('video_test_123');
            expect(response[0].metadata?.videoStatus).toBe('completed');
            expect(response[0].metadata?.videoSavedPath).toBe('/output/video.mp4');
        });

        test('should pass image input for video generation', async () => {
            await caller.call({
                text: 'Transform this into a flowing river',
                file: '/path/to/landscape.jpg',
                output: {
                    video: {
                        size: '720x1280',
                        seconds: 8,
                        wait: 'none'
                    }
                }
            });

            expect(mockProvider.videoCall).toHaveBeenCalledWith('sora-2', expect.objectContaining({
                prompt: 'Transform this into a flowing river',
                image: '/path/to/landscape.jpg',
                size: '720x1280',
                seconds: 8,
                wait: 'none'
            }));
        });

        test('should use first file from files array if file not specified', async () => {
            await caller.call({
                text: 'Create a video',
                files: ['/path/to/image1.jpg', '/path/to/image2.jpg'],
                output: {
                    video: {
                        seconds: 4
                    }
                }
            });

            expect(mockProvider.videoCall).toHaveBeenCalledWith('sora-2', expect.objectContaining({
                image: '/path/to/image1.jpg'
            }));
        });

        test('should default to wait: none if not specified', async () => {
            await caller.call({
                text: 'Generate video',
                output: {
                    video: {
                        seconds: 4
                    }
                }
            });

            expect(mockProvider.videoCall).toHaveBeenCalledWith('sora-2', expect.objectContaining({
                wait: 'none'
            }));
        });

        test('should pass variant parameter when specified', async () => {
            await caller.call({
                text: 'Generate video',
                output: {
                    video: {
                        seconds: 4,
                        wait: 'poll',
                        variant: 'thumbnail'
                    }
                },
                outputPath: '/output/thumb.jpg'
            });

            expect(mockProvider.videoCall).toHaveBeenCalledWith('sora-2', expect.objectContaining({
                variant: 'thumbnail',
                outputPath: '/output/thumb.jpg'
            }));
        });
    });

    describe('Usage tracking', () => {
        test('should trigger usage callback with video costs', async () => {
            const usageCallback = jest.fn();
            const testCaller = new LLMCaller('openai', 'sora-2', 'Assistant', {
                callerId: 'test-caller-1',
                usageCallback
            });
            (testCaller as any).providerManager = mockProviderManager;

            await testCaller.call({
                text: 'Generate video',
                output: {
                    video: {
                        seconds: 4,
                        wait: 'poll'
                    }
                },
                outputPath: '/output/video.mp4'
            });

            expect(usageCallback).toHaveBeenCalledWith({
                callerId: 'test-caller-1',
                usage: expect.objectContaining({
                    tokens: expect.objectContaining({
                        output: expect.objectContaining({
                            videoSeconds: 4
                        })
                    }),
                    costs: expect.objectContaining({
                        output: expect.objectContaining({
                            video: 0.4
                        }),
                        total: 0.4
                    })
                }),
                timestamp: expect.any(Number)
            });
        });

        test('should handle usage callback errors gracefully', async () => {
            const usageCallback = jest.fn().mockRejectedValue(new Error('Callback error'));
            const testCaller = new LLMCaller('openai', 'sora-2', 'Assistant', {
                callerId: 'test-caller-2',
                usageCallback
            });
            (testCaller as any).providerManager = mockProviderManager;

            // Should not throw even if callback fails
            await expect(testCaller.call({
                text: 'Generate video',
                output: {
                    video: { seconds: 4 }
                }
            })).resolves.not.toThrow();

            expect(usageCallback).toHaveBeenCalled();
        });
    });

    describe('Telemetry integration', () => {
        test('should create telemetry spans for video generation', async () => {
            // Create a mock collector with all required jest.fn() methods
            const mockConversationCtx = {
                conversationId: 'test-conv-123',
                startedAt: Date.now()
            };
            const mockLLMCtx = {
                llmCallId: 'test-llm-456',
                conversationId: 'test-conv-123',
                startedAt: Date.now(),
                provider: 'openai',
                model: 'sora-2',
                streaming: false
            };

            const mockCollector = {
                startConversation: jest.fn().mockReturnValue(mockConversationCtx),
                startLLM: jest.fn().mockReturnValue(mockLLMCtx),
                addPrompt: jest.fn(),
                addChoice: jest.fn(),
                endLLM: jest.fn(),
                endConversation: jest.fn().mockResolvedValue(undefined),
                awaitReady: jest.fn().mockResolvedValue(undefined)
            };

            const testCaller = new LLMCaller('openai', 'sora-2', 'Assistant', {
                callerId: 'test-video-caller'
            });
            (testCaller as any).providerManager = mockProviderManager;
            (testCaller as any).telemetryCollector = mockCollector;

            await testCaller.call({
                text: 'Generate a video',
                output: {
                    video: {
                        seconds: 4,
                        wait: 'poll'
                    }
                },
                outputPath: '/output/video.mp4'
            });

            expect(mockCollector.startConversation).toHaveBeenCalledWith('call', {
                callerId: 'test-video-caller',
                hasTools: false
            });

            expect(mockCollector.startLLM).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    provider: 'openai',
                    model: 'sora-2',
                    streaming: false,
                    toolsEnabled: false
                })
            );

            expect(mockCollector.addPrompt).toHaveBeenCalledWith(
                expect.any(Object),
                expect.arrayContaining([
                    expect.objectContaining({
                        role: 'user',
                        content: 'Generate a video',
                        sequence: 1
                    })
                ])
            );

            expect(mockCollector.addChoice).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    index: 0,
                    finishReason: 'stop',
                    content: expect.stringContaining('Video generated successfully'),
                    contentLength: 0,
                    toolCalls: []
                })
            );

            expect(mockCollector.endLLM).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    costs: expect.objectContaining({
                        output: expect.objectContaining({
                            video: 0.4
                        })
                    })
                })
            );

            expect(mockCollector.endConversation).toHaveBeenCalled();
        });

        test('should include error information in telemetry for failed videos', async () => {
            // Create a new mock provider manager for this test with failed response
            const failedMockProvider = {
                ...mockProvider,
                videoCall: jest.fn().mockResolvedValueOnce({
                    content: null,
                    role: 'assistant',
                    metadata: {
                        model: 'sora-2',
                        videoJobId: 'video_fail_123',
                        videoStatus: 'failed',
                        videoProgress: 0.8,
                        videoError: 'Content policy violation',
                        usage: {
                            tokens: {
                                input: { total: 0, cached: 0 },
                                output: { total: 0, reasoning: 0, videoSeconds: 3.2 },
                                total: 0
                            },
                            costs: {
                                input: { total: 0, cached: 0 },
                                output: { total: 0.32, reasoning: 0, video: 0.32 },
                                total: 0.32
                            }
                        }
                    }
                })
            };

            const failedMockProviderManager = {
                getProvider: jest.fn().mockReturnValue(failedMockProvider),
                getCurrentProviderName: jest.fn().mockReturnValue('openai'),
                supportsVideoGeneration: jest.fn().mockReturnValue(true),
                getVideoProvider: jest.fn().mockReturnValue(failedMockProvider),
                callVideoOperation: jest.fn().mockImplementation((model, params) => {
                    return failedMockProvider.videoCall(model, params);
                })
            };

            // Create a mock collector for failed video test
            const mockConversationCtx2 = {
                conversationId: 'test-conv-456',
                startedAt: Date.now()
            };
            const mockLLMCtx2 = {
                llmCallId: 'test-llm-789',
                conversationId: 'test-conv-456',
                startedAt: Date.now(),
                provider: 'openai',
                model: 'sora-2',
                streaming: false
            };

            const mockCollector2 = {
                startConversation: jest.fn().mockReturnValue(mockConversationCtx2),
                startLLM: jest.fn().mockReturnValue(mockLLMCtx2),
                addPrompt: jest.fn(),
                addChoice: jest.fn(),
                endLLM: jest.fn(),
                endConversation: jest.fn().mockResolvedValue(undefined),
                awaitReady: jest.fn().mockResolvedValue(undefined)
            };

            const testCaller = new LLMCaller('openai', 'sora-2', 'Assistant');
            (testCaller as any).providerManager = failedMockProviderManager;
            (testCaller as any).telemetryCollector = mockCollector2;

            await testCaller.call({
                text: 'Generate problematic video',
                output: {
                    video: {
                        seconds: 4,
                        wait: 'poll'
                    }
                }
            });

            expect(mockCollector2.addChoice).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    finishReason: 'error',
                    content: expect.stringContaining('Video generation failed')
                })
            );

            expect(mockCollector2.addChoice).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    content: expect.stringContaining('Content policy violation')
                })
            );
        });
    });

    describe('Helper methods', () => {
        test('retrieveVideo should call provider method', async () => {
            const status = await caller.retrieveVideo('video_123');

            expect(mockProvider.retrieveVideo).toHaveBeenCalledWith('video_123');
            expect(status.id).toBe('video_test_123');
            expect(status.status).toBe('completed');
        });

        test('downloadVideo should call provider method with options', async () => {
            // Mock the provider's downloadVideo to return ArrayBuffer
            mockProvider.downloadVideo = jest.fn().mockResolvedValue(new ArrayBuffer(1024));

            // The test verifies the method exists and can be called
            await caller.downloadVideo('video_456', {
                variant: 'video',
                outputPath: './test-output.mp4'
            });

            // Verify video provider was accessed
            expect(mockProviderManager.getVideoProvider).toHaveBeenCalled();
        });

        test('retrieveVideo should throw if provider does not support video', async () => {
            // Create caller with provider that doesn't support video
            const nonVideoProvider = {
                chatCall: jest.fn(),
                streamCall: jest.fn()
            };
            const nonVideoManager = {
                getProvider: jest.fn().mockReturnValue(nonVideoProvider),
                getCurrentProviderName: jest.fn().mockReturnValue('cerebras'),
                supportsVideoGeneration: jest.fn().mockReturnValue(false),
                getVideoProvider: jest.fn().mockReturnValue(null)
            };
            const testCaller = new LLMCaller('cerebras', 'llama-3.3-70b', 'Assistant');
            (testCaller as any).providerManager = nonVideoManager;

            await expect(testCaller.retrieveVideo('video_123')).rejects.toThrow(
                'does not support video generation'
            );
        });

        test('downloadVideo should throw if provider does not support video', async () => {
            const nonVideoProvider = {
                chatCall: jest.fn(),
                streamCall: jest.fn()
            };
            const nonVideoManager = {
                getProvider: jest.fn().mockReturnValue(nonVideoProvider),
                getCurrentProviderName: jest.fn().mockReturnValue('cerebras'),
                supportsVideoGeneration: jest.fn().mockReturnValue(false),
                getVideoProvider: jest.fn().mockReturnValue(null)
            };
            const testCaller = new LLMCaller('cerebras', 'llama-3.3-70b', 'Assistant');
            (testCaller as any).providerManager = nonVideoManager;

            await expect(testCaller.downloadVideo('video_123', {
                outputPath: '/output/video.mp4'
            })).rejects.toThrow('does not support video generation');
        });
    });

    describe('Model selection', () => {
        test('should use specified model from settings', async () => {
            await caller.call({
                text: 'Generate video',
                output: {
                    video: { seconds: 4 }
                },
                settings: {
                    providerOptions: {
                        model: 'sora-2-pro'
                    }
                }
            });

            expect(mockProvider.videoCall).toHaveBeenCalledWith('sora-2-pro', expect.any(Object));
        });

        test('should use default model if not specified in settings', async () => {
            await caller.call({
                text: 'Generate video',
                output: {
                    video: { seconds: 4 }
                }
            });

            expect(mockProvider.videoCall).toHaveBeenCalledWith('sora-2', expect.any(Object));
        });
    });
});

