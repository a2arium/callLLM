import type { ModelInfo } from '../../interfaces/UniversalInterfaces.ts';

export const defaultModels: ModelInfo[] = [
    // ═══════════════════════════════════════════════════════════
    // Gemini 3 family
    // ═══════════════════════════════════════════════════════════

    // Gemini 3.1 Pro Preview - Advanced intelligence
    {
        name: 'gemini-3.1-pro-preview',
        inputPricePerMillion: 2.00,
        inputCachedPricePerMillion: 0.20,
        outputPricePerMillion: 12.00,
        imageInputPricePerMillion: 2.00,
        audioInputPricePerMillion: 2.00,
        maxRequestTokens: 1048576,
        maxResponseTokens: 65536,
        capabilities: {
            streaming: true,
            toolCalls: {
                nonStreaming: true,
                streamingMode: 'deltas',
                parallel: true,
            },
            parallelToolCalls: true,
            reasoning: true,
            audio: {
                transcribe: true,
                translate: true,
            },
            input: {
                text: true,
                image: true,
                audio: true,
            },
            output: {
                text: {
                    textOutputFormats: ['text', 'json'],
                    structuredOutputs: true,
                },
            },
        },
        characteristics: {
            qualityIndex: 95,
            outputSpeed: 1500,
            firstTokenLatency: 450,
        },
    },

    // Gemini 3 Flash Preview - Frontier-class performance
    {
        name: 'gemini-3-flash-preview',
        inputPricePerMillion: 0.50,
        inputCachedPricePerMillion: 0.05,
        outputPricePerMillion: 3.00,
        imageInputPricePerMillion: 0.50,
        audioInputPricePerMillion: 1.00,
        maxRequestTokens: 1048576,
        maxResponseTokens: 65536,
        capabilities: {
            streaming: true,
            toolCalls: {
                nonStreaming: true,
                streamingMode: 'deltas',
                parallel: true,
            },
            parallelToolCalls: true,
            reasoning: true,
            audio: {
                transcribe: true,
                translate: true,
            },
            input: {
                text: true,
                image: true,
                audio: true,
            },
            output: {
                text: {
                    textOutputFormats: ['text', 'json'],
                    structuredOutputs: true,
                },
            },
        },
        characteristics: {
            qualityIndex: 90,
            outputSpeed: 3500,
            firstTokenLatency: 230,
        },
    },

    // Gemini 3.1 Flash-Lite - Most cost-efficient
    {
        name: 'gemini-3.1-flash-lite',
        inputPricePerMillion: 0.25,
        inputCachedPricePerMillion: 0.025,
        outputPricePerMillion: 1.50,
        imageInputPricePerMillion: 0.25,
        audioInputPricePerMillion: 0.50,
        maxRequestTokens: 1048576,
        maxResponseTokens: 65536,
        capabilities: {
            streaming: true,
            toolCalls: {
                nonStreaming: true,
                streamingMode: 'deltas',
                parallel: true,
            },
            parallelToolCalls: true,
            reasoning: true,
            audio: {
                transcribe: true,
                translate: true,
            },
            input: {
                text: true,
                image: true,
                audio: true,
            },
            output: {
                text: {
                    textOutputFormats: ['text', 'json'],
                    structuredOutputs: true,
                },
            },
        },
        characteristics: {
            qualityIndex: 78,
            outputSpeed: 5000,
            firstTokenLatency: 160,
        },
    },

    // ═══════════════════════════════════════════════════════════
    // Gemini 2.5 family
    // ═══════════════════════════════════════════════════════════

    // Gemini 2.5 Flash - Best price-performance
    {
        name: 'gemini-2.5-flash',
        inputPricePerMillion: 0.30,
        inputCachedPricePerMillion: 0.03,
        outputPricePerMillion: 2.50,
        imageInputPricePerMillion: 0.30,
        audioInputPricePerMillion: 1.00,
        maxRequestTokens: 1048576,
        maxResponseTokens: 65536,
        capabilities: {
            streaming: true,
            toolCalls: {
                nonStreaming: true,
                streamingMode: 'deltas',
                parallel: true,
            },
            parallelToolCalls: true,
            reasoning: true,
            audio: {
                transcribe: true,
                translate: true,
            },
            input: {
                text: true,
                image: true,
                audio: true,
            },
            output: {
                text: {
                    textOutputFormats: ['text', 'json'],
                    structuredOutputs: true,
                },
            },
        },
        characteristics: {
            qualityIndex: 85,
            outputSpeed: 3200,
            firstTokenLatency: 250,
        },
    },

    // Gemini 2.5 Pro - Advanced model for complex tasks
    {
        name: 'gemini-2.5-pro',
        inputPricePerMillion: 1.25,
        inputCachedPricePerMillion: 0.125,
        outputPricePerMillion: 10.00,
        imageInputPricePerMillion: 1.25,
        audioInputPricePerMillion: 1.25,
        maxRequestTokens: 1048576,
        maxResponseTokens: 65536,
        capabilities: {
            streaming: true,
            toolCalls: {
                nonStreaming: true,
                streamingMode: 'deltas',
                parallel: true,
            },
            parallelToolCalls: true,
            reasoning: true,
            audio: {
                transcribe: true,
                translate: true,
            },
            input: {
                text: true,
                image: true,
                audio: true,
            },
            output: {
                text: {
                    textOutputFormats: ['text', 'json'],
                    structuredOutputs: true,
                },
            },
        },
        characteristics: {
            qualityIndex: 92,
            outputSpeed: 1600,
            firstTokenLatency: 400,
        },
    },

    // Gemini 2.5 Flash-Lite - Fastest and most budget-friendly
    {
        name: 'gemini-2.5-flash-lite',
        inputPricePerMillion: 0.10,
        inputCachedPricePerMillion: 0.01,
        outputPricePerMillion: 0.40,
        imageInputPricePerMillion: 0.10,
        audioInputPricePerMillion: 0.30,
        maxRequestTokens: 1048576,
        maxResponseTokens: 65536,
        capabilities: {
            streaming: true,
            toolCalls: {
                nonStreaming: true,
                streamingMode: 'deltas',
                parallel: true,
            },
            parallelToolCalls: true,
            reasoning: true,
            input: {
                text: true,
                image: true,
            },
            output: {
                text: {
                    textOutputFormats: ['text', 'json'],
                    structuredOutputs: true,
                },
            },
        },
        characteristics: {
            qualityIndex: 72,
            outputSpeed: 4500,
            firstTokenLatency: 180,
        },
    },

    // ═══════════════════════════════════════════════════════════
    // Image generation models (Nano Banana family)
    // ═══════════════════════════════════════════════════════════

    // Nano Banana 2 (Gemini 3.1 Flash Image) - High-efficiency image gen
    {
        name: 'gemini-3.1-flash-image-preview',
        inputPricePerMillion: 0.50,
        outputPricePerMillion: 3.00,
        imageOutputPricePerMillion: 60.00,
        maxRequestTokens: 131072,
        maxResponseTokens: 32768,
        capabilities: {
            streaming: false,
            reasoning: true,
            input: {
                text: true,
                image: true,
            },
            output: {
                text: {
                    textOutputFormats: ['text'],
                },
                image: {
                    generate: true,
                    edit: true,
                },
            },
        },
        characteristics: {
            qualityIndex: 85,
            outputSpeed: 2000,
            firstTokenLatency: 800,
        },
    },

    // Nano Banana Pro (Gemini 3 Pro Image) - Studio-quality image gen
    {
        name: 'gemini-3-pro-image-preview',
        inputPricePerMillion: 2.00,
        outputPricePerMillion: 12.00,
        imageOutputPricePerMillion: 120.00,
        maxRequestTokens: 65536,
        maxResponseTokens: 32768,
        capabilities: {
            streaming: false,
            reasoning: true,
            input: {
                text: true,
                image: true,
            },
            output: {
                text: {
                    textOutputFormats: ['text'],
                    structuredOutputs: true,
                },
                image: {
                    generate: true,
                    edit: true,
                },
            },
        },
        characteristics: {
            qualityIndex: 95,
            outputSpeed: 800,
            firstTokenLatency: 1200,
        },
    },

    // Nano Banana (Gemini 2.5 Flash Image) - Fast creative workflows
    {
        name: 'gemini-2.5-flash-image',
        inputPricePerMillion: 0.30,
        outputPricePerMillion: 2.50,
        imageOutputPricePerMillion: 30.00,
        maxRequestTokens: 65536,
        maxResponseTokens: 32768,
        capabilities: {
            streaming: false,
            input: {
                text: true,
                image: true,
            },
            output: {
                text: {
                    textOutputFormats: ['text'],
                    structuredOutputs: true,
                },
                image: {
                    generate: true,
                    edit: true,
                },
            },
        },
        characteristics: {
            qualityIndex: 82,
            outputSpeed: 3000,
            firstTokenLatency: 600,
        },
    },

    // ═══════════════════════════════════════════════════════════
    // TTS (Text-to-Speech) models
    // ═══════════════════════════════════════════════════════════

    // Gemini 2.5 Flash TTS - Fast controllable speech
    {
        name: 'gemini-2.5-flash-preview-tts',
        inputPricePerMillion: 0.50,
        outputPricePerMillion: 10.00,
        maxRequestTokens: 8192,
        maxResponseTokens: 16384,
        capabilities: {
            streaming: false,
            audio: {
                synthesize: true,
                supportedOutputFormats: ['pcm', 'wav'],
            },
            input: {
                text: true,
            },
            output: {
                text: false,
                audio: true,
            },
        },
        characteristics: {
            qualityIndex: 80,
            outputSpeed: 5000,
            firstTokenLatency: 200,
        },
    },

    // Gemini 2.5 Pro TTS - High-fidelity speech
    {
        name: 'gemini-2.5-pro-preview-tts',
        inputPricePerMillion: 1.00,
        outputPricePerMillion: 20.00,
        maxRequestTokens: 8192,
        maxResponseTokens: 16384,
        capabilities: {
            streaming: false,
            audio: {
                synthesize: true,
                supportedOutputFormats: ['pcm', 'wav'],
            },
            input: {
                text: true,
            },
            output: {
                text: false,
                audio: true,
            },
        },
        characteristics: {
            qualityIndex: 90,
            outputSpeed: 3000,
            firstTokenLatency: 400,
        },
    },

    // Gemini 3.1 Flash TTS - Low-latency speech generation
    {
        name: 'gemini-3.1-flash-tts-preview',
        inputPricePerMillion: 1.00,
        outputPricePerMillion: 20.00,
        maxRequestTokens: 8192,
        maxResponseTokens: 16384,
        capabilities: {
            streaming: false,
            audio: {
                synthesize: true,
                supportedOutputFormats: ['pcm', 'wav'],
            },
            input: {
                text: true,
            },
            output: {
                text: false,
                audio: true,
            },
        },
        characteristics: {
            qualityIndex: 85,
            outputSpeed: 4000,
            firstTokenLatency: 250,
        },
    },

    // ═══════════════════════════════════════════════════════════
    // Embedding models
    // ═══════════════════════════════════════════════════════════

    // Gemini Embedding - Text-only embeddings
    {
        name: 'gemini-embedding-001',
        inputPricePerMillion: 0.15,
        outputPricePerMillion: 0,
        maxRequestTokens: 2048,
        maxResponseTokens: 0,
        capabilities: {
            streaming: false,
            embeddings: {
                dimensions: [128, 256, 512, 768, 1024, 1536, 2048, 3072],
                defaultDimensions: 3072,
                encodingFormats: ['float'],
            },
            input: {
                text: true,
            },
            output: {
                text: false,
            },
        },
        characteristics: {
            qualityIndex: 80,
            outputSpeed: 10000,
            firstTokenLatency: 50,
        },
    },

    // Gemini Embedding 2 - Multimodal embeddings
    {
        name: 'gemini-embedding-2',
        inputPricePerMillion: 0.20,
        outputPricePerMillion: 0,
        maxRequestTokens: 8192,
        maxResponseTokens: 0,
        capabilities: {
            streaming: false,
            embeddings: {
                dimensions: [128, 256, 512, 768, 1024, 1536, 2048, 3072],
                defaultDimensions: 3072,
                encodingFormats: ['float'],
            },
            input: {
                text: true,
                image: true,
                audio: true,
            },
            output: {
                text: false,
            },
        },
        characteristics: {
            qualityIndex: 85,
            outputSpeed: 8000,
            firstTokenLatency: 80,
        },
    },

    // ═══════════════════════════════════════════════════════════
    // Video generation models (Veo family)
    // ═══════════════════════════════════════════════════════════

    // Veo 3.1 - Cinematic video generation
    {
        name: 'veo-3.1-generate-preview',
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        maxRequestTokens: 0,
        maxResponseTokens: 0,
        capabilities: {
            streaming: false,
            input: {
                text: true,
                image: true,
            },
            output: {
                text: false,
                video: {
                    sizes: ['1280x720', '720x1280'],
                    maxSeconds: 8,
                    variants: ['video'],
                },
            },
        },
        characteristics: {
            qualityIndex: 95,
            outputSpeed: 0,
            firstTokenLatency: 0,
        },
    },

    // Veo 3.1 Fast - Faster video generation
    {
        name: 'veo-3.1-fast-generate-preview',
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        maxRequestTokens: 0,
        maxResponseTokens: 0,
        capabilities: {
            streaming: false,
            input: {
                text: true,
                image: true,
            },
            output: {
                text: false,
                video: {
                    sizes: ['1280x720', '720x1280'],
                    maxSeconds: 8,
                    variants: ['video'],
                },
            },
        },
        characteristics: {
            qualityIndex: 80,
            outputSpeed: 0,
            firstTokenLatency: 0,
        },
    },

    // Veo 3.1 Lite - Budget video generation
    {
        name: 'veo-3.1-lite-generate-preview',
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        maxRequestTokens: 0,
        maxResponseTokens: 0,
        capabilities: {
            streaming: false,
            input: {
                text: true,
                image: true,
            },
            output: {
                text: false,
                video: {
                    sizes: ['1280x720', '720x1280'],
                    maxSeconds: 8,
                    variants: ['video'],
                },
            },
        },
        characteristics: {
            qualityIndex: 70,
            outputSpeed: 0,
            firstTokenLatency: 0,
        },
    },
];
