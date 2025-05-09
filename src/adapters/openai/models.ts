import { ModelInfo } from '../../interfaces/UniversalInterfaces';

export const defaultModels: ModelInfo[] = [
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
            qualityIndex: 53,
            outputSpeed: 127.8,
            firstTokenLatency: 420,
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
            qualityIndex: 70,
            outputSpeed: 148.6,
            firstTokenLatency: 37620,
        },
    },
    {
        name: 'o3',
        maxRequestTokens: 200000,
        maxResponseTokens: 100000,
        inputPricePerMillion: 10.0,
        inputCachedPricePerMillion: 2.5,
        outputPricePerMillion: 40.0,
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
            outputSpeed: 0,
            firstTokenLatency: 0,
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
            qualityIndex: 41,
            outputSpeed: 238.4,
            firstTokenLatency: 300,
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
        outputPricePerMillion: 40.0,
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
        inputPricePerMillion: 5.0,
        outputPricePerMillion: 15.0,
        capabilities: {
            streaming: true,
            toolCalls: true,
            parallelToolCalls: true,
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
            qualityIndex: 41,
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
            qualityIndex: 73,
            outputSpeed: 183.8,
            firstTokenLatency: 730 // latency in ms
        },
        capabilities: {
            toolCalls: true,
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
    {
        name: 'o1-preview',
        maxRequestTokens: 128000,
        maxResponseTokens: 4096,
        inputPricePerMillion: 15.0,
        outputPricePerMillion: 75.0,
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
            qualityIndex: 0,
            outputSpeed: 158.6,
            firstTokenLatency: 19710,
        },
    },
    {
        name: 'o1-mini',
        maxRequestTokens: 128000,
        maxResponseTokens: 4096,
        inputPricePerMillion: 5.0,
        outputPricePerMillion: 25.0,
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
            qualityIndex: 63,
            outputSpeed: 167.6,
            firstTokenLatency: 13790 // latency in ms
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
    {
        name: 'dall-e-3',
        maxRequestTokens: 4096,
        maxResponseTokens: 1, // Setting a minimal value since this is an image-only model
        inputPricePerMillion: 4.0,
        outputPricePerMillion: 0.0, // Pricing is per image, not tokens
        capabilities: {
            streaming: false,
            toolCalls: false,
            parallelToolCalls: false,
            input: {
                text: true
            },
            output: {
                text: false,
                image: {
                    generate: true,
                    edit: false,
                    editWithMask: false
                }
            }
        },
        characteristics: {
            qualityIndex: 80,
            outputSpeed: 0,
            firstTokenLatency: 2000,
        },
    },
]; 