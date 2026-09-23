import type { ModelInfo } from '../../interfaces/UniversalInterfaces.ts';

/**
 * Automatically generated model list from Vercel AI Gateway API.
 * This file is managed by the scripts/fetch-vercel-models.ts script.
 * Last updated: 2026-09-23T17:42:52.047Z
 */
export const defaultModels: ModelInfo[] = [
    {
        "name": "alibaba/qwen-3-14b",
        "maxRequestTokens": 40960,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.12,
        "outputPricePerMillion": 0.24,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "alibaba/qwen-3-235b",
        "maxRequestTokens": 262144,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.22,
        "outputPricePerMillion": 0.88,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "alibaba/qwen-3-30b",
        "maxRequestTokens": 40960,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.12,
        "outputPricePerMillion": 0.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "alibaba/qwen-3-32b",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.16,
        "outputPricePerMillion": 0.64,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "alibaba/qwen-3.6-max-preview",
        "maxRequestTokens": 240000,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 1.3,
        "outputPricePerMillion": 7.8,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.13
    },
    {
        "name": "alibaba/qwen3-235b-a22b-thinking",
        "maxRequestTokens": 131072,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.39999999999999997,
        "outputPricePerMillion": 4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "alibaba/qwen3-coder",
        "maxRequestTokens": 262144,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 1.5,
        "outputPricePerMillion": 7.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.3
    },
    {
        "name": "alibaba/qwen3-coder-30b-a3b",
        "maxRequestTokens": 262144,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.15,
        "outputPricePerMillion": 0.6,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "alibaba/qwen3-coder-next",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 256000,
        "inputPricePerMillion": 0.5,
        "outputPricePerMillion": 1.2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "alibaba/qwen3-coder-plus",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 1,
        "outputPricePerMillion": 5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        },
        "inputCachedPricePerMillion": 0.19999999999999998
    },
    {
        "name": "alibaba/qwen3-embedding-0.6b",
        "maxRequestTokens": 32768,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.01,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "alibaba/qwen3-embedding-4b",
        "maxRequestTokens": 32768,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.02,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "alibaba/qwen3-embedding-8b",
        "maxRequestTokens": 32768,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.01,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "alibaba/qwen3-max",
        "maxRequestTokens": 262144,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 1.2,
        "outputPricePerMillion": 6,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "alibaba/qwen3-max-preview",
        "maxRequestTokens": 262144,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 1.2,
        "outputPricePerMillion": 6,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.24
    },
    {
        "name": "alibaba/qwen3-max-thinking",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 1.2,
        "outputPricePerMillion": 6,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "alibaba/qwen3-next-80b-a3b-instruct",
        "maxRequestTokens": 262114,
        "maxResponseTokens": 262114,
        "inputPricePerMillion": 0.15,
        "outputPricePerMillion": 1.2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "alibaba/qwen3-next-80b-a3b-thinking",
        "maxRequestTokens": 262144,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.15,
        "outputPricePerMillion": 1.2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "alibaba/qwen3-vl-235b-a22b-instruct",
        "maxRequestTokens": 131072,
        "maxResponseTokens": 129024,
        "inputPricePerMillion": 0.39999999999999997,
        "outputPricePerMillion": 1.5999999999999999,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "alibaba/qwen3-vl-instruct",
        "maxRequestTokens": 131072,
        "maxResponseTokens": 129024,
        "inputPricePerMillion": 0.39999999999999997,
        "outputPricePerMillion": 1.5999999999999999,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "alibaba/qwen3-vl-thinking",
        "maxRequestTokens": 131072,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.39999999999999997,
        "outputPricePerMillion": 4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        }
    },
    {
        "name": "alibaba/qwen3.5-flash",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0.39999999999999997,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.01
    },
    {
        "name": "alibaba/qwen3.5-plus",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 0.39999999999999997,
        "outputPricePerMillion": 2.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.04
    },
    {
        "name": "alibaba/qwen3.6-27b",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 256000,
        "inputPricePerMillion": 0.6,
        "outputPricePerMillion": 3.5999999999999996,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        }
    },
    {
        "name": "alibaba/qwen3.6-plus",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 0.5,
        "outputPricePerMillion": 3,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.049999999999999996
    },
    {
        "name": "alibaba/qwen3.7-flash",
        "maxRequestTokens": 991000,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 0.03,
        "outputPricePerMillion": 0.13,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.006
    },
    {
        "name": "alibaba/qwen3.7-max",
        "maxRequestTokens": 991000,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 2.5,
        "outputPricePerMillion": 7.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.5
    },
    {
        "name": "alibaba/qwen3.7-plus",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 0.39999999999999997,
        "outputPricePerMillion": 1.5999999999999999,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.08
    },
    {
        "name": "alibaba/qwen3.8-2.4t-a95b",
        "maxRequestTokens": 262144,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 2,
        "outputPricePerMillion": 6,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.25
    },
    {
        "name": "alibaba/qwen3.8-27b",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.5,
        "outputPricePerMillion": 3,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.09999999999999999
    },
    {
        "name": "alibaba/qwen3.8-flash",
        "maxRequestTokens": 991000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.15,
        "outputPricePerMillion": 0.47,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.016
    },
    {
        "name": "alibaba/qwen3.8-max",
        "maxRequestTokens": 262144,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 2,
        "outputPricePerMillion": 6,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.25
    },
    {
        "name": "alibaba/qwen3.8-max-0902",
        "maxRequestTokens": 991000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 2,
        "outputPricePerMillion": 6,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.25
    },
    {
        "name": "alibaba/qwen3.8-omni-flash",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.15,
        "outputPricePerMillion": 0.47,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.016
    },
    {
        "name": "alibaba/wan-v2.5-t2v-preview",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "alibaba/wan-v2.6-i2v",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "alibaba/wan-v2.6-i2v-flash",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "alibaba/wan-v2.6-r2v",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "alibaba/wan-v2.6-r2v-flash",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "alibaba/wan-v2.6-t2v",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "alibaba/wan-v2.7-r2v",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "alibaba/wan-v2.7-t2v",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "alibaba/wan-v3.0-video",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "alibaba/wan-v3.0-video-prime",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "amazon/nova-2-lite",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 1000000,
        "inputPricePerMillion": 0.3,
        "outputPricePerMillion": 2.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.075
    },
    {
        "name": "amazon/nova-lite",
        "maxRequestTokens": 300000,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.06,
        "outputPricePerMillion": 0.24,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "amazon/nova-micro",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.035,
        "outputPricePerMillion": 0.14,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "amazon/nova-pro",
        "maxRequestTokens": 300000,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.7999999999999999,
        "outputPricePerMillion": 3.1999999999999997,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "amazon/titan-embed-text-v2",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.02,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "anthropic/claude-3-haiku",
        "maxRequestTokens": 200000,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 0.25,
        "outputPricePerMillion": 1.25,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.03
    },
    {
        "name": "anthropic/claude-fable-5",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 10,
        "outputPricePerMillion": 50,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 1
    },
    {
        "name": "anthropic/claude-fable-5.1",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 10,
        "outputPricePerMillion": 50,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.25
    },
    {
        "name": "anthropic/claude-haiku-4.5",
        "maxRequestTokens": 200000,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 1,
        "outputPricePerMillion": 5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.09999999999999999
    },
    {
        "name": "anthropic/claude-opus-4",
        "maxRequestTokens": 200000,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 15,
        "outputPricePerMillion": 75,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 1.5
    },
    {
        "name": "anthropic/claude-opus-4.5",
        "maxRequestTokens": 200000,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 5,
        "outputPricePerMillion": 25,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.5
    },
    {
        "name": "anthropic/claude-opus-4.6",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 5,
        "outputPricePerMillion": 25,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.5
    },
    {
        "name": "anthropic/claude-opus-4.7",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 5,
        "outputPricePerMillion": 25,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.5
    },
    {
        "name": "anthropic/claude-opus-4.8",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 5,
        "outputPricePerMillion": 25,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.5
    },
    {
        "name": "anthropic/claude-opus-4.8-fast",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 10,
        "outputPricePerMillion": 50,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 1
    },
    {
        "name": "anthropic/claude-opus-5",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 5,
        "outputPricePerMillion": 25,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.5
    },
    {
        "name": "anthropic/claude-opus-5-fast",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 10,
        "outputPricePerMillion": 50,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 1
    },
    {
        "name": "anthropic/claude-opus-5.5",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 4,
        "outputPricePerMillion": 20,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.19999999999999998
    },
    {
        "name": "anthropic/claude-opus-5.5-fast",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 8,
        "outputPricePerMillion": 40,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.39999999999999997
    },
    {
        "name": "anthropic/claude-sonnet-4",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 3,
        "outputPricePerMillion": 15,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "anthropic/claude-sonnet-4.5",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 3,
        "outputPricePerMillion": 15,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "anthropic/claude-sonnet-4.6",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 3,
        "outputPricePerMillion": 15,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "anthropic/claude-sonnet-5",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 2,
        "outputPricePerMillion": 10,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.19999999999999998
    },
    {
        "name": "arcee-ai/trinity-large-thinking",
        "maxRequestTokens": 262100,
        "maxResponseTokens": 80000,
        "inputPricePerMillion": 0.25,
        "outputPricePerMillion": 0.8999999999999999,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "bfl/flux-2-flex",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
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
        "name": "bfl/flux-2-klein-4b",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
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
        "name": "bfl/flux-2-klein-9b",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
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
        "name": "bfl/flux-2-max",
        "maxRequestTokens": 67300,
        "maxResponseTokens": 67300,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
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
        "name": "bfl/flux-2-pro",
        "maxRequestTokens": 67300,
        "maxResponseTokens": 67300,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
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
        "name": "bfl/flux-3-video",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "bfl/flux-kontext-max",
        "maxRequestTokens": 512,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "imagePricePerImage": 0.08
    },
    {
        "name": "bfl/flux-kontext-pro",
        "maxRequestTokens": 512,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "imagePricePerImage": 0.04
    },
    {
        "name": "bfl/flux-pro-1.0-fill",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "imagePricePerImage": 0.05
    },
    {
        "name": "bfl/flux-pro-1.1",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "imagePricePerImage": 0.04
    },
    {
        "name": "bfl/flux-pro-1.1-ultra",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "imagePricePerImage": 0.06
    },
    {
        "name": "bytedance/seed-1.6",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 0.25,
        "outputPricePerMillion": 2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.049999999999999996
    },
    {
        "name": "bytedance/seed-1.8",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 0.25,
        "outputPricePerMillion": 2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.049999999999999996
    },
    {
        "name": "bytedance/seed-2.1-turbo",
        "maxRequestTokens": 262144,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.5,
        "outputPricePerMillion": 2.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.09999999999999999
    },
    {
        "name": "bytedance/seedance-2.0",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "bytedance/seedance-2.0-fast",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "bytedance/seedance-2.0-mini",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "bytedance/seedance-2.5",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "bytedance/seedance-v1.0-pro",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "bytedance/seedance-v1.0-pro-fast",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "bytedance/seedance-v1.5-pro",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "bytedance/seedream-4.0",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "imagePricePerImage": 0.03
    },
    {
        "name": "bytedance/seedream-4.5",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "imagePricePerImage": 0.04
    },
    {
        "name": "bytedance/seedream-5.0-lite",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "imagePricePerImage": 0.035
    },
    {
        "name": "bytedance/seedream-5.0-pro",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.003,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "imagePricePerImage": 0.035
    },
    {
        "name": "cohere/command-a",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 8000,
        "inputPricePerMillion": 2.5,
        "outputPricePerMillion": 10,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "cohere/embed-v4.0",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.12,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "cohere/rerank-v3.5",
        "maxRequestTokens": 4096,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "reranking": {
                "documentTypes": [
                    "text"
                ]
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
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "cohere/rerank-v4-fast",
        "maxRequestTokens": 32000,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "reranking": {
                "documentTypes": [
                    "text"
                ]
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
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "cohere/rerank-v4-pro",
        "maxRequestTokens": 32000,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "reranking": {
                "documentTypes": [
                    "text"
                ]
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
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "deepseek/deepseek-r1",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 1.35,
        "outputPricePerMillion": 5.4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "deepseek/deepseek-v3.1",
        "maxRequestTokens": 163840,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.25,
        "outputPricePerMillion": 0.95,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.13
    },
    {
        "name": "deepseek/deepseek-v3.1-terminus",
        "maxRequestTokens": 131072,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.27,
        "outputPricePerMillion": 1,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.135
    },
    {
        "name": "deepseek/deepseek-v3.2",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 8000,
        "inputPricePerMillion": 0.62,
        "outputPricePerMillion": 1.85,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "deepseek/deepseek-v3.2-thinking",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 8000,
        "inputPricePerMillion": 0.62,
        "outputPricePerMillion": 1.85,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "deepseek/deepseek-v4-flash",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 384000,
        "inputPricePerMillion": 0.13,
        "outputPricePerMillion": 0.26,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "deepseek/deepseek-v4-flash-0731",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 384000,
        "inputPricePerMillion": 0.07600000000000001,
        "outputPricePerMillion": 0.153,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.014
    },
    {
        "name": "deepseek/deepseek-v4-flash-vision-exp",
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 1048576,
        "inputPricePerMillion": 0.22,
        "outputPricePerMillion": 0.66,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.007
    },
    {
        "name": "deepseek/deepseek-v4-pro",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 384000,
        "inputPricePerMillion": 0.66,
        "outputPricePerMillion": 1.9800000000000002,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.022
    },
    {
        "name": "deepseek/deepseek-v4-pro-0813",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 384000,
        "inputPricePerMillion": 0.66,
        "outputPricePerMillion": 1.9800000000000002,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.06599999999999999
    },
    {
        "name": "deepseek/deepseek-v4.1-flash",
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.3,
        "outputPricePerMillion": 1.2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.007
    },
    {
        "name": "fish-audio/s1",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 15,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "fish-audio/s2-pro",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 15,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "fish-audio/s2.1-pro",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 15,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "fish-audio/transcribe-1",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.0001,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "google/gemini-2.5-flash",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65535,
        "inputPricePerMillion": 0.3,
        "outputPricePerMillion": 2.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.03
    },
    {
        "name": "google/gemini-2.5-flash-image",
        "maxRequestTokens": 32768,
        "maxResponseTokens": 65535,
        "inputPricePerMillion": 0.3,
        "outputPricePerMillion": 2.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.03
    },
    {
        "name": "google/gemini-2.5-flash-lite",
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65535,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0.39999999999999997,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.01
    },
    {
        "name": "google/gemini-2.5-pro",
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65535,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 10,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "google/gemini-3-flash",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65000,
        "inputPricePerMillion": 0.5,
        "outputPricePerMillion": 3,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.049999999999999996
    },
    {
        "name": "google/gemini-3-pro-image",
        "maxRequestTokens": 65536,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 2,
        "outputPricePerMillion": 12,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.19999999999999998
    },
    {
        "name": "google/gemini-3.1-flash-image",
        "maxRequestTokens": 131072,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.5,
        "outputPricePerMillion": 3,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.049999999999999996
    },
    {
        "name": "google/gemini-3.1-flash-image-preview",
        "maxRequestTokens": 131072,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.5,
        "outputPricePerMillion": 3,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.049999999999999996
    },
    {
        "name": "google/gemini-3.1-flash-lite",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65000,
        "inputPricePerMillion": 0.25,
        "outputPricePerMillion": 1.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.03
    },
    {
        "name": "google/gemini-3.1-flash-lite-image",
        "maxRequestTokens": 65536,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 0.25,
        "outputPricePerMillion": 1.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.03
    },
    {
        "name": "google/gemini-3.1-pro-preview",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 2,
        "outputPricePerMillion": 12,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.19999999999999998
    },
    {
        "name": "google/gemini-3.5-flash",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 1.5,
        "outputPricePerMillion": 9,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.15
    },
    {
        "name": "google/gemini-3.5-flash-lite",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65000,
        "inputPricePerMillion": 0.3,
        "outputPricePerMillion": 2.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.03
    },
    {
        "name": "google/gemini-3.5-transcribe",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 2,
        "outputPricePerMillion": 12,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "google/gemini-3.5-transcribe-live",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.0001,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "google/gemini-3.6-flash",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 0.75,
        "outputPricePerMillion": 3.75,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.075
    },
    {
        "name": "google/gemini-3.7-flash",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65535,
        "inputPricePerMillion": 0.75,
        "outputPricePerMillion": 3.75,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.075
    },
    {
        "name": "google/gemini-3.8-flash",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65535,
        "inputPricePerMillion": 0.75,
        "outputPricePerMillion": 3.75,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.075
    },
    {
        "name": "google/gemini-3.8-flash-lite-tts",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.5,
        "outputPricePerMillion": 6,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false
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
        "name": "google/gemini-3.8-flash-tts",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.5,
        "outputPricePerMillion": 9,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false
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
        "name": "google/gemini-3.8-live",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.75,
        "outputPricePerMillion": 4.5,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "google/gemini-3.8-live-extended-thinking",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.75,
        "outputPricePerMillion": 4.5,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "google/gemini-embedding-001",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.15,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "google/gemini-embedding-2",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.19999999999999998,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "google/gemini-omni-flash-preview",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 57920,
        "inputPricePerMillion": 1.5,
        "outputPricePerMillion": 9,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "parallelToolCalls": false,
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
        "name": "google/gemma-4-26b-a4b-it",
        "maxRequestTokens": 262144,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.15,
        "outputPricePerMillion": 0.6,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.015
    },
    {
        "name": "google/gemma-4-31b-it",
        "maxRequestTokens": 262144,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.14,
        "outputPricePerMillion": 0.39999999999999997,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "google/text-embedding-005",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.024999999999999998,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "google/text-multilingual-embedding-002",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.024999999999999998,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "google/veo-3.0-fast-generate-001",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "google/veo-3.0-generate-001",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "google/veo-3.1-fast-generate-001",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "google/veo-3.1-generate-001",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "google/veo-3.1-lite-generate-001",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "inception/mercury-2",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.25,
        "outputPricePerMillion": 0.75,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.024999999999999998
    },
    {
        "name": "inception/mercury-2.5",
        "maxRequestTokens": 260000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.04,
        "outputPricePerMillion": 0.15,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.004
    },
    {
        "name": "inception/mercury-coder-small",
        "maxRequestTokens": 32000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.25,
        "outputPricePerMillion": 1,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "inclusionai/ling-3.0-flash",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 0.020999999999999998,
        "outputPricePerMillion": 0.063,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.004200000000000001
    },
    {
        "name": "inclusionai/ling-3.0-flash-fin",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "inclusionai/ling-3.0-flash-fin-free",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "inclusionai/ling-3.0-flash-sante",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "inclusionai/ling-3.0-flash-sante-free",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "inclusionai/ling-3.0-flash-vl",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 0.075,
        "outputPricePerMillion": 0.015,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.22
    },
    {
        "name": "inference-net/schematron-v2-small",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 0.049999999999999996,
        "outputPricePerMillion": 0.22999999999999998,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.049999999999999996
    },
    {
        "name": "inference-net/schematron-v2-turbo",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.03,
        "outputPricePerMillion": 0.15,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.03
    },
    {
        "name": "interfaze/interfaze-beta",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 1.5,
        "outputPricePerMillion": 3.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "klingai/kling-v2.5-turbo-i2v",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "klingai/kling-v2.5-turbo-t2v",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "klingai/kling-v2.6-i2v",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "klingai/kling-v2.6-motion-control",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "klingai/kling-v2.6-t2v",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "klingai/kling-v3.0-i2v",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "klingai/kling-v3.0-motion-control",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "klingai/kling-v3.0-t2v",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "meta/llama-3.1-70b",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.72,
        "outputPricePerMillion": 0.72,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "meta/llama-3.1-8b",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.22,
        "outputPricePerMillion": 0.22,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "meta/llama-3.3-70b",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.72,
        "outputPricePerMillion": 0.72,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "meta/llama-4-maverick",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.24,
        "outputPricePerMillion": 0.9700000000000001,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "meta/llama-4-scout",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.16999999999999998,
        "outputPricePerMillion": 0.66,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "meta/muse-glimmer-30b",
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.35,
        "outputPricePerMillion": 1.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.04
    },
    {
        "name": "meta/muse-image-1.0",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "imagePricePerImage": 0.01
    },
    {
        "name": "meta/muse-spark-1.1",
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 1048576,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 4.25,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.15
    },
    {
        "name": "meta/muse-spark-1.2",
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 1048576,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 4.25,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.15
    },
    {
        "name": "meta/muse-spark-1.2-contributor",
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 1048576,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0.19999999999999998,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.002
    },
    {
        "name": "meta/muse-spark-1.3",
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 1048576,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 4.25,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.15
    },
    {
        "name": "meta/muse-spark-1.3-contributor",
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 1048576,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0.19999999999999998,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.002
    },
    {
        "name": "minimax/minimax-h3",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "minimax/minimax-h3-max",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "minimax/minimax-m2",
        "maxRequestTokens": 205000,
        "maxResponseTokens": 205000,
        "inputPricePerMillion": 0.3,
        "outputPricePerMillion": 1.2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.03
    },
    {
        "name": "minimax/minimax-m2.1",
        "maxRequestTokens": 204800,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.3,
        "outputPricePerMillion": 1.2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.03
    },
    {
        "name": "minimax/minimax-m2.1-lightning",
        "maxRequestTokens": 204800,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.3,
        "outputPricePerMillion": 2.4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.03
    },
    {
        "name": "minimax/minimax-m2.5",
        "maxRequestTokens": 204800,
        "maxResponseTokens": 131000,
        "inputPricePerMillion": 0.3,
        "outputPricePerMillion": 1.2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.03
    },
    {
        "name": "minimax/minimax-m2.5-highspeed",
        "maxRequestTokens": 204800,
        "maxResponseTokens": 131000,
        "inputPricePerMillion": 0.6,
        "outputPricePerMillion": 2.4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.03
    },
    {
        "name": "minimax/minimax-m2.7",
        "maxRequestTokens": 204800,
        "maxResponseTokens": 131000,
        "inputPricePerMillion": 0.3,
        "outputPricePerMillion": 1.2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.06
    },
    {
        "name": "minimax/minimax-m2.7-highspeed",
        "maxRequestTokens": 204800,
        "maxResponseTokens": 131100,
        "inputPricePerMillion": 0.6,
        "outputPricePerMillion": 2.4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.06
    },
    {
        "name": "minimax/minimax-m3",
        "maxRequestTokens": 512000,
        "maxResponseTokens": 512000,
        "inputPricePerMillion": 0.3,
        "outputPricePerMillion": 1.2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.06
    },
    {
        "name": "mistral/codestral",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 4000,
        "inputPricePerMillion": 0.3,
        "outputPricePerMillion": 0.8999999999999999,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.03
    },
    {
        "name": "mistral/codestral-embed",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.15,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.015
    },
    {
        "name": "mistral/ministral-14b",
        "maxRequestTokens": 262144,
        "maxResponseTokens": 256000,
        "inputPricePerMillion": 0.19999999999999998,
        "outputPricePerMillion": 0.19999999999999998,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.02
    },
    {
        "name": "mistral/ministral-3b",
        "maxRequestTokens": 131072,
        "maxResponseTokens": 4000,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0.09999999999999999,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        },
        "inputCachedPricePerMillion": 0.01
    },
    {
        "name": "mistral/ministral-8b",
        "maxRequestTokens": 262144,
        "maxResponseTokens": 4000,
        "inputPricePerMillion": 0.15,
        "outputPricePerMillion": 0.15,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.015
    },
    {
        "name": "mistral/mistral-embed",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "mistral/mistral-large-3",
        "maxRequestTokens": 262144,
        "maxResponseTokens": 256000,
        "inputPricePerMillion": 0.5,
        "outputPricePerMillion": 1.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.049999999999999996
    },
    {
        "name": "mistral/mistral-medium-3.5",
        "maxRequestTokens": 262144,
        "maxResponseTokens": 256000,
        "inputPricePerMillion": 1.5,
        "outputPricePerMillion": 7.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.15
    },
    {
        "name": "mistral/mistral-nemo",
        "maxRequestTokens": 60288,
        "maxResponseTokens": 16000,
        "inputPricePerMillion": 0.04,
        "outputPricePerMillion": 0.16999999999999998,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "mistral/mistral-small",
        "maxRequestTokens": 262144,
        "maxResponseTokens": 4000,
        "inputPricePerMillion": 0.15,
        "outputPricePerMillion": 0.6,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.015
    },
    {
        "name": "mixedbread/toast-1",
        "maxRequestTokens": 131000,
        "maxResponseTokens": 4000,
        "inputPricePerMillion": 0.3,
        "outputPricePerMillion": 0.72,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.036
    },
    {
        "name": "moonshotai/kimi-k2",
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.5700000000000001,
        "outputPricePerMillion": 2.3,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "moonshotai/kimi-k2-thinking",
        "maxRequestTokens": 216144,
        "maxResponseTokens": 216144,
        "inputPricePerMillion": 0.47,
        "outputPricePerMillion": 2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.14100000000000001
    },
    {
        "name": "moonshotai/kimi-k2.5",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 256000,
        "inputPricePerMillion": 0.6,
        "outputPricePerMillion": 3,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "moonshotai/kimi-k2.6",
        "maxRequestTokens": 262000,
        "maxResponseTokens": 262000,
        "inputPricePerMillion": 0.95,
        "outputPricePerMillion": 4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "moonshotai/kimi-k2.7-code",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.95,
        "outputPricePerMillion": 4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "moonshotai/kimi-k2.7-code-highspeed",
        "maxRequestTokens": 262144,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 1.9,
        "outputPricePerMillion": 8,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.38
    },
    {
        "name": "moonshotai/kimi-k3",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 3,
        "outputPricePerMillion": 15,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "moonshotai/kimi-k3-fast",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 4.5,
        "outputPricePerMillion": 22.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.44999999999999996
    },
    {
        "name": "morph/morph-v3-fast",
        "maxRequestTokens": 81920,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.7999999999999999,
        "outputPricePerMillion": 1.2,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "parallelToolCalls": false,
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
        "name": "morph/morph-v3-large",
        "maxRequestTokens": 81920,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.8999999999999999,
        "outputPricePerMillion": 1.9,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "parallelToolCalls": false,
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
        "name": "nvidia/nemotron-3-nano-30b-a3b",
        "maxRequestTokens": 262144,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.049999999999999996,
        "outputPricePerMillion": 0.19999999999999998,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.024999999999999998
    },
    {
        "name": "nvidia/nemotron-3-super-120b-a12b",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 0.15,
        "outputPricePerMillion": 0.65,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "nvidia/nemotron-3-ultra-550b-a55b",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65000,
        "inputPricePerMillion": 0.6,
        "outputPricePerMillion": 2.4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.12
    },
    {
        "name": "nvidia/nemotron-3.5-lightning",
        "maxRequestTokens": 262144,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.049999999999999996,
        "outputPricePerMillion": 0.19999999999999998,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.01
    },
    {
        "name": "nvidia/nemotron-nano-12b-v2-vl",
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.19999999999999998,
        "outputPricePerMillion": 0.6,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "nvidia/nemotron-nano-9b-v2",
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.06,
        "outputPricePerMillion": 0.22999999999999998,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "openai/gpt-3.5-turbo",
        "maxRequestTokens": 16385,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 0.5,
        "outputPricePerMillion": 1.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "openai/gpt-4-turbo",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 10,
        "outputPricePerMillion": 30,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "openai/gpt-4.1",
        "maxRequestTokens": 1047576,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 2,
        "outputPricePerMillion": 8,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.5
    },
    {
        "name": "openai/gpt-4.1-fast",
        "maxRequestTokens": 1047576,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 3.5,
        "outputPricePerMillion": 14,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.875
    },
    {
        "name": "openai/gpt-4.1-mini",
        "maxRequestTokens": 1047576,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.39999999999999997,
        "outputPricePerMillion": 1.5999999999999999,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.09999999999999999
    },
    {
        "name": "openai/gpt-4.1-mini-fast",
        "maxRequestTokens": 1047576,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.7,
        "outputPricePerMillion": 2.8,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.175
    },
    {
        "name": "openai/gpt-4.1-nano",
        "maxRequestTokens": 1047576,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0.39999999999999997,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.024999999999999998
    },
    {
        "name": "openai/gpt-4.1-nano-fast",
        "maxRequestTokens": 1047576,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.19999999999999998,
        "outputPricePerMillion": 0.7999999999999999,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.049999999999999996
    },
    {
        "name": "openai/gpt-4o",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 2.5,
        "outputPricePerMillion": 10,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 1.25
    },
    {
        "name": "openai/gpt-4o-fast",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 4.25,
        "outputPricePerMillion": 17,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 2.125
    },
    {
        "name": "openai/gpt-4o-mini",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.15,
        "outputPricePerMillion": 0.6,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.075
    },
    {
        "name": "openai/gpt-4o-mini-fast",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.25,
        "outputPricePerMillion": 1,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.125
    },
    {
        "name": "openai/gpt-4o-mini-transcribe",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 5,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "openai/gpt-4o-transcribe",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 2.5,
        "outputPricePerMillion": 10,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "openai/gpt-5",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 10,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "openai/gpt-5-fast",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 2.5,
        "outputPricePerMillion": 20,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.25
    },
    {
        "name": "openai/gpt-5-codex",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 10,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.13
    },
    {
        "name": "openai/gpt-5-mini",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.25,
        "outputPricePerMillion": 2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.024999999999999998
    },
    {
        "name": "openai/gpt-5-mini-fast",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.44999999999999996,
        "outputPricePerMillion": 3.5999999999999996,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.045
    },
    {
        "name": "openai/gpt-5-nano",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.049999999999999996,
        "outputPricePerMillion": 0.39999999999999997,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.005
    },
    {
        "name": "openai/gpt-5-pro",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 272000,
        "inputPricePerMillion": 15,
        "outputPricePerMillion": 120,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        }
    },
    {
        "name": "openai/gpt-5.1-codex",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 10,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.13
    },
    {
        "name": "openai/gpt-5.1-codex-max",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 10,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "openai/gpt-5.1-codex-mini",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.25,
        "outputPricePerMillion": 2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.03
    },
    {
        "name": "openai/gpt-5.1-thinking",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 10,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "openai/gpt-5.1-thinking-fast",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 2.5,
        "outputPricePerMillion": 20,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.25
    },
    {
        "name": "openai/gpt-5.2",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 1.75,
        "outputPricePerMillion": 14,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.175
    },
    {
        "name": "openai/gpt-5.2-fast",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 3.5,
        "outputPricePerMillion": 28,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.35
    },
    {
        "name": "openai/gpt-5.2-codex",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 1.75,
        "outputPricePerMillion": 14,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.175
    },
    {
        "name": "openai/gpt-5.2-pro",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 21,
        "outputPricePerMillion": 168,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "openai/gpt-5.3-codex",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 1.75,
        "outputPricePerMillion": 14,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.175
    },
    {
        "name": "openai/gpt-5.3-codex-fast",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 3.5,
        "outputPricePerMillion": 28,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.35
    },
    {
        "name": "openai/gpt-5.4",
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 2.5,
        "outputPricePerMillion": 15,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.25
    },
    {
        "name": "openai/gpt-5.4-fast",
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 5,
        "outputPricePerMillion": 30,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.5
    },
    {
        "name": "openai/gpt-5.4-mini",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.75,
        "outputPricePerMillion": 4.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.075
    },
    {
        "name": "openai/gpt-5.4-mini-fast",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 1.5,
        "outputPricePerMillion": 9,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.15
    },
    {
        "name": "openai/gpt-5.4-nano",
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.19999999999999998,
        "outputPricePerMillion": 1.25,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.02
    },
    {
        "name": "openai/gpt-5.4-pro",
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 30,
        "outputPricePerMillion": 180,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "openai/gpt-5.5",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 5,
        "outputPricePerMillion": 30,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.5
    },
    {
        "name": "openai/gpt-5.5-fast",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 12.5,
        "outputPricePerMillion": 75,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 1.25
    },
    {
        "name": "openai/gpt-5.5-pro",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 30,
        "outputPricePerMillion": 180,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "openai/gpt-5.6-luna",
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.19999999999999998,
        "outputPricePerMillion": 1.2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.02
    },
    {
        "name": "openai/gpt-5.6-luna-fast",
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.39999999999999997,
        "outputPricePerMillion": 2.4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.04
    },
    {
        "name": "openai/gpt-5.6-sol",
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 4,
        "outputPricePerMillion": 20,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.39999999999999997
    },
    {
        "name": "openai/gpt-5.6-sol-fast",
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 8,
        "outputPricePerMillion": 40,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.7999999999999999
    },
    {
        "name": "openai/gpt-5.6-terra",
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 2,
        "outputPricePerMillion": 12,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.19999999999999998
    },
    {
        "name": "openai/gpt-5.6-terra-fast",
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 4,
        "outputPricePerMillion": 24,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.39999999999999997
    },
    {
        "name": "openai/gpt-6-astra",
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 10,
        "outputPricePerMillion": 50,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 1
    },
    {
        "name": "openai/gpt-6-astra-fast",
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 20,
        "outputPricePerMillion": 100,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 2
    },
    {
        "name": "openai/gpt-6-luna",
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.01
    },
    {
        "name": "openai/gpt-6-luna-fast",
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.19999999999999998,
        "outputPricePerMillion": 1,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.02
    },
    {
        "name": "openai/gpt-6-sol",
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 2,
        "outputPricePerMillion": 10,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.19999999999999998
    },
    {
        "name": "openai/gpt-6-sol-fast",
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 4,
        "outputPricePerMillion": 20,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.39999999999999997
    },
    {
        "name": "openai/gpt-image-1",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 5,
        "outputPricePerMillion": 40,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true,
                    "editWithMask": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 1.25
    },
    {
        "name": "openai/gpt-image-1-mini",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 2,
        "outputPricePerMillion": 8,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true,
                    "editWithMask": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.19999999999999998
    },
    {
        "name": "openai/gpt-image-1.5",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 5,
        "outputPricePerMillion": 32,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true,
                    "editWithMask": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 1.25
    },
    {
        "name": "openai/gpt-image-2",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 5,
        "outputPricePerMillion": 30,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true,
                    "editWithMask": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 1.25
    },
    {
        "name": "openai/gpt-image-2.5-flare",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 5,
        "outputPricePerMillion": 30,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true,
                    "editWithMask": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 1.25
    },
    {
        "name": "openai/gpt-image-2.5-sunburst",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 5,
        "outputPricePerMillion": 30,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true,
                    "editWithMask": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 1.25
    },
    {
        "name": "openai/gpt-live-1",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "openai/gpt-oss-120b",
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.09999999999999999
    },
    {
        "name": "openai/gpt-oss-20b",
        "maxRequestTokens": 131072,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.03,
        "outputPricePerMillion": 0.14,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "openai/gpt-oss-safeguard-120b",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16000,
        "inputPricePerMillion": 0.15,
        "outputPricePerMillion": 0.6,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "openai/gpt-oss-safeguard-20b",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16000,
        "inputPricePerMillion": 0.07,
        "outputPricePerMillion": 0.19999999999999998,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "openai/gpt-realtime-1.5",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 4,
        "outputPricePerMillion": 16,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "audio": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.39999999999999997
    },
    {
        "name": "openai/gpt-realtime-2",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 4,
        "outputPricePerMillion": 24,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "audio": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.39999999999999997
    },
    {
        "name": "openai/gpt-realtime-2.1",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 4,
        "outputPricePerMillion": 24,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "audio": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "inputCachedPricePerMillion": 0.39999999999999997
    },
    {
        "name": "openai/gpt-realtime-mini",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.6,
        "outputPricePerMillion": 2.4,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "audio": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
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
        "name": "openai/gpt-realtime-whisper",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.0002,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "audio": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "openai/o1",
        "maxRequestTokens": 200000,
        "maxResponseTokens": 100000,
        "inputPricePerMillion": 15,
        "outputPricePerMillion": 60,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 7.5
    },
    {
        "name": "openai/o3",
        "maxRequestTokens": 200000,
        "maxResponseTokens": 100000,
        "inputPricePerMillion": 2,
        "outputPricePerMillion": 8,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.5
    },
    {
        "name": "openai/o3-fast",
        "maxRequestTokens": 200000,
        "maxResponseTokens": 100000,
        "inputPricePerMillion": 3.5,
        "outputPricePerMillion": 14,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.875
    },
    {
        "name": "openai/o3-mini",
        "maxRequestTokens": 200000,
        "maxResponseTokens": 100000,
        "inputPricePerMillion": 1.1,
        "outputPricePerMillion": 4.4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.55
    },
    {
        "name": "openai/o3-pro",
        "maxRequestTokens": 200000,
        "maxResponseTokens": 100000,
        "inputPricePerMillion": 20,
        "outputPricePerMillion": 80,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "openai/o4-mini",
        "maxRequestTokens": 200000,
        "maxResponseTokens": 100000,
        "inputPricePerMillion": 1.1,
        "outputPricePerMillion": 4.4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.275
    },
    {
        "name": "openai/o4-mini-fast",
        "maxRequestTokens": 200000,
        "maxResponseTokens": 100000,
        "inputPricePerMillion": 2,
        "outputPricePerMillion": 8,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.5
    },
    {
        "name": "openai/text-embedding-3-large",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.13,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "openai/text-embedding-3-small",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.02,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "openai/text-embedding-ada-002",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "openai/tts-1",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 15,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "openai/tts-1-hd",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 30,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "openai/whisper-1",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.0001,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "perplexity/pplx-embed-v1-0.6b",
        "maxRequestTokens": 32000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.004,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "perplexity/pplx-embed-v1-4b",
        "maxRequestTokens": 32000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.03,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "perplexity/sonar",
        "maxRequestTokens": 127000,
        "maxResponseTokens": 8000,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "parallelToolCalls": false,
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
        "name": "perplexity/sonar-pro",
        "maxRequestTokens": 200000,
        "maxResponseTokens": 8000,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "parallelToolCalls": false,
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
        "name": "perplexity/sonar-reasoning-pro",
        "maxRequestTokens": 127000,
        "maxResponseTokens": 8000,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "parallelToolCalls": false,
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
        "name": "poolside/laguna-s-2.1",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0.19999999999999998,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.01
    },
    {
        "name": "poolside/laguna-s-2.1-free",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "prodia/flux-fast-schnell",
        "maxRequestTokens": 512,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
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
        "name": "quiverai/arrow-1.1",
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
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
        "name": "quiverai/arrow-2",
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 4,
        "outputPricePerMillion": 20,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.39999999999999997
    },
    {
        "name": "quiverai/arrow-2-telos",
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 6,
        "outputPricePerMillion": 30,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.6
    },
    {
        "name": "recraft/recraft-v2",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "imagePricePerImage": 0.022
    },
    {
        "name": "recraft/recraft-v3",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "imagePricePerImage": 0.04
    },
    {
        "name": "recraft/recraft-v4",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "imagePricePerImage": 0.04
    },
    {
        "name": "recraft/recraft-v4-pro",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "imagePricePerImage": 0.25
    },
    {
        "name": "recraft/recraft-v4.1",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "imagePricePerImage": 0.035
    },
    {
        "name": "recraft/recraft-v4.1-flash",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "imagePricePerImage": 0.007
    },
    {
        "name": "recraft/recraft-v4.1-pro",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "imagePricePerImage": 0.21
    },
    {
        "name": "recraft/recraft-v4.1-utility",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "imagePricePerImage": 0.035
    },
    {
        "name": "recraft/recraft-v4.1-utility-pro",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "imagePricePerImage": 0.21
    },
    {
        "name": "sakana/fugu-max",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 1000000,
        "inputPricePerMillion": 2,
        "outputPricePerMillion": 6,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.25
    },
    {
        "name": "sakana/fugu-ultra",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 1000000,
        "inputPricePerMillion": 5,
        "outputPricePerMillion": 30,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.5
    },
    {
        "name": "sakana/fugu-ultra-v2",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 1000000,
        "inputPricePerMillion": 5,
        "outputPricePerMillion": 30,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.5
    },
    {
        "name": "sakana/namazu",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 256000,
        "inputPricePerMillion": 0.95,
        "outputPricePerMillion": 4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.15
    },
    {
        "name": "stepfun/step-3.5-flash",
        "maxRequestTokens": 262114,
        "maxResponseTokens": 262114,
        "inputPricePerMillion": 0.09,
        "outputPricePerMillion": 0.3,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.02
    },
    {
        "name": "stepfun/step-3.7-flash",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 256000,
        "inputPricePerMillion": 0.19999999999999998,
        "outputPricePerMillion": 1.15,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.04
    },
    {
        "name": "stepfun/step-5-preview",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 1000000,
        "inputPricePerMillion": 1,
        "outputPricePerMillion": 2.7,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.049999999999999996
    },
    {
        "name": "tencent/hy-mt2-lite",
        "maxRequestTokens": 8000,
        "maxResponseTokens": 4000,
        "inputPricePerMillion": 0.044,
        "outputPricePerMillion": 0.17700000000000002,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "parallelToolCalls": false,
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
        "name": "tencent/hy-mt2-plus",
        "maxRequestTokens": 8000,
        "maxResponseTokens": 4000,
        "inputPricePerMillion": 0.074,
        "outputPricePerMillion": 0.295,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "parallelToolCalls": false,
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
        "name": "tencent/hy-mt2-pro",
        "maxRequestTokens": 8000,
        "maxResponseTokens": 4000,
        "inputPricePerMillion": 0.074,
        "outputPricePerMillion": 0.295,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
            "parallelToolCalls": false,
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
        "name": "tencent/hy3",
        "maxRequestTokens": 262144,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.14,
        "outputPricePerMillion": 0.58,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "tencent/hy4-preview",
        "maxRequestTokens": 1024000,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 0.834,
        "outputPricePerMillion": 2.501,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.041999999999999996
    },
    {
        "name": "thinkingmachines/inkling",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 256000,
        "inputPricePerMillion": 1,
        "outputPricePerMillion": 4.05,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.16999999999999998
    },
    {
        "name": "thinkingmachines/inkling-small",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 1000000,
        "inputPricePerMillion": 0.5,
        "outputPricePerMillion": 1.2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.09999999999999999
    },
    {
        "name": "typesafe-ai/jev",
        "maxRequestTokens": 32000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.041999999999999996,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "evaluation": {
                "questionTypes": [
                    "boolean",
                    "choice",
                    "score"
                ]
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
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "voyage/rerank-2.5",
        "maxRequestTokens": 32000,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 0.049999999999999996,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "reranking": {
                "documentTypes": [
                    "text"
                ]
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
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "rerankPricing": {
            "unit": "token",
            "price": 0.049999999999999996,
            "per": 1000000
        }
    },
    {
        "name": "voyage/rerank-2.5-lite",
        "maxRequestTokens": 32000,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 0.02,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "reranking": {
                "documentTypes": [
                    "text"
                ]
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
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "rerankPricing": {
            "unit": "token",
            "price": 0.02,
            "per": 1000000
        }
    },
    {
        "name": "voyage/voyage-3-large",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.18,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "voyage/voyage-3.5",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.06,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "voyage/voyage-3.5-lite",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.02,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "voyage/voyage-4",
        "maxRequestTokens": 32000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.06,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "voyage/voyage-4-large",
        "maxRequestTokens": 32000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.12,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "voyage/voyage-4-lite",
        "maxRequestTokens": 32000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.02,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "voyage/voyage-code-2",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.12,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "voyage/voyage-code-3",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.18,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "voyage/voyage-finance-2",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.12,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "voyage/voyage-law-2",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.12,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "embeddings": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "spacexai/grok-4.1-fast-non-reasoning",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 1000000,
        "inputPricePerMillion": 0.19999999999999998,
        "outputPricePerMillion": 0.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.049999999999999996
    },
    {
        "name": "spacexai/grok-4.1-fast-reasoning",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 1000000,
        "inputPricePerMillion": 0.19999999999999998,
        "outputPricePerMillion": 0.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.049999999999999996
    },
    {
        "name": "spacexai/grok-4.20-multi-agent",
        "maxRequestTokens": 2000000,
        "maxResponseTokens": 2000000,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 2.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.19999999999999998
    },
    {
        "name": "spacexai/grok-4.20-multi-agent-beta",
        "maxRequestTokens": 2000000,
        "maxResponseTokens": 2000000,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 2.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.19999999999999998
    },
    {
        "name": "spacexai/grok-4.20-non-reasoning",
        "maxRequestTokens": 2000000,
        "maxResponseTokens": 2000000,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 2.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.19999999999999998
    },
    {
        "name": "spacexai/grok-4.20-non-reasoning-beta",
        "maxRequestTokens": 2000000,
        "maxResponseTokens": 2000000,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 2.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.19999999999999998
    },
    {
        "name": "spacexai/grok-4.20-reasoning",
        "maxRequestTokens": 2000000,
        "maxResponseTokens": 2000000,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 2.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.19999999999999998
    },
    {
        "name": "spacexai/grok-4.20-reasoning-beta",
        "maxRequestTokens": 2000000,
        "maxResponseTokens": 2000000,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 2.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.19999999999999998
    },
    {
        "name": "spacexai/grok-4.3",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 1000000,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 2.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.19999999999999998
    },
    {
        "name": "spacexai/grok-4.5",
        "maxRequestTokens": 500000,
        "maxResponseTokens": 500000,
        "inputPricePerMillion": 2,
        "outputPricePerMillion": 6,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "spacexai/grok-4.6",
        "maxRequestTokens": 500000,
        "maxResponseTokens": 500000,
        "inputPricePerMillion": 2,
        "outputPricePerMillion": 6,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.5
    },
    {
        "name": "spacexai/grok-4.7",
        "maxRequestTokens": 500000,
        "maxResponseTokens": 500000,
        "inputPricePerMillion": 1.2,
        "outputPricePerMillion": 3.5999999999999996,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "spacexai/grok-build-0.1",
        "maxRequestTokens": 256000,
        "maxResponseTokens": 256000,
        "inputPricePerMillion": 1,
        "outputPricePerMillion": 2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.19999999999999998
    },
    {
        "name": "spacexai/grok-imagine-image",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "imagePricePerImage": 0.02
    },
    {
        "name": "spacexai/grok-imagine-image-2.0",
        "maxRequestTokens": 1,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": false,
                "image": {
                    "generate": true,
                    "edit": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        },
        "imagePricePerImage": 0.06
    },
    {
        "name": "spacexai/grok-imagine-video",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "spacexai/grok-imagine-video-1.5",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false,
                "video": true
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "spacexai/grok-stt",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "spacexai/grok-tts",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 15,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "spacexai/grok-voice-think-fast-1.0",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "audio": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "spacexai/grok-voice-think-fast-2.0",
        "maxRequestTokens": 0,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
        "capabilities": {
            "streaming": false,
            "toolCalls": false,
            "reasoning": false,
            "audio": true,
            "input": {
                "text": true
            },
            "output": {
                "text": false
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "xiaomi/mimo-v2.5",
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 131100,
        "inputPricePerMillion": 0.14,
        "outputPricePerMillion": 0.28,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.0028
    },
    {
        "name": "xiaomi/mimo-v2.5-pro",
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 131000,
        "inputPricePerMillion": 0.435,
        "outputPricePerMillion": 0.87,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.0036
    },
    {
        "name": "xiaomi/mimo-v2.6-flash",
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.14,
        "outputPricePerMillion": 0.28,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.0028
    },
    {
        "name": "xiaomi/mimo-v2.6-pro",
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.435,
        "outputPricePerMillion": 0.87,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.0036
    },
    {
        "name": "xiaomi/mimo-v2.6-pro-ultraspeed",
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 4.35,
        "outputPricePerMillion": 8.7,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.036
    },
    {
        "name": "zai/glm-4.5",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 96000,
        "inputPricePerMillion": 0.6,
        "outputPricePerMillion": 2.2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "zai/glm-4.5-air",
        "maxRequestTokens": 128000,
        "maxResponseTokens": 96000,
        "inputPricePerMillion": 0.19999999999999998,
        "outputPricePerMillion": 1.1,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.03
    },
    {
        "name": "zai/glm-4.5v",
        "maxRequestTokens": 66000,
        "maxResponseTokens": 16000,
        "inputPricePerMillion": 0.6,
        "outputPricePerMillion": 1.7999999999999998,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.11
    },
    {
        "name": "zai/glm-4.6",
        "maxRequestTokens": 200000,
        "maxResponseTokens": 96000,
        "inputPricePerMillion": 0.6,
        "outputPricePerMillion": 2.2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "zai/glm-4.7",
        "maxRequestTokens": 200000,
        "maxResponseTokens": 120000,
        "inputPricePerMillion": 0.6,
        "outputPricePerMillion": 2.2,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.12
    },
    {
        "name": "zai/glm-4.7-flash",
        "maxRequestTokens": 200000,
        "maxResponseTokens": 131000,
        "inputPricePerMillion": 0.07,
        "outputPricePerMillion": 0.39999999999999997,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "zai/glm-4.7-flashx",
        "maxRequestTokens": 200000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.06,
        "outputPricePerMillion": 0.39999999999999997,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.01
    },
    {
        "name": "zai/glm-5",
        "maxRequestTokens": 202800,
        "maxResponseTokens": 131100,
        "inputPricePerMillion": 1,
        "outputPricePerMillion": 3.1999999999999997,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "zai/glm-5-turbo",
        "maxRequestTokens": 202800,
        "maxResponseTokens": 131100,
        "inputPricePerMillion": 1.2,
        "outputPricePerMillion": 4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.24
    },
    {
        "name": "zai/glm-5.1",
        "maxRequestTokens": 202800,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 1.4,
        "outputPricePerMillion": 4.4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "zai/glm-5.2",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.7999999999999999,
        "outputPricePerMillion": 2.5500000000000003,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "name": "zai/glm-5.2-fast",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 2.0999999999999996,
        "outputPricePerMillion": 6.6000000000000005,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.21
    },
    {
        "name": "zai/glm-5.3",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 1000000,
        "inputPricePerMillion": 1.4,
        "outputPricePerMillion": 4.4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.14
    },
    {
        "name": "zai/glm-5.3-fast",
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 2.0999999999999996,
        "outputPricePerMillion": 6.6000000000000005,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.21
    },
    {
        "name": "zai/glm-5.3-flash",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 131000,
        "inputPricePerMillion": 0.15,
        "outputPricePerMillion": 0.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.03
    },
    {
        "name": "zai/glm-5.3-flashx",
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.37,
        "outputPricePerMillion": 1.25,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.075
    },
    {
        "name": "zai/glm-5v-turbo",
        "maxRequestTokens": 200000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 1.2,
        "outputPricePerMillion": 4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
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
        "inputCachedPricePerMillion": 0.24
    }
];
