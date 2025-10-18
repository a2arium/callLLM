import type { ModelInfo } from '../../interfaces/UniversalInterfaces.ts';

export const defaultModels: ModelInfo[] = [
    // GPT-5 family
    {
        name: 'gpt-5',
        maxRequestTokens: 400000,
        maxResponseTokens: 128000,
        inputPricePerMillion: 1.25,
        inputCachedPricePerMillion: 0.125,
        outputPricePerMillion: 10.0,
        capabilities: {
            streaming: true,
            toolCalls: true,
            parallelToolCalls: true,
            reasoning: true,
            input: {
                text: true,
                image: true
            },
            output: {
                text: {
                    textOutputFormats: ['text', 'json']
                }
            }
        },
        characteristics: {
            qualityIndex: 69,
            outputSpeed: 126.3,
            firstTokenLatency: 74150,
        },
    },
    // Sora 2 models
    {
        name: 'sora-2',
        maxRequestTokens: 0,
        maxResponseTokens: 0,
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        outputPricePerSecond: 0.10,
        capabilities: {
            streaming: false,
            toolCalls: false,
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
        },
        characteristics: {
            qualityIndex: 0,
            outputSpeed: 0,
            firstTokenLatency: 0,
        },
    },
    {
        name: 'sora-2-pro',
        maxRequestTokens: 0,
        maxResponseTokens: 0,
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        outputPricePerSecond: 0.30,
        capabilities: {
            streaming: false,
            toolCalls: false,
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
        },
        characteristics: {
            qualityIndex: 0,
            outputSpeed: 0,
            firstTokenLatency: 0,
        },
    },
    {
        name: 'gpt-5-mini',
        maxRequestTokens: 400000,
        maxResponseTokens: 128000,
        inputPricePerMillion: 0.25,
        inputCachedPricePerMillion: 0.025,
        outputPricePerMillion: 2.0,
        capabilities: {
            streaming: true,
            toolCalls: true,
            parallelToolCalls: true,
            reasoning: true,
            input: {
                text: true,
                image: true
            },
            output: {
                text: {
                    textOutputFormats: ['text', 'json']
                }
            }
        },
        characteristics: {
            qualityIndex: 64,
            outputSpeed: 160.9,
            firstTokenLatency: 15760,
        },
    },
    {
        name: 'gpt-5-nano',
        maxRequestTokens: 400000,
        maxResponseTokens: 128000,
        inputPricePerMillion: 0.05,
        inputCachedPricePerMillion: 0.005,
        outputPricePerMillion: 0.40,
        capabilities: {
            streaming: true,
            toolCalls: true,
            parallelToolCalls: true,
            reasoning: true,
            input: {
                text: true,
                image: true
            },
            output: {
                text: {
                    textOutputFormats: ['text', 'json']
                }
            }
        },
        characteristics: {
            qualityIndex: 54,
            outputSpeed: 291.7,
            firstTokenLatency: 22930,
        },
    },
    {
        name: 'gpt-5-chat-latest',
        maxRequestTokens: 400000,
        maxResponseTokens: 128000,
        inputPricePerMillion: 1.25,
        inputCachedPricePerMillion: 0.125,
        outputPricePerMillion: 10.0,
        capabilities: {
            streaming: true,
            toolCalls: false,
            parallelToolCalls: false,
            reasoning: true,
            input: {
                text: true,
                image: true
            },
            output: {
                text: {
                    textOutputFormats: ['text']
                }
            }
        },
        characteristics: {
            qualityIndex: 69,
            outputSpeed: 126.3,
            firstTokenLatency: 74150,
        },
    },
    {
        name: 'gpt-4.1',
        maxRequestTokens: 1047576,
        maxResponseTokens: 32768,
        inputPricePerMillion: 2.0,
        inputCachedPricePerMillion: 0.5,
        outputPricePerMillion: 8.0,
        capabilities: {
            streaming: true,
            toolCalls: true,
            parallelToolCalls: true,
            input: {
                text: true,
                image: true
            },
            output: {
                text: {
                    textOutputFormats: ['text', 'json']
                }
            }
        },
        characteristics: {
            qualityIndex: 47,
            outputSpeed: 121.6,
            firstTokenLatency: 490,
        },
    },
    {
        name: 'o4-mini',
        maxRequestTokens: 200000,
        maxResponseTokens: 100000,
        inputPricePerMillion: 1.10,
        inputCachedPricePerMillion: 0.275,
        outputPricePerMillion: 4.40,
        capabilities: {
            streaming: true,
            toolCalls: true,
            parallelToolCalls: true,
            reasoning: true,
            input: {
                text: true,
                image: true
            },
            output: {
                text: {
                    textOutputFormats: ['text', 'json']
                }
            }
        },
        characteristics: {
            qualityIndex: 65,
            outputSpeed: 124.1,
            firstTokenLatency: 49830,
        },
    },
    {
        name: 'o3',
        maxRequestTokens: 200000,
        maxResponseTokens: 100000,
        inputPricePerMillion: 2.0,
        inputCachedPricePerMillion: 0.5,
        outputPricePerMillion: 8.0,
        capabilities: {
            streaming: true,
            toolCalls: true,
            parallelToolCalls: true,
            reasoning: true,
            input: {
                text: true,
                image: true
            },
            output: {
                text: {
                    textOutputFormats: ['text', 'json']
                }
            }
        },
        characteristics: {
            qualityIndex: 67,
            outputSpeed: 151.7,
            firstTokenLatency: 15840,
        },
    },
    {
        name: 'gpt-4.1-nano',
        maxRequestTokens: 1047576,
        maxResponseTokens: 32768,
        inputPricePerMillion: 0.10,
        inputCachedPricePerMillion: 0.025,
        outputPricePerMillion: 0.40,
        capabilities: {
            streaming: true,
            toolCalls: true,
            parallelToolCalls: true,
            input: {
                text: true,
                image: true
            },
            output: {
                text: {
                    textOutputFormats: ['text', 'json']
                }
            }
        },
        characteristics: {
            qualityIndex: 30,
            outputSpeed: 87.6,
            firstTokenLatency: 360,
        },
    },
    {
        name: 'gpt-4o-audio-preview',
        maxRequestTokens: 128000,
        maxResponseTokens: 16384,
        inputPricePerMillion: 2.5,
        outputPricePerMillion: 10.0,
        // audioInputPricePerMillion: 40.0,  // TODO: add this
        // audioOutputPricePerMillion: 80.0, // TODO: add this
        capabilities: {
            streaming: true,
            toolCalls: true,
            parallelToolCalls: true,
            input: {
                text: true,
                audio: true
            },
            output: {
                text: {
                    textOutputFormats: ['text', 'json']
                },
                audio: true
            }
        },
        characteristics: {
            qualityIndex: 0,
            outputSpeed: 0,
            firstTokenLatency: 0,
        },
    },
    {
        name: 'gpt-image-1',
        maxRequestTokens: 128000,
        maxResponseTokens: 4096,
        inputPricePerMillion: 5.0,
        inputCachedPricePerMillion: 1.25,
        outputPricePerMillion: 0.0,
        // imageInputPricePerMillion: 10.0,  // TODO: add this
        // imageOutputPricePerMillion: 40.0, // TODO: add this
        capabilities: {
            streaming: false,
            toolCalls: false,
            parallelToolCalls: false,
            input: {
                text: true,
                image: true
            },
            output: {
                text: false,
                image: {
                    generate: true,
                    edit: true,
                    editWithMask: true
                }
            }
        },
        characteristics: {
            qualityIndex: 0,
            outputSpeed: 0,
            firstTokenLatency: 0,
        },
    },
    {
        name: 'gpt-4o',
        maxRequestTokens: 128000,
        maxResponseTokens: 4096,
        inputPricePerMillion: 2.5,
        inputCachedPricePerMillion: 1.25,
        outputPricePerMillion: 10.0,
        capabilities: {
            streaming: true,
            toolCalls: true,
            parallelToolCalls: true,
            input: {
                text: true,
                image: true
            },
            output: {
                text: {
                    textOutputFormats: ['text', 'json']
                }
            }
        },
        characteristics: {
            qualityIndex: 29,
            outputSpeed: 119.8,
            firstTokenLatency: 340,
        },
    },
    {
        name: "gpt-4o-mini",
        inputPricePerMillion: 0.15,
        inputCachedPricePerMillion: 0.075,
        outputPricePerMillion: 0.60,
        maxRequestTokens: 128000,
        maxResponseTokens: 16384,
        tokenizationModel: "gpt-4",
        characteristics: {
            qualityIndex: 24,
            outputSpeed: 68.5,
            firstTokenLatency: 450 // latency in ms
        },
        capabilities: {
            toolCalls: true,
            input: {
                text: true,
                image: true
            },
            output: {
                text: {
                    textOutputFormats: ['text', 'json']
                }
            }
        }
    },

    {
        name: 'o1-mini',
        maxRequestTokens: 128000,
        maxResponseTokens: 4096,
        inputPricePerMillion: 1.10,
        inputCachedPricePerMillion: 0.55,
        outputPricePerMillion: 4.40,
        capabilities: {
            streaming: true,
            toolCalls: true,
            parallelToolCalls: true,
            reasoning: true,
            input: {
                text: true
            },
            output: {
                text: {
                    textOutputFormats: ['text', 'json']
                }
            }
        },
        characteristics: {
            qualityIndex: 54,
            outputSpeed: 190.6,
            firstTokenLatency: 10070,
        },
    },
    {
        name: "o3-mini",
        inputPricePerMillion: 1.10,
        inputCachedPricePerMillion: 0.55,
        outputPricePerMillion: 4.40,
        maxRequestTokens: 128000,
        maxResponseTokens: 65536,
        tokenizationModel: "gpt-4",
        characteristics: {
            qualityIndex: 53,
            outputSpeed: 139.9,
            firstTokenLatency: 17170 // latency in ms
        },
        capabilities: {
            streaming: true,
            toolCalls: false,
            reasoning: true,
            input: {
                text: true
            },
            output: {
                text: {
                    textOutputFormats: ['text', 'json']
                }
            }
        }
    },

    // Embedding Models
    {
        name: 'text-embedding-3-small',
        inputPricePerMillion: 0.01,
        outputPricePerMillion: 0, // Embeddings don't generate tokens
        maxRequestTokens: 8192,
        maxResponseTokens: 0, // No response tokens for embeddings
        tokenizationModel: "gpt-4",
        characteristics: {
            qualityIndex: 85,
            outputSpeed: 0, // Not applicable for embeddings
            firstTokenLatency: 50 // Time to get embeddings
        },
        capabilities: {
            streaming: false,
            toolCalls: false,
            embeddings: {
                maxInputLength: 8192,
                dimensions: [512, 1536],
                defaultDimensions: 1536,
                encodingFormats: ['float', 'base64']
            },
            input: {
                text: true
            },
            output: {
                text: false // Embeddings don't output text
            }
        }
    },
    {
        name: 'text-embedding-3-large',
        inputPricePerMillion: 0.065,
        outputPricePerMillion: 0,
        maxRequestTokens: 8192,
        maxResponseTokens: 0,
        tokenizationModel: "gpt-4",
        characteristics: {
            qualityIndex: 95,
            outputSpeed: 0,
            firstTokenLatency: 80
        },
        capabilities: {
            streaming: false,
            toolCalls: false,
            embeddings: {
                maxInputLength: 8192,
                dimensions: [256, 1024, 3072],
                defaultDimensions: 3072,
                encodingFormats: ['float', 'base64']
            },
            input: {
                text: true
            },
            output: {
                text: false
            }
        }
    },
    {
        name: 'text-embedding-ada-002',
        inputPricePerMillion: 0.05,
        outputPricePerMillion: 0,
        maxRequestTokens: 8192,
        maxResponseTokens: 0,
        tokenizationModel: "gpt-4",
        characteristics: {
            qualityIndex: 75,
            outputSpeed: 0,
            firstTokenLatency: 60
        },
        capabilities: {
            streaming: false,
            toolCalls: false,
            embeddings: {
                maxInputLength: 8192,
                dimensions: [1536],
                defaultDimensions: 1536,
                encodingFormats: ['float']
            },
            input: {
                text: true
            },
            output: {
                text: false
            }
        }
    },
]; 