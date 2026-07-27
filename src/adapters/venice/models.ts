import type { ModelInfo } from '../../interfaces/UniversalInterfaces.ts';

/**
 * Automatically generated model list from Venice API.
 * This file is managed by the scripts/fetch-venice-models.ts script.
 * Last updated: 2026-07-27T13:58:38.079Z
 */
export const defaultModels: ModelInfo[] = [
    {
        "name": "gemini-3-6-flash",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 1.875,
        "outputPricePerMillion": 9.375,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true,
                "audio": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.1875
    },
    {
        "name": "gemini-3-5-flash-lite",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.375,
        "outputPricePerMillion": 3.125,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true,
                "audio": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.0375
    },
    {
        "name": "zai-org-glm-5-2",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 1.4,
        "outputPricePerMillion": 4.4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.26
    },
    {
        "name": "zai-org-glm-5-1",
        "maxRequestTokens": 200000,
        "maxResponseTokens": 80000,
        "inputPricePerMillion": 1.54,
        "outputPricePerMillion": 4.84,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.286
    },
    {
        "name": "zai-org-glm-5",
        "maxRequestTokens": 198000,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 1,
        "outputPricePerMillion": 3.2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.2
    },
    {
        "name": "z-ai-glm-5-turbo",
        "maxRequestTokens": 200000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 1.2,
        "outputPricePerMillion": 4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.24
    },
    {
        "name": "z-ai-glm-5v-turbo",
        "maxRequestTokens": 200000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 1.5,
        "outputPricePerMillion": 5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.3
    },
    {
        "name": "olafangensan-glm-4.7-flash-heretic",
        "maxRequestTokens": 200000,
        "maxResponseTokens": 24000,
        "inputPricePerMillion": 0.07,
        "outputPricePerMillion": 0.4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.035
    },
    {
        "name": "zai-org-glm-4.7-flash",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.125,
        "outputPricePerMillion": 0.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "zai-org-glm-4.6",
        "maxRequestTokens": 198000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.43,
        "outputPricePerMillion": 1.75,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.08
    },
    {
        "name": "zai-org-glm-4.7",
        "maxRequestTokens": 198000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.55,
        "outputPricePerMillion": 2.65,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.11
    },
    {
        "name": "venice-uncensored-1-2",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.2,
        "outputPricePerMillion": 0.9,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "venice-uncensored-role-play",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 0.5,
        "outputPricePerMillion": 2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "qwen-3-7-max",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 2.7,
        "outputPricePerMillion": 8.05,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.27
    },
    {
        "name": "qwen-3-7-plus",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.5,
        "outputPricePerMillion": 2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.05
    },
    {
        "name": "qwen-3-6-plus",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.625,
        "outputPricePerMillion": 3.75,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.0625
    },
    {
        "name": "qwen3-6-27b",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.325,
        "outputPricePerMillion": 3.25,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "qwen3-6-35b-a3b",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.15,
        "outputPricePerMillion": 1,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.05
    },
    {
        "name": "qwen3-5-9b",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.1,
        "outputPricePerMillion": 0.15,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "qwen3-5-397b-a17b",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.75,
        "outputPricePerMillion": 4.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "qwen3-5-35b-a3b",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.3125,
        "outputPricePerMillion": 1.25,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.15625
    },
    {
        "name": "qwen3-235b-a22b-thinking-2507",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.45,
        "outputPricePerMillion": 3.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "qwen3-235b-a22b-instruct-2507",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.15,
        "outputPricePerMillion": 0.75,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "qwen3-next-80b",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.35,
        "outputPricePerMillion": 1.9,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "qwen3-vl-235b-a22b",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.21,
        "outputPricePerMillion": 1.9,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.1
    },
    {
        "name": "qwen3-coder-480b-a35b-instruct-turbo",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.35,
        "outputPricePerMillion": 1.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.04
    },
    {
        "name": "google-gemma-4-26b-a4b-it",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.13,
        "outputPricePerMillion": 0.4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.05
    },
    {
        "name": "google-gemma-4-31b-it",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.12,
        "outputPricePerMillion": 0.36,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.09
    },
    {
        "name": "gemma-4-uncensored",
        "isUncensored": true,
        "maxRequestTokens": 256000,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.1625,
        "outputPricePerMillion": 0.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "google-gemma-3-27b-it",
        "maxRequestTokens": 198000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.12,
        "outputPricePerMillion": 0.2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "grok-4-3",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 1.42,
        "outputPricePerMillion": 2.83,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.23
    },
    {
        "name": "grok-4-5",
        "maxRequestTokens": 500000,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 2.27,
        "outputPricePerMillion": 6.8,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.34
    },
    {
        "name": "grok-4-20",
        "maxRequestTokens": 2000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 1.42,
        "outputPricePerMillion": 2.83,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.23
    },
    {
        "name": "grok-4-20-multi-agent",
        "maxRequestTokens": 2000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 1.42,
        "outputPricePerMillion": 2.83,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.23
    },
    {
        "name": "grok-build-0-1",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 1,
        "outputPricePerMillion": 2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.2
    },
    {
        "name": "mistral-small-3-2-24b-instruct",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.09375,
        "outputPricePerMillion": 0.25,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "mistral-small-2603",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.1875,
        "outputPricePerMillion": 0.75,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "hermes-3-llama-3.1-405b",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 1.1,
        "outputPricePerMillion": 3,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "gemini-3-1-pro-preview",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 2.5,
        "outputPricePerMillion": 15,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true,
                "audio": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.5
    },
    {
        "name": "gemini-3-5-flash",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 1.55,
        "outputPricePerMillion": 9.45,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true,
                "audio": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.155
    },
    {
        "name": "gemini-3-flash-preview",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.7,
        "outputPricePerMillion": 3.75,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true,
                "audio": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.07
    },
    {
        "name": "claude-fable-5",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 12,
        "outputPricePerMillion": 60,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 1.2
    },
    {
        "name": "claude-opus-5",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 6,
        "outputPricePerMillion": 30,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.6
    },
    {
        "name": "claude-opus-5-fast",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 12,
        "outputPricePerMillion": 60,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 1.2
    },
    {
        "name": "claude-opus-4-8",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 6,
        "outputPricePerMillion": 30,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.6
    },
    {
        "name": "claude-opus-4-8-fast",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 12,
        "outputPricePerMillion": 60,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 1.2
    },
    {
        "name": "claude-opus-4-7",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 6,
        "outputPricePerMillion": 30,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.6
    },
    {
        "name": "claude-opus-4-6",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 6,
        "outputPricePerMillion": 30,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.6
    },
    {
        "name": "claude-opus-4-5",
        "maxRequestTokens": 198000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 6,
        "outputPricePerMillion": 30,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.6
    },
    {
        "name": "claude-sonnet-5",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 3,
        "outputPricePerMillion": 15,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.3
    },
    {
        "name": "claude-sonnet-4-6",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 3.6,
        "outputPricePerMillion": 18,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.36
    },
    {
        "name": "claude-sonnet-4-5",
        "maxRequestTokens": 198000,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 3.75,
        "outputPricePerMillion": 18.75,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.375
    },
    {
        "name": "openai-gpt-oss-120b",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.07,
        "outputPricePerMillion": 0.3,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "kimi-k2-6",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.75,
        "outputPricePerMillion": 3.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.16
    },
    {
        "name": "kimi-k2-7-code",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.75,
        "outputPricePerMillion": 3.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.16
    },
    {
        "name": "kimi-k2-5",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.56,
        "outputPricePerMillion": 3.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.22
    },
    {
        "name": "kimi-k3",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 3.75,
        "outputPricePerMillion": 18.75,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.375
    },
    {
        "name": "inkling",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 5.0625,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true,
                "audio": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.2125
    },
    {
        "name": "xiaomi-mimo-v2-5",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.14,
        "outputPricePerMillion": 0.28,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true,
                "audio": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.05
    },
    {
        "name": "deepseek-v4-pro",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 1.65,
        "outputPricePerMillion": 3.301,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.33
    },
    {
        "name": "deepseek-v4-flash",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.138,
        "outputPricePerMillion": 0.275,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.028
    },
    {
        "name": "deepseek-v3.2",
        "maxRequestTokens": 160000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.33,
        "outputPricePerMillion": 0.48,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.16
    },
    {
        "name": "seed-2-1-turbo",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.625,
        "outputPricePerMillion": 3.125,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.125
    },
    {
        "name": "aion-labs-aion-3-0",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 3.75,
        "outputPricePerMillion": 7.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.9375
    },
    {
        "name": "aion-labs-aion-3-0-mini",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.875,
        "outputPricePerMillion": 1.75,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.225
    },
    {
        "name": "llama-3.2-3b",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 0.15,
        "outputPricePerMillion": 0.6,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "llama-3.3-70b",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 0.7,
        "outputPricePerMillion": 2.8,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "openai-gpt-52",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 2.19,
        "outputPricePerMillion": 17.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.219
    },
    {
        "name": "openai-gpt-52-codex",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 2.19,
        "outputPricePerMillion": 17.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.219
    },
    {
        "name": "openai-gpt-53-codex",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 2.19,
        "outputPricePerMillion": 17.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.219
    },
    {
        "name": "openai-gpt-54",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 3.13,
        "outputPricePerMillion": 18.8,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.313
    },
    {
        "name": "openai-gpt-54-pro",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 37.5,
        "outputPricePerMillion": 225,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "openai-gpt-54-mini",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.9375,
        "outputPricePerMillion": 5.625,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.09375
    },
    {
        "name": "openai-gpt-55",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 6.25,
        "outputPricePerMillion": 37.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.625
    },
    {
        "name": "openai-gpt-55-pro",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 37.5,
        "outputPricePerMillion": 225,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "openai-gpt-56-luna",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 7.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.125
    },
    {
        "name": "openai-gpt-56-luna-pro",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 7.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.125
    },
    {
        "name": "openai-gpt-56-terra",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 3.125,
        "outputPricePerMillion": 18.75,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.3125
    },
    {
        "name": "openai-gpt-56-terra-pro",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 3.125,
        "outputPricePerMillion": 18.75,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.3125
    },
    {
        "name": "openai-gpt-56-sol",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 6.25,
        "outputPricePerMillion": 37.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.625
    },
    {
        "name": "openai-gpt-56-sol-pro",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 6.25,
        "outputPricePerMillion": 37.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.625
    },
    {
        "name": "openai-gpt-4o-2024-11-20",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 3.125,
        "outputPricePerMillion": 12.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "openai-gpt-4o-mini-2024-07-18",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.1875,
        "outputPricePerMillion": 0.75,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.09375
    },
    {
        "name": "minimax-m3-preview",
        "maxRequestTokens": 524288,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.3,
        "outputPricePerMillion": 1.2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.06
    },
    {
        "name": "minimax-m25",
        "maxRequestTokens": 198000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.27,
        "outputPricePerMillion": 0.95,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.03
    },
    {
        "name": "minimax-m27",
        "maxRequestTokens": 198000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.375,
        "outputPricePerMillion": 1.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.06875
    },
    {
        "name": "mercury-2",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 50000,
        "inputPricePerMillion": 0.3125,
        "outputPricePerMillion": 0.9375,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.03125
    },
    {
        "name": "nvidia-nemotron-3-nano-30b-a3b",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.075,
        "outputPricePerMillion": 0.3,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "nvidia-nemotron-3-ultra-550b-a55b",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.625,
        "outputPricePerMillion": 3.125,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.1875
    },
    {
        "name": "nvidia-nemotron-cascade-2-30b-a3b",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.14,
        "outputPricePerMillion": 0.8,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "e2ee-venice-uncensored-24b-p",
        "isUncensored": true,
        "maxRequestTokens": 32000,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 0.25,
        "outputPricePerMillion": 1.15,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "e2ee-gemma-3-27b-p",
        "maxRequestTokens": 40000,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 0.14,
        "outputPricePerMillion": 0.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "e2ee-gemma-4-26b-a4b-uncensored-p",
        "isUncensored": true,
        "maxRequestTokens": 64000,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 0.19,
        "outputPricePerMillion": 0.88,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "e2ee-glm-5-2-p",
        "maxRequestTokens": 524288,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 1.75,
        "outputPricePerMillion": 5.75,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "e2ee-glm-4-7-p",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 1.1,
        "outputPricePerMillion": 4.15,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "e2ee-gpt-oss-20b-p",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.05,
        "outputPricePerMillion": 0.19,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "e2ee-gpt-oss-120b-p",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.13,
        "outputPricePerMillion": 0.65,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "e2ee-qwen-2-5-7b-p",
        "maxRequestTokens": 32000,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 0.05,
        "outputPricePerMillion": 0.13,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "e2ee-qwen3-6-35b-a3b-uncensored-p",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 0.38,
        "outputPricePerMillion": 1.88,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "e2ee-qwen3-30b-a3b-p",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.19,
        "outputPricePerMillion": 0.69,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "e2ee-qwen3-vl-30b-a3b-p",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 0.25,
        "outputPricePerMillion": 0.9,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "e2ee-glm-5-1",
        "maxRequestTokens": 200000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 1.1,
        "outputPricePerMillion": 4.15,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "e2ee-qwen3-6-35b-a3b",
        "maxRequestTokens": 32000,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 0.182,
        "outputPricePerMillion": 1.18,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.06
    },
    {
        "name": "e2ee-qwen3-6-27b",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.346,
        "outputPricePerMillion": 3.46,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.171
    },
    {
        "name": "e2ee-gemma-4-31b",
        "maxRequestTokens": 32000,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 0.139,
        "outputPricePerMillion": 0.43,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.028
    },
    {
        "name": "e2ee-deepseek-v4-flash",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.182,
        "outputPricePerMillion": 0.373,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "reasoning": true,
            "input": {
                "text": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text"
                    ],
                    "structuredOutputs": false
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.038
    },
    {
        "name": "venice-sd35",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.01
    },
    {
        "name": "grok-imagine-image-quality",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.06
    },
    {
        "name": "krea-2-turbo",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.04
    },
    {
        "name": "flux-2-pro",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.03
    },
    {
        "name": "flux-2-max",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.09
    },
    {
        "name": "gpt-image-2",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.27
    },
    {
        "name": "gpt-image-1-5",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.26
    },
    {
        "name": "hunyuan-image-v3",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.09
    },
    {
        "name": "ideogram-v4",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.06
    },
    {
        "name": "imagineart-1.5-pro",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.06
    },
    {
        "name": "krea-v2-large",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.07
    },
    {
        "name": "krea-v2-medium",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.04
    },
    {
        "name": "luma-uni-1",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.05
    },
    {
        "name": "luma-uni-1-max",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.12
    },
    {
        "name": "nano-banana-2",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.1
    },
    {
        "name": "nano-banana-pro",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.18
    },
    {
        "name": "nano-banana-2-lite",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.06
    },
    {
        "name": "recraft-v4",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.05
    },
    {
        "name": "recraft-v4-pro",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.29
    },
    {
        "name": "seedream-v4",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.05
    },
    {
        "name": "seedream-v5-lite",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.05
    },
    {
        "name": "seedream-v5-pro",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.06
    },
    {
        "name": "qwen-image-2",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.05
    },
    {
        "name": "qwen-image-2-pro",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.1
    },
    {
        "name": "wan-2-7-text-to-image",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.0375
    },
    {
        "name": "wan-2-7-pro-text-to-image",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.09375
    },
    {
        "name": "grok-imagine-image",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.03
    },
    {
        "name": "lustify-sdxl",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.01
    },
    {
        "name": "lustify-v7",
        "isUncensored": true,
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.01
    },
    {
        "name": "lustify-v8",
        "isUncensored": true,
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.01
    },
    {
        "name": "qwen-image",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.03
    },
    {
        "name": "wai-Illustrious",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.01
    },
    {
        "name": "z-image-turbo",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.01
    },
    {
        "name": "chroma",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.01
    },
    {
        "name": "bria-bg-remover",
        "maxRequestTokens": 1000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "size": "1024x1024"
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 1,
            "firstTokenLatency": 5000
        },
        "imagePricePerImage": 0.03
    },
    {
        "name": "text-embedding-bge-m3",
        "maxRequestTokens": 8192,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.15,
        "outputPricePerMillion": 0.6,
        "capabilities": {
            "embeddings": {
                "maxInputLength": 8192,
                "dimensions": [
                    1024
                ],
                "defaultDimensions": 1024
            },
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 0,
            "firstTokenLatency": 200
        }
    },
    {
        "name": "text-embedding-bge-en-icl",
        "maxRequestTokens": 8192,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.0125,
        "outputPricePerMillion": 0.0125,
        "capabilities": {
            "embeddings": {
                "maxInputLength": 8192,
                "dimensions": [
                    4096
                ],
                "defaultDimensions": 4096
            },
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 0,
            "firstTokenLatency": 200
        }
    },
    {
        "name": "text-embedding-qwen3-8b",
        "maxRequestTokens": 32768,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.0125,
        "outputPricePerMillion": 0.0125,
        "capabilities": {
            "embeddings": {
                "maxInputLength": 32768,
                "dimensions": [
                    4096
                ],
                "defaultDimensions": 4096
            },
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 0,
            "firstTokenLatency": 200
        }
    },
    {
        "name": "text-embedding-qwen3-0-6b",
        "maxRequestTokens": 32768,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.0125,
        "outputPricePerMillion": 0.0125,
        "capabilities": {
            "embeddings": {
                "maxInputLength": 32768,
                "dimensions": [
                    1024
                ],
                "defaultDimensions": 1024
            },
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 0,
            "firstTokenLatency": 200
        }
    },
    {
        "name": "text-embedding-multilingual-e5-large-instruct",
        "maxRequestTokens": 512,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.0125,
        "outputPricePerMillion": 0.0125,
        "capabilities": {
            "embeddings": {
                "maxInputLength": 512,
                "dimensions": [
                    1024
                ],
                "defaultDimensions": 1024
            },
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 0,
            "firstTokenLatency": 200
        }
    },
    {
        "name": "text-embedding-3-small",
        "maxRequestTokens": 8191,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.025,
        "outputPricePerMillion": 0.025,
        "capabilities": {
            "embeddings": {
                "maxInputLength": 8191,
                "dimensions": [
                    1536
                ],
                "defaultDimensions": 1536
            },
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 0,
            "firstTokenLatency": 200
        }
    },
    {
        "name": "text-embedding-3-large",
        "maxRequestTokens": 8191,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.1625,
        "outputPricePerMillion": 0.1625,
        "capabilities": {
            "embeddings": {
                "maxInputLength": 8191,
                "dimensions": [
                    3072
                ],
                "defaultDimensions": 3072
            },
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 0,
            "firstTokenLatency": 200
        }
    },
    {
        "name": "gemini-embedding-2-preview",
        "maxRequestTokens": 2048,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.25,
        "outputPricePerMillion": 0.25,
        "capabilities": {
            "embeddings": {
                "maxInputLength": 2048,
                "dimensions": [
                    3072
                ],
                "defaultDimensions": 3072
            },
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 0,
            "firstTokenLatency": 200
        }
    },
    {
        "name": "text-embedding-nemotron-embed-vl-1b-v2",
        "maxRequestTokens": 32768,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.0125,
        "outputPricePerMillion": 0.0125,
        "capabilities": {
            "embeddings": {
                "maxInputLength": 32768,
                "dimensions": [
                    2048
                ],
                "defaultDimensions": 2048
            },
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 0,
            "firstTokenLatency": 200
        }
    }
];
