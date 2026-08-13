import type { ModelInfo } from '../../interfaces/UniversalInterfaces.ts';

/**
 * Automatically generated model list from OpenRouter API.
 * This file is managed by the scripts/fetch-openrouter-models.ts script.
 * Last updated: 2026-08-13T13:05:04.502Z
 */
export const defaultModels: ModelInfo[] = [
    {
        "name": "bytedance-seed/seed-2-1-turbo",
        "canonicalSlug": "bytedance-seed/seed-2-1-turbo-20260810",
        "isUncensored": true,
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
                        "text",
                        "json"
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
        "name": "qwen/qwen3.8-2.4t-a95b",
        "canonicalSlug": "qwen/qwen3.8-2.4t-a95b-20260812",
        "isUncensored": true,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 2,
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
        }
    },
    {
        "name": "bytedance-seed/seed-2.0-code",
        "canonicalSlug": "bytedance-seed/seed-2.0-code-20260730",
        "isUncensored": true,
        "maxRequestTokens": 262144,
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
        }
    },
    {
        "name": "deepseek/deepseek-v4-pro-0813",
        "canonicalSlug": "deepseek/deepseek-v4-pro-20260813",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 384000,
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
        "name": "x-ai/grok-4.6",
        "canonicalSlug": "x-ai/grok-4.6-20260810",
        "isUncensored": true,
        "maxRequestTokens": 500000,
        "maxResponseTokens": 0,
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
        }
    },
    {
        "name": "liquid/lfm-2.5-2.6b:free",
        "canonicalSlug": "liquid/lfm-2.5-2.6b-20260811",
        "isUncensored": true,
        "maxRequestTokens": 128000,
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
                        "text",
                        "json"
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
        "name": "nvidia/nemotron-3.5-lightning",
        "canonicalSlug": "nvidia/nemotron-3.5-lightning-20260807",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0.25,
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
        "name": "nvidia/nemotron-3.5-lightning:free",
        "canonicalSlug": "nvidia/nemotron-3.5-lightning-20260807",
        "isUncensored": true,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65536,
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
        "name": "sakana/sakana-namazu",
        "canonicalSlug": "sakana/namazu-20260811",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 65536,
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
                        "text"
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
        "name": "upstage/solar-pro4",
        "canonicalSlug": "upstage/solar-pro4-20260810",
        "isUncensored": true,
        "maxRequestTokens": 524288,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.03,
        "outputPricePerMillion": 0.12,
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
        "name": "meta/muse-glimmer-30b",
        "canonicalSlug": "meta/muse-glimmer-30b-20260810",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
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
        }
    },
    {
        "name": "meta/muse-spark-1.2",
        "canonicalSlug": "meta/muse-spark-1.2-20260805",
        "isUncensored": false,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 0,
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
        }
    },
    {
        "name": "qwen/qwen3.8-max",
        "canonicalSlug": "qwen/qwen3.8-max-20260803",
        "isUncensored": true,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 131072,
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
        }
    },
    {
        "name": "~deepseek/deepseek-v4-flash-latest",
        "canonicalSlug": "~deepseek/deepseek-v4-flash-latest",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.079996,
        "outputPricePerMillion": 0.252,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": true,
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
        "name": "deepseek/deepseek-v4-flash-0731",
        "canonicalSlug": "deepseek/deepseek-v4-flash-20260731",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 384000,
        "inputPricePerMillion": 0.08,
        "outputPricePerMillion": 0.18,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": true,
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
        "name": "thinkingmachines/inkling-small",
        "canonicalSlug": "thinkingmachines/inkling-small-20260730",
        "isUncensored": true,
        "maxRequestTokens": 524288,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.44999999999999996,
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
                        "text"
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
        "name": "qwen/qwen3.7-flash",
        "canonicalSlug": "qwen/qwen3.7-flash-20260727",
        "isUncensored": true,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65536,
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
        "name": "anthropic/claude-opus-5-fast",
        "canonicalSlug": "anthropic/claude-opus-5-fast-20260723",
        "isUncensored": false,
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
        }
    },
    {
        "name": "anthropic/claude-opus-5",
        "canonicalSlug": "anthropic/claude-opus-5-20260723",
        "isUncensored": false,
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
        }
    },
    {
        "name": "anthropic/claude-opus-5:batch",
        "canonicalSlug": "anthropic/claude-opus-5-20260723",
        "isUncensored": false,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 2.5,
        "outputPricePerMillion": 12.5,
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
        "name": "inclusionai/ling-3.0-flash",
        "canonicalSlug": "inclusionai/ling-3.0-flash-20260723",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 32768,
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
        }
    },
    {
        "name": "poolside/laguna-s-2.1",
        "canonicalSlug": "poolside/laguna-s-2.1-20260720",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.09,
        "outputPricePerMillion": 0.18,
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
        "name": "poolside/laguna-s-2.1:free",
        "canonicalSlug": "poolside/laguna-s-2.1-20260720",
        "isUncensored": true,
        "maxRequestTokens": 262144,
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
        "name": "google/gemini-3.6-flash",
        "canonicalSlug": "google/gemini-3.6-flash-20260721",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65536,
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
        }
    },
    {
        "name": "google/gemini-3.6-flash:batch",
        "canonicalSlug": "google/gemini-3.6-flash-20260721",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65536,
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
        }
    },
    {
        "name": "google/gemini-3.5-flash-lite",
        "canonicalSlug": "google/gemini-3.5-flash-lite-20260721",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65536,
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
        }
    },
    {
        "name": "google/gemini-3.5-flash-lite:batch",
        "canonicalSlug": "google/gemini-3.5-flash-lite-20260721",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.15,
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
        }
    },
    {
        "name": "meituan/longcat-2.0",
        "canonicalSlug": "meituan/longcat-2.0-20260720",
        "isUncensored": true,
        "maxRequestTokens": 1048756,
        "maxResponseTokens": 262144,
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
        "name": "thinkingmachines/inkling",
        "canonicalSlug": "thinkingmachines/inkling-20260715",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.95,
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
        "name": "thinkingmachines/inkling:batch",
        "canonicalSlug": "thinkingmachines/inkling-20260715",
        "isUncensored": true,
        "maxRequestTokens": 524288,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.5,
        "outputPricePerMillion": 2.025,
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
        "name": "openrouter/auto-beta",
        "canonicalSlug": "openrouter/auto-beta",
        "isUncensored": true,
        "maxRequestTokens": 2000000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": -1000000,
        "outputPricePerMillion": -1000000,
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
        "name": "moonshotai/kimi-k3",
        "canonicalSlug": "moonshotai/kimi-k3-20260715",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 0,
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
        }
    },
    {
        "name": "meta/muse-spark-1.1",
        "canonicalSlug": "meta/muse-spark-1.1-20260709",
        "isUncensored": false,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 0,
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
        }
    },
    {
        "name": "kwaipilot/kat-coder-air-v2.5",
        "canonicalSlug": "kwaipilot/kat-coder-air-v2.5-20260710",
        "isUncensored": true,
        "maxRequestTokens": 256000,
        "maxResponseTokens": 80000,
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
        "name": "kwaipilot/kat-coder-pro-v2.5",
        "canonicalSlug": "kwaipilot/kat-coder-pro-v2.5-20260710",
        "isUncensored": true,
        "maxRequestTokens": 256000,
        "maxResponseTokens": 80000,
        "inputPricePerMillion": 0.74,
        "outputPricePerMillion": 2.96,
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
        "name": "openai/gpt-5.6-luna-pro",
        "canonicalSlug": "openai/gpt-5.6-luna-pro-20260709",
        "isUncensored": false,
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.09999999999999999,
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
        "name": "openai/gpt-5.6-luna-pro:batch",
        "canonicalSlug": "openai/gpt-5.6-luna-pro-20260709",
        "isUncensored": false,
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.09999999999999999,
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
        "name": "openai/gpt-5.6-luna",
        "canonicalSlug": "openai/gpt-5.6-luna-20260709",
        "isUncensored": false,
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.09999999999999999,
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
        "name": "openai/gpt-5.6-luna:batch",
        "canonicalSlug": "openai/gpt-5.6-luna-20260709",
        "isUncensored": false,
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.09999999999999999,
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
        "name": "openai/gpt-5.6-terra-pro",
        "canonicalSlug": "openai/gpt-5.6-terra-pro-20260709",
        "isUncensored": false,
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 1,
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
        }
    },
    {
        "name": "openai/gpt-5.6-terra-pro:batch",
        "canonicalSlug": "openai/gpt-5.6-terra-pro-20260709",
        "isUncensored": false,
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 1,
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
        }
    },
    {
        "name": "openai/gpt-5.6-terra",
        "canonicalSlug": "openai/gpt-5.6-terra-20260709",
        "isUncensored": false,
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 1,
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
        }
    },
    {
        "name": "openai/gpt-5.6-terra:batch",
        "canonicalSlug": "openai/gpt-5.6-terra-20260709",
        "isUncensored": false,
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 1,
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
        }
    },
    {
        "name": "openai/gpt-5.6-sol-pro",
        "canonicalSlug": "openai/gpt-5.6-sol-pro-20260709",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/gpt-5.6-sol-pro:batch",
        "canonicalSlug": "openai/gpt-5.6-sol-pro-20260709",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/gpt-5.6-sol",
        "canonicalSlug": "openai/gpt-5.6-sol-20260709",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/gpt-5.6-sol:batch",
        "canonicalSlug": "openai/gpt-5.6-sol-20260709",
        "isUncensored": false,
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
        }
    },
    {
        "name": "x-ai/grok-4.5",
        "canonicalSlug": "x-ai/grok-4.5-20260708",
        "isUncensored": true,
        "maxRequestTokens": 500000,
        "maxResponseTokens": 0,
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
        }
    },
    {
        "name": "~x-ai/grok-latest",
        "canonicalSlug": "~x-ai/grok-latest",
        "isUncensored": true,
        "maxRequestTokens": 500000,
        "maxResponseTokens": 0,
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
        }
    },
    {
        "name": "aion-labs/aion-3.0-mini",
        "canonicalSlug": "aion-labs/aion-3.0-mini-20260707",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.7,
        "outputPricePerMillion": 1.4,
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
        "name": "aion-labs/aion-3.0",
        "canonicalSlug": "aion-labs/aion-3.0-20260707",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 3,
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
        "name": "tencent/hy3",
        "canonicalSlug": "tencent/hy3-20260706",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.13199999999999998,
        "outputPricePerMillion": 0.5279999999999999,
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
        "name": "poolside/laguna-xs-2.1",
        "canonicalSlug": "poolside/laguna-xs-2.1-20260625",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.06,
        "outputPricePerMillion": 0.12,
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
        "name": "poolside/laguna-xs-2.1:free",
        "canonicalSlug": "poolside/laguna-xs-2.1-20260625",
        "isUncensored": true,
        "maxRequestTokens": 262144,
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
        "name": "anthropic/claude-sonnet-5",
        "canonicalSlug": "anthropic/claude-sonnet-5-20260630",
        "isUncensored": false,
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
        }
    },
    {
        "name": "anthropic/claude-sonnet-5:batch",
        "canonicalSlug": "anthropic/claude-sonnet-5-20260630",
        "isUncensored": false,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
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
        }
    },
    {
        "name": "google/gemini-3.1-flash-lite-image",
        "canonicalSlug": "google/gemini-3.1-flash-lite-image-20260630",
        "isUncensored": true,
        "maxRequestTokens": 65536,
        "maxResponseTokens": 65536,
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
                        "text",
                        "json"
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
        "name": "nex-agi/nex-n2-mini",
        "canonicalSlug": "nex-agi/nex-n2-mini",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.024999999999999998,
        "outputPricePerMillion": 0.09999999999999999,
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
        "name": "sakana/fugu-ultra",
        "canonicalSlug": "sakana/fugu-ultra-20260615",
        "isUncensored": true,
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
                        "text"
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
        "name": "google/gemini-3.1-flash-image",
        "canonicalSlug": "google/gemini-3.1-flash-image-20260528",
        "isUncensored": true,
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
        }
    },
    {
        "name": "google/gemini-3-pro-image",
        "canonicalSlug": "google/gemini-3-pro-image-20260528",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 32768,
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
        }
    },
    {
        "name": "cohere/north-mini-code:free",
        "canonicalSlug": "cohere/north-mini-code-20260617",
        "isUncensored": false,
        "maxRequestTokens": 256000,
        "maxResponseTokens": 64000,
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
        "name": "z-ai/glm-5.2",
        "canonicalSlug": "z-ai/glm-5.2-20260616",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.63,
        "outputPricePerMillion": 1.9800000000000002,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": true,
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
        "name": "z-ai/glm-5.2:batch",
        "canonicalSlug": "z-ai/glm-5.2-20260616",
        "isUncensored": true,
        "maxRequestTokens": 512000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.7,
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
        }
    },
    {
        "name": "openrouter/fusion",
        "canonicalSlug": "openrouter/fusion",
        "isUncensored": true,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": -1000000,
        "outputPricePerMillion": -1000000,
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
        "name": "moonshotai/kimi-k2.7-code",
        "canonicalSlug": "moonshotai/kimi-k2.7-code-20260612",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.67,
        "outputPricePerMillion": 3.4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": true,
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
        "name": "moonshotai/kimi-k2.7-code:batch",
        "canonicalSlug": "moonshotai/kimi-k2.7-code-20260612",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.475,
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
        }
    },
    {
        "name": "~anthropic/claude-fable-latest",
        "canonicalSlug": "~anthropic/claude-fable-latest",
        "isUncensored": false,
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
        }
    },
    {
        "name": "anthropic/claude-fable-5",
        "canonicalSlug": "anthropic/claude-5-fable-20260609",
        "isUncensored": false,
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
        }
    },
    {
        "name": "anthropic/claude-fable-5:batch",
        "canonicalSlug": "anthropic/claude-5-fable-20260609",
        "isUncensored": false,
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
        }
    },
    {
        "name": "nex-agi/nex-n2-pro",
        "canonicalSlug": "nex-agi/nex-n2-pro",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.25,
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
        "name": "nvidia/nemotron-3.5-content-safety:free",
        "canonicalSlug": "nvidia/nemotron-3.5-content-safety-20260604",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 8192,
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
        "name": "nvidia/nemotron-3-ultra-550b-a55b",
        "canonicalSlug": "nvidia/nemotron-3-ultra-550b-a55b-20260604",
        "isUncensored": true,
        "maxRequestTokens": 512288,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.6,
        "outputPricePerMillion": 3.5999999999999996,
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
        "name": "nvidia/nemotron-3-ultra-550b-a55b:batch",
        "canonicalSlug": "nvidia/nemotron-3-ultra-550b-a55b-20260604",
        "isUncensored": true,
        "maxRequestTokens": 512288,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.3,
        "outputPricePerMillion": 1.7999999999999998,
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
        "name": "nvidia/nemotron-3-ultra-550b-a55b:free",
        "canonicalSlug": "nvidia/nemotron-3-ultra-550b-a55b-20260604",
        "isUncensored": true,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65536,
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
        "name": "qwen/qwen3.7-plus",
        "canonicalSlug": "qwen/qwen3.7-plus-20260602",
        "isUncensored": true,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.32,
        "outputPricePerMillion": 1.28,
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
        "name": "minimax/minimax-m3",
        "canonicalSlug": "minimax/minimax-m3-20260531",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
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
        }
    },
    {
        "name": "minimax/minimax-m3:batch",
        "canonicalSlug": "minimax/minimax-m3-20260531",
        "isUncensored": true,
        "maxRequestTokens": 524288,
        "maxResponseTokens": 0,
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
        }
    },
    {
        "name": "stepfun/step-3.7-flash",
        "canonicalSlug": "stepfun/step-3.7-flash-20260528",
        "isUncensored": true,
        "maxRequestTokens": 262144,
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
        }
    },
    {
        "name": "anthropic/claude-opus-4.8-fast",
        "canonicalSlug": "anthropic/claude-4.8-opus-fast-20260528",
        "isUncensored": false,
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
        }
    },
    {
        "name": "anthropic/claude-opus-4.8",
        "canonicalSlug": "anthropic/claude-4.8-opus-20260528",
        "isUncensored": false,
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
        }
    },
    {
        "name": "anthropic/claude-opus-4.8:batch",
        "canonicalSlug": "anthropic/claude-4.8-opus-20260528",
        "isUncensored": false,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 2.5,
        "outputPricePerMillion": 12.5,
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
        "name": "qwen/qwen3.7-max",
        "canonicalSlug": "qwen/qwen3.7-max-20260520",
        "isUncensored": true,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 1.475,
        "outputPricePerMillion": 4.425,
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
        "name": "x-ai/grok-build-0.1",
        "canonicalSlug": "x-ai/grok-build-0.1-20260520",
        "isUncensored": true,
        "maxRequestTokens": 256000,
        "maxResponseTokens": 0,
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
        }
    },
    {
        "name": "google/gemini-3.5-flash",
        "canonicalSlug": "google/gemini-3.5-flash-20260519",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65536,
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
        }
    },
    {
        "name": "google/gemini-3.5-flash:batch",
        "canonicalSlug": "google/gemini-3.5-flash-20260519",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65536,
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
        }
    },
    {
        "name": "anthropic/claude-opus-4.7-fast",
        "canonicalSlug": "anthropic/claude-4.7-opus-fast-20260512",
        "isUncensored": false,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 30,
        "outputPricePerMillion": 150,
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
        "name": "perceptron/perceptron-mk1",
        "canonicalSlug": "perceptron/perceptron-mk1-20260512",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.15,
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
        "name": "inclusionai/ring-2.6-1t",
        "canonicalSlug": "inclusionai/ring-2.6-1t-20260508",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.075,
        "outputPricePerMillion": 0.625,
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
        "name": "google/gemini-3.1-flash-lite",
        "canonicalSlug": "google/gemini-3.1-flash-lite-20260507",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65536,
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
        }
    },
    {
        "name": "google/gemini-3.1-flash-lite:batch",
        "canonicalSlug": "google/gemini-3.1-flash-lite-20260507",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.125,
        "outputPricePerMillion": 0.75,
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
        "name": "openai/gpt-chat-latest",
        "canonicalSlug": "openai/gpt-chat-latest-20260505",
        "isUncensored": false,
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 5,
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
                        "text",
                        "json"
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
        "name": "x-ai/grok-4.3",
        "canonicalSlug": "x-ai/grok-4.3-20260430",
        "isUncensored": true,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 0,
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
        }
    },
    {
        "name": "ibm-granite/granite-4.1-8b",
        "canonicalSlug": "ibm-granite/granite-4.1-8b-20260429",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.049999999999999996,
        "outputPricePerMillion": 0.09999999999999999,
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
        "name": "mistralai/mistral-medium-3-5",
        "canonicalSlug": "mistralai/mistral-medium-3.5-20260430",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 0,
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
        }
    },
    {
        "name": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        "canonicalSlug": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning-20260428",
        "isUncensored": true,
        "maxRequestTokens": 256000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
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
        "name": "~anthropic/claude-haiku-latest",
        "canonicalSlug": "~anthropic/claude-haiku-latest",
        "isUncensored": true,
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
        }
    },
    {
        "name": "~openai/gpt-mini-latest",
        "canonicalSlug": "~openai/gpt-mini-latest",
        "isUncensored": false,
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
        }
    },
    {
        "name": "~google/gemini-pro-latest",
        "canonicalSlug": "~google/gemini-pro-latest",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65536,
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
        }
    },
    {
        "name": "~moonshotai/kimi-latest",
        "canonicalSlug": "~moonshotai/kimi-latest",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 1048576,
        "inputPricePerMillion": 2.8,
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
        }
    },
    {
        "name": "~google/gemini-flash-latest",
        "canonicalSlug": "~google/gemini-flash-latest",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65536,
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
        }
    },
    {
        "name": "~anthropic/claude-sonnet-latest",
        "canonicalSlug": "~anthropic/claude-sonnet-latest",
        "isUncensored": false,
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
        }
    },
    {
        "name": "~openai/gpt-latest",
        "canonicalSlug": "~openai/gpt-latest",
        "isUncensored": false,
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
        }
    },
    {
        "name": "qwen/qwen3.5-plus-20260420",
        "canonicalSlug": "qwen/qwen3.5-plus-20260420",
        "isUncensored": true,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.3,
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
        }
    },
    {
        "name": "qwen/qwen3.6-flash",
        "canonicalSlug": "qwen/qwen3.6-flash",
        "isUncensored": true,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.1875,
        "outputPricePerMillion": 1.125,
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
        "name": "qwen/qwen3.6-35b-a3b",
        "canonicalSlug": "qwen/qwen3.6-35b-a3b-20260415",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.15,
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
        }
    },
    {
        "name": "qwen/qwen3.6-max-preview",
        "canonicalSlug": "qwen/qwen3.6-max-preview-20260420",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 1.0270000000000001,
        "outputPricePerMillion": 6.162,
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
        "name": "qwen/qwen3.6-27b",
        "canonicalSlug": "qwen/qwen3.6-27b-20260422",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 262144,
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
                        "text",
                        "json"
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
        "name": "openai/gpt-5.5-pro",
        "canonicalSlug": "openai/gpt-5.5-pro-20260423",
        "isUncensored": false,
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
        "name": "openai/gpt-5.5-pro:batch",
        "canonicalSlug": "openai/gpt-5.5-pro-20260423",
        "isUncensored": false,
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 15,
        "outputPricePerMillion": 90,
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
        "canonicalSlug": "openai/gpt-5.5-20260423",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/gpt-5.5:batch",
        "canonicalSlug": "openai/gpt-5.5-20260423",
        "isUncensored": false,
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
        }
    },
    {
        "name": "deepseek/deepseek-v4-pro",
        "canonicalSlug": "deepseek/deepseek-v4-pro-20260423",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 393216,
        "inputPricePerMillion": 1.1680000000000001,
        "outputPricePerMillion": 2.3360000000000003,
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
        "name": "deepseek/deepseek-v4-flash",
        "canonicalSlug": "deepseek/deepseek-v4-flash-20260423",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 393216,
        "inputPricePerMillion": 0.14,
        "outputPricePerMillion": 0.28,
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
        "name": "inclusionai/ling-2.6-1t",
        "canonicalSlug": "inclusionai/ling-2.6-1t-20260423",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.075,
        "outputPricePerMillion": 0.625,
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
        "name": "tencent/hy3-preview",
        "canonicalSlug": "tencent/hy3-preview-20260421",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.063,
        "outputPricePerMillion": 0.21,
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
        "name": "xiaomi/mimo-v2.5-pro",
        "canonicalSlug": "xiaomi/mimo-v2.5-pro-20260422",
        "isUncensored": true,
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 131072,
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
        }
    },
    {
        "name": "xiaomi/mimo-v2.5",
        "canonicalSlug": "xiaomi/mimo-v2.5-20260422",
        "isUncensored": true,
        "maxRequestTokens": 1050000,
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
        }
    },
    {
        "name": "openai/gpt-5.4-image-2",
        "canonicalSlug": "openai/gpt-5.4-image-2-20260421",
        "isUncensored": false,
        "maxRequestTokens": 272000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 8,
        "outputPricePerMillion": 15,
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
        "name": "inclusionai/ling-2.6-flash",
        "canonicalSlug": "inclusionai/ling-2.6-flash-20260421",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.01,
        "outputPricePerMillion": 0.03,
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
        "name": "~anthropic/claude-opus-latest",
        "canonicalSlug": "~anthropic/claude-opus-latest",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openrouter/pareto-code",
        "canonicalSlug": "openrouter/pareto-code",
        "isUncensored": true,
        "maxRequestTokens": 2000000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": -1000000,
        "outputPricePerMillion": -1000000,
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
        "name": "moonshotai/kimi-k2.6",
        "canonicalSlug": "moonshotai/kimi-k2.6-20260420",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.95,
        "outputPricePerMillion": 4,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": true,
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
        "name": "anthropic/claude-opus-4.7",
        "canonicalSlug": "anthropic/claude-4.7-opus-20260416",
        "isUncensored": false,
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
        }
    },
    {
        "name": "anthropic/claude-opus-4.7:batch",
        "canonicalSlug": "anthropic/claude-4.7-opus-20260416",
        "isUncensored": false,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 2.5,
        "outputPricePerMillion": 12.5,
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
        "name": "z-ai/glm-5.1",
        "canonicalSlug": "z-ai/glm-5.1-20260406",
        "isUncensored": true,
        "maxRequestTokens": 204800,
        "maxResponseTokens": 131072,
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
        }
    },
    {
        "name": "google/gemma-4-26b-a4b-it",
        "canonicalSlug": "google/gemma-4-26b-a4b-it-20260403",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.12,
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
        "name": "google/gemma-4-26b-a4b-it:free",
        "canonicalSlug": "google/gemma-4-26b-a4b-it-20260403",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
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
        "name": "google/gemma-4-31b-it",
        "canonicalSlug": "google/gemma-4-31b-it-20260402",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0.33999999999999997,
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
        "name": "google/gemma-4-31b-it:free",
        "canonicalSlug": "google/gemma-4-31b-it-20260402",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
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
        "name": "qwen/qwen3.6-plus",
        "canonicalSlug": "qwen/qwen3.6-plus-04-02",
        "isUncensored": true,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.325,
        "outputPricePerMillion": 1.95,
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
        "name": "z-ai/glm-5v-turbo",
        "canonicalSlug": "z-ai/glm-5v-turbo-20260401",
        "isUncensored": true,
        "maxRequestTokens": 202752,
        "maxResponseTokens": 131072,
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
        "name": "arcee-ai/trinity-large-thinking",
        "canonicalSlug": "arcee-ai/trinity-large-thinking",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.22,
        "outputPricePerMillion": 0.85,
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
        "name": "x-ai/grok-4.20-multi-agent",
        "canonicalSlug": "x-ai/grok-4.20-multi-agent-20260309",
        "isUncensored": true,
        "maxRequestTokens": 2000000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 1.25,
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
                        "text",
                        "json"
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
        "name": "x-ai/grok-4.20",
        "canonicalSlug": "x-ai/grok-4.20-20260309",
        "isUncensored": true,
        "maxRequestTokens": 2000000,
        "maxResponseTokens": 0,
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
        }
    },
    {
        "name": "google/lyria-3-pro-preview",
        "canonicalSlug": "google/lyria-3-pro-preview-20260330",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65536,
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
        "name": "google/lyria-3-clip-preview",
        "canonicalSlug": "google/lyria-3-clip-preview-20260330",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65536,
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
        "name": "kwaipilot/kat-coder-pro-v2",
        "canonicalSlug": "kwaipilot/kat-coder-pro-v2-20260327",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 80000,
        "inputPricePerMillion": 0.3,
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
        "name": "rekaai/reka-edge",
        "canonicalSlug": "rekaai/reka-edge-2603",
        "isUncensored": true,
        "maxRequestTokens": 16384,
        "maxResponseTokens": 16384,
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
        "name": "minimax/minimax-m2.7",
        "canonicalSlug": "minimax/minimax-m2.7-20260318",
        "isUncensored": true,
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
        }
    },
    {
        "name": "openai/gpt-5.4-nano",
        "canonicalSlug": "openai/gpt-5.4-nano-20260317",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/gpt-5.4-nano:batch",
        "canonicalSlug": "openai/gpt-5.4-nano-20260317",
        "isUncensored": false,
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0.625,
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
        "name": "openai/gpt-5.4-mini",
        "canonicalSlug": "openai/gpt-5.4-mini-20260317",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/gpt-5.4-mini:batch",
        "canonicalSlug": "openai/gpt-5.4-mini-20260317",
        "isUncensored": false,
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.375,
        "outputPricePerMillion": 2.25,
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
        "name": "mistralai/mistral-small-2603",
        "canonicalSlug": "mistralai/mistral-small-2603",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 0,
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
        }
    },
    {
        "name": "z-ai/glm-5-turbo",
        "canonicalSlug": "z-ai/glm-5-turbo-20260315",
        "isUncensored": true,
        "maxRequestTokens": 202752,
        "maxResponseTokens": 131072,
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
                        "text",
                        "json"
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
        "name": "nvidia/nemotron-3-super-120b-a12b",
        "canonicalSlug": "nvidia/nemotron-3-super-120b-a12b-20230311",
        "isUncensored": true,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.08499999999999999,
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
        "name": "nvidia/nemotron-3-super-120b-a12b:free",
        "canonicalSlug": "nvidia/nemotron-3-super-120b-a12b-20230311",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 262144,
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
        "name": "bytedance-seed/seed-2.0-lite",
        "canonicalSlug": "bytedance-seed/seed-2.0-lite-20260309",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 131072,
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
        }
    },
    {
        "name": "qwen/qwen3.5-9b",
        "canonicalSlug": "qwen/qwen3.5-9b-20260310",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0.15,
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
        "name": "openai/gpt-5.4-pro",
        "canonicalSlug": "openai/gpt-5.4-pro-20260305",
        "isUncensored": false,
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
        "name": "openai/gpt-5.4-pro:batch",
        "canonicalSlug": "openai/gpt-5.4-pro-20260305",
        "isUncensored": false,
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 15,
        "outputPricePerMillion": 90,
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
        "name": "openai/gpt-5.4",
        "canonicalSlug": "openai/gpt-5.4-20260305",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/gpt-5.4:batch",
        "canonicalSlug": "openai/gpt-5.4-20260305",
        "isUncensored": false,
        "maxRequestTokens": 1050000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 1.25,
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
        }
    },
    {
        "name": "inception/mercury-2",
        "canonicalSlug": "inception/mercury-2-20260304",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 50000,
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
        }
    },
    {
        "name": "google/gemini-3.1-flash-lite-preview",
        "canonicalSlug": "google/gemini-3.1-flash-lite-preview-20260303",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65536,
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
        }
    },
    {
        "name": "bytedance-seed/seed-2.0-mini",
        "canonicalSlug": "bytedance-seed/seed-2.0-mini-20260224",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 131072,
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
        }
    },
    {
        "name": "google/gemini-3.1-flash-image-preview",
        "canonicalSlug": "google/gemini-3.1-flash-image-preview-20260226",
        "isUncensored": true,
        "maxRequestTokens": 65536,
        "maxResponseTokens": 65536,
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
        }
    },
    {
        "name": "qwen/qwen3.5-35b-a3b",
        "canonicalSlug": "qwen/qwen3.5-35b-a3b-20260224",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.25,
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
        }
    },
    {
        "name": "qwen/qwen3.5-27b",
        "canonicalSlug": "qwen/qwen3.5-27b-20260224",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.195,
        "outputPricePerMillion": 1.56,
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
        "name": "qwen/qwen3.5-122b-a10b",
        "canonicalSlug": "qwen/qwen3.5-122b-a10b-20260224",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 81920,
        "inputPricePerMillion": 0.29,
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
        }
    },
    {
        "name": "qwen/qwen3.5-flash-02-23",
        "canonicalSlug": "qwen/qwen3.5-flash-20260224",
        "isUncensored": true,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.065,
        "outputPricePerMillion": 0.26,
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
        "name": "google/gemini-3.1-pro-preview-customtools",
        "canonicalSlug": "google/gemini-3.1-pro-preview-customtools-20260219",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65536,
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
        }
    },
    {
        "name": "openai/gpt-5.3-codex",
        "canonicalSlug": "openai/gpt-5.3-codex-20260224",
        "isUncensored": false,
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
        }
    },
    {
        "name": "aion-labs/aion-2.0",
        "canonicalSlug": "aion-labs/aion-2.0-20260223",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.7999999999999999,
        "outputPricePerMillion": 1.5999999999999999,
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
        "name": "google/gemini-3.1-pro-preview",
        "canonicalSlug": "google/gemini-3.1-pro-preview-20260219",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65536,
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
        }
    },
    {
        "name": "google/gemini-3.1-pro-preview:batch",
        "canonicalSlug": "google/gemini-3.1-pro-preview-20260219",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 1,
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
        }
    },
    {
        "name": "anthropic/claude-sonnet-4.6",
        "canonicalSlug": "anthropic/claude-4.6-sonnet-20260217",
        "isUncensored": false,
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
        }
    },
    {
        "name": "anthropic/claude-sonnet-4.6:batch",
        "canonicalSlug": "anthropic/claude-4.6-sonnet-20260217",
        "isUncensored": false,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
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
        }
    },
    {
        "name": "qwen/qwen3.5-plus-02-15",
        "canonicalSlug": "qwen/qwen3.5-plus-20260216",
        "isUncensored": true,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.26,
        "outputPricePerMillion": 1.56,
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
        "name": "qwen/qwen3.5-397b-a17b",
        "canonicalSlug": "qwen/qwen3.5-397b-a17b-20260216",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.5,
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
        }
    },
    {
        "name": "minimax/minimax-m2.5",
        "canonicalSlug": "minimax/minimax-m2.5-20260211",
        "isUncensored": true,
        "maxRequestTokens": 204800,
        "maxResponseTokens": 196608,
        "inputPricePerMillion": 0.22,
        "outputPricePerMillion": 0.8999999999999999,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": true,
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
        "name": "z-ai/glm-5",
        "canonicalSlug": "z-ai/glm-5-20260211",
        "isUncensored": true,
        "maxRequestTokens": 204800,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.95,
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
        }
    },
    {
        "name": "qwen/qwen3-max-thinking",
        "canonicalSlug": "qwen/qwen3-max-thinking-20260123",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.78,
        "outputPricePerMillion": 3.9,
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
        "name": "anthropic/claude-opus-4.6",
        "canonicalSlug": "anthropic/claude-4.6-opus-20260205",
        "isUncensored": false,
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
        }
    },
    {
        "name": "anthropic/claude-opus-4.6:batch",
        "canonicalSlug": "anthropic/claude-4.6-opus-20260205",
        "isUncensored": false,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 2.5,
        "outputPricePerMillion": 12.5,
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
        "name": "qwen/qwen3-coder-next",
        "canonicalSlug": "qwen/qwen3-coder-next-2025-02-03",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.12,
        "outputPricePerMillion": 0.7999999999999999,
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
        "name": "openrouter/free",
        "canonicalSlug": "openrouter/free",
        "isUncensored": true,
        "maxRequestTokens": 200000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
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
        "name": "stepfun/step-3.5-flash",
        "canonicalSlug": "stepfun/step-3.5-flash",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0.3,
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
        "name": "moonshotai/kimi-k2.5",
        "canonicalSlug": "moonshotai/kimi-k2.5-0127",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.5700000000000001,
        "outputPricePerMillion": 2.8499999999999996,
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
        "name": "upstage/solar-pro-3",
        "canonicalSlug": "upstage/solar-pro-3",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
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
        "name": "minimax/minimax-m2-her",
        "canonicalSlug": "minimax/minimax-m2-her-20260123",
        "isUncensored": true,
        "maxRequestTokens": 65536,
        "maxResponseTokens": 2048,
        "inputPricePerMillion": 0.3,
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
        "name": "writer/palmyra-x5",
        "canonicalSlug": "writer/palmyra-x5-20250428",
        "isUncensored": false,
        "maxRequestTokens": 1040000,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.6,
        "outputPricePerMillion": 6,
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
        "name": "openai/gpt-audio",
        "canonicalSlug": "openai/gpt-audio",
        "isUncensored": false,
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
        "name": "openai/gpt-audio-mini",
        "canonicalSlug": "openai/gpt-audio-mini",
        "isUncensored": false,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.6,
        "outputPricePerMillion": 2.4,
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
        "name": "z-ai/glm-4.7-flash",
        "canonicalSlug": "z-ai/glm-4.7-flash-20260119",
        "isUncensored": true,
        "maxRequestTokens": 202752,
        "maxResponseTokens": 16384,
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
                        "text",
                        "json"
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
        "name": "openai/gpt-5.2-codex",
        "canonicalSlug": "openai/gpt-5.2-codex-20260114",
        "isUncensored": true,
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
        }
    },
    {
        "name": "bytedance-seed/seed-1.6-flash",
        "canonicalSlug": "bytedance-seed/seed-1.6-flash-20250625",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.075,
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
                        "text",
                        "json"
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
        "name": "bytedance-seed/seed-1.6",
        "canonicalSlug": "bytedance-seed/seed-1.6-20250625",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 32768,
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
        }
    },
    {
        "name": "minimax/minimax-m2.1",
        "canonicalSlug": "minimax/minimax-m2.1",
        "isUncensored": true,
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
        "name": "z-ai/glm-4.7",
        "canonicalSlug": "z-ai/glm-4.7-20251222",
        "isUncensored": true,
        "maxRequestTokens": 204800,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.39999999999999997,
        "outputPricePerMillion": 1.75,
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
        "name": "google/gemini-3-flash-preview",
        "canonicalSlug": "google/gemini-3-flash-preview-20251217",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65536,
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
        }
    },
    {
        "name": "google/gemini-3-flash-preview:batch",
        "canonicalSlug": "google/gemini-3-flash-preview-20251217",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65536,
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
        }
    },
    {
        "name": "nvidia/nemotron-3-nano-30b-a3b",
        "canonicalSlug": "nvidia/nemotron-3-nano-30b-a3b",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 228000,
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
        }
    },
    {
        "name": "nvidia/nemotron-3-nano-30b-a3b:free",
        "canonicalSlug": "nvidia/nemotron-3-nano-30b-a3b",
        "isUncensored": true,
        "maxRequestTokens": 256000,
        "maxResponseTokens": 0,
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
        "name": "openai/gpt-5.2-chat",
        "canonicalSlug": "openai/gpt-5.2-chat-20251211",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 1.75,
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
        }
    },
    {
        "name": "openai/gpt-5.2-pro",
        "canonicalSlug": "openai/gpt-5.2-pro-20251211",
        "isUncensored": false,
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
        "name": "openai/gpt-5.2-pro:batch",
        "canonicalSlug": "openai/gpt-5.2-pro-20251211",
        "isUncensored": false,
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 10.5,
        "outputPricePerMillion": 84,
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
        "name": "openai/gpt-5.2",
        "canonicalSlug": "openai/gpt-5.2-20251211",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/gpt-5.2:batch",
        "canonicalSlug": "openai/gpt-5.2-20251211",
        "isUncensored": false,
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.875,
        "outputPricePerMillion": 7,
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
        "name": "relace/relace-search",
        "canonicalSlug": "relace/relace-search-20251208",
        "isUncensored": true,
        "maxRequestTokens": 256000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 1,
        "outputPricePerMillion": 3,
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
        "name": "z-ai/glm-4.6v",
        "canonicalSlug": "z-ai/glm-4.6-20251208",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.3,
        "outputPricePerMillion": 0.8999999999999999,
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
        "name": "openrouter/bodybuilder",
        "canonicalSlug": "openrouter/bodybuilder",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": -1000000,
        "outputPricePerMillion": -1000000,
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
        "name": "openai/gpt-5.1-codex-max",
        "canonicalSlug": "openai/gpt-5.1-codex-max-20251204",
        "isUncensored": true,
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
        }
    },
    {
        "name": "amazon/nova-2-lite-v1",
        "canonicalSlug": "amazon/nova-2-lite-v1",
        "isUncensored": false,
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
        "name": "mistralai/ministral-14b-2512",
        "canonicalSlug": "mistralai/ministral-14b-2512",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 0,
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
        }
    },
    {
        "name": "mistralai/ministral-8b-2512",
        "canonicalSlug": "mistralai/ministral-8b-2512",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 0,
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
        }
    },
    {
        "name": "mistralai/ministral-3b-2512",
        "canonicalSlug": "mistralai/ministral-3b-2512",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
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
                        "text",
                        "json"
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
        "name": "mistralai/mistral-large-2512",
        "canonicalSlug": "mistralai/mistral-large-2512",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 0,
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
        }
    },
    {
        "name": "deepseek/deepseek-v3.2",
        "canonicalSlug": "deepseek/deepseek-v3.2-20251201",
        "isUncensored": true,
        "maxRequestTokens": 163840,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.26899999999999996,
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
        "name": "anthropic/claude-opus-4.5",
        "canonicalSlug": "anthropic/claude-4.5-opus-20251124",
        "isUncensored": false,
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
        }
    },
    {
        "name": "anthropic/claude-opus-4.5:batch",
        "canonicalSlug": "anthropic/claude-4.5-opus-20251124",
        "isUncensored": false,
        "maxRequestTokens": 200000,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 2.5,
        "outputPricePerMillion": 12.5,
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
        "name": "allenai/olmo-3-32b-think",
        "canonicalSlug": "allenai/olmo-3-32b-think-20251121",
        "isUncensored": true,
        "maxRequestTokens": 65536,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.15,
        "outputPricePerMillion": 0.5,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
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
        "name": "google/gemini-3-pro-image-preview",
        "canonicalSlug": "google/gemini-3-pro-image-preview-20251120",
        "isUncensored": true,
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
        }
    },
    {
        "name": "deepcogito/cogito-v2.1-671b",
        "canonicalSlug": "deepcogito/cogito-v2.1-671b-20251118",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 1.25,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
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
        "name": "openai/gpt-5.1",
        "canonicalSlug": "openai/gpt-5.1-20251113",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/gpt-5.1:batch",
        "canonicalSlug": "openai/gpt-5.1-20251113",
        "isUncensored": false,
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.625,
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
        }
    },
    {
        "name": "openai/gpt-5.1-codex",
        "canonicalSlug": "openai/gpt-5.1-codex-20251113",
        "isUncensored": true,
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
        }
    },
    {
        "name": "openai/gpt-5.1-codex-mini",
        "canonicalSlug": "openai/gpt-5.1-codex-mini-20251113",
        "isUncensored": true,
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
        }
    },
    {
        "name": "moonshotai/kimi-k2-thinking",
        "canonicalSlug": "moonshotai/kimi-k2-thinking-20251106",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 100352,
        "inputPricePerMillion": 0.6,
        "outputPricePerMillion": 2.5,
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
        "name": "amazon/nova-premier-v1",
        "canonicalSlug": "amazon/nova-premier-v1",
        "isUncensored": false,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 2.5,
        "outputPricePerMillion": 12.5,
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
        "name": "perplexity/sonar-pro-search",
        "canonicalSlug": "perplexity/sonar-pro-search",
        "isUncensored": true,
        "maxRequestTokens": 200000,
        "maxResponseTokens": 8000,
        "inputPricePerMillion": 3,
        "outputPricePerMillion": 15,
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
        "name": "mistralai/voxtral-small-24b-2507",
        "canonicalSlug": "mistralai/voxtral-small-24b-2507",
        "isUncensored": true,
        "maxRequestTokens": 32000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0.3,
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
        "name": "openai/gpt-oss-safeguard-20b",
        "canonicalSlug": "openai/gpt-oss-safeguard-20b",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.075,
        "outputPricePerMillion": 0.3,
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
        "name": "nvidia/nemotron-nano-12b-v2-vl:free",
        "canonicalSlug": "nvidia/nemotron-nano-12b-v2-vl",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
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
        "name": "minimax/minimax-m2",
        "canonicalSlug": "minimax/minimax-m2",
        "isUncensored": true,
        "maxRequestTokens": 204800,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.255,
        "outputPricePerMillion": 1.02,
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
        "name": "qwen/qwen3-vl-32b-instruct",
        "canonicalSlug": "qwen/qwen3-vl-32b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.10400000000000001,
        "outputPricePerMillion": 0.41600000000000004,
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
        "name": "ibm-granite/granite-4.0-h-micro",
        "canonicalSlug": "ibm-granite/granite-4.0-h-micro",
        "isUncensored": true,
        "maxRequestTokens": 131000,
        "maxResponseTokens": 131000,
        "inputPricePerMillion": 0.017,
        "outputPricePerMillion": 0.112,
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
        "name": "openai/gpt-5-image-mini",
        "canonicalSlug": "openai/gpt-5-image-mini",
        "isUncensored": false,
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 2.5,
        "outputPricePerMillion": 2,
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
        "name": "anthropic/claude-haiku-4.5",
        "canonicalSlug": "anthropic/claude-4.5-haiku-20251001",
        "isUncensored": false,
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
        }
    },
    {
        "name": "anthropic/claude-haiku-4.5:batch",
        "canonicalSlug": "anthropic/claude-4.5-haiku-20251001",
        "isUncensored": false,
        "maxRequestTokens": 200000,
        "maxResponseTokens": 64000,
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
                        "text",
                        "json"
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
        "name": "qwen/qwen3-vl-8b-thinking",
        "canonicalSlug": "qwen/qwen3-vl-8b-thinking",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.18,
        "outputPricePerMillion": 2.0999999999999996,
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
        "name": "qwen/qwen3-vl-8b-instruct",
        "canonicalSlug": "qwen/qwen3-vl-8b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.117,
        "outputPricePerMillion": 0.45499999999999996,
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
        "name": "openai/gpt-5-image",
        "canonicalSlug": "openai/gpt-5-image",
        "isUncensored": false,
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 10,
        "outputPricePerMillion": 10,
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
        "name": "google/gemini-2.5-flash-image",
        "canonicalSlug": "google/gemini-2.5-flash-image",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.3,
        "outputPricePerMillion": 2.5,
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
        "name": "qwen/qwen3-vl-30b-a3b-thinking",
        "canonicalSlug": "qwen/qwen3-vl-30b-a3b-thinking",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.19999999999999998,
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
        }
    },
    {
        "name": "qwen/qwen3-vl-30b-a3b-instruct",
        "canonicalSlug": "qwen/qwen3-vl-30b-a3b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 262144,
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
        }
    },
    {
        "name": "openai/gpt-5-pro",
        "canonicalSlug": "openai/gpt-5-pro-2025-10-06",
        "isUncensored": false,
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
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
                        "text",
                        "json"
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
        "name": "openai/gpt-5-pro:batch",
        "canonicalSlug": "openai/gpt-5-pro-2025-10-06",
        "isUncensored": false,
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 7.5,
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
        }
    },
    {
        "name": "z-ai/glm-4.6",
        "canonicalSlug": "z-ai/glm-4.6",
        "isUncensored": true,
        "maxRequestTokens": 204800,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.5,
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
        }
    },
    {
        "name": "anthropic/claude-sonnet-4.5",
        "canonicalSlug": "anthropic/claude-4.5-sonnet-20250929",
        "isUncensored": false,
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
        }
    },
    {
        "name": "anthropic/claude-sonnet-4.5:batch",
        "canonicalSlug": "anthropic/claude-4.5-sonnet-20250929",
        "isUncensored": false,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 64000,
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
        }
    },
    {
        "name": "deepseek/deepseek-v3.2-exp",
        "canonicalSlug": "deepseek/deepseek-v3.2-exp",
        "isUncensored": true,
        "maxRequestTokens": 163840,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.27,
        "outputPricePerMillion": 0.41,
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
        "name": "thedrummer/cydonia-24b-v4.1",
        "canonicalSlug": "thedrummer/cydonia-24b-v4.1",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.3,
        "outputPricePerMillion": 0.5,
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
        "name": "relace/relace-apply-3",
        "canonicalSlug": "relace/relace-apply-3",
        "isUncensored": true,
        "maxRequestTokens": 256000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.85,
        "outputPricePerMillion": 1.25,
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
        "name": "qwen/qwen3-vl-235b-a22b-thinking",
        "canonicalSlug": "qwen/qwen3-vl-235b-a22b-thinking",
        "isUncensored": true,
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
        "name": "qwen/qwen3-vl-235b-a22b-instruct",
        "canonicalSlug": "qwen/qwen3-vl-235b-a22b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.26,
        "outputPricePerMillion": 1.04,
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
        "name": "qwen/qwen3-max",
        "canonicalSlug": "qwen/qwen3-max",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.78,
        "outputPricePerMillion": 3.9,
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
        "name": "qwen/qwen3-coder-plus",
        "canonicalSlug": "qwen/qwen3-coder-plus",
        "isUncensored": true,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.65,
        "outputPricePerMillion": 3.25,
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
        "name": "openai/gpt-5-codex:batch",
        "canonicalSlug": "openai/gpt-5-codex",
        "isUncensored": false,
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.625,
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
        }
    },
    {
        "name": "deepseek/deepseek-v3.1-terminus",
        "canonicalSlug": "deepseek/deepseek-v3.1-terminus",
        "isUncensored": true,
        "maxRequestTokens": 163840,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.27,
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
        }
    },
    {
        "name": "qwen/qwen3-coder-flash",
        "canonicalSlug": "qwen/qwen3-coder-flash",
        "isUncensored": true,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.195,
        "outputPricePerMillion": 0.975,
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
        "name": "qwen/qwen3-next-80b-a3b-thinking",
        "canonicalSlug": "qwen/qwen3-next-80b-a3b-thinking-2509",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 32768,
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
        "name": "qwen/qwen3-next-80b-a3b-instruct",
        "canonicalSlug": "qwen/qwen3-next-80b-a3b-instruct-2509",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 1.1,
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
        "name": "qwen/qwen-plus-2025-07-28",
        "canonicalSlug": "qwen/qwen-plus-2025-07-28",
        "isUncensored": true,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.26,
        "outputPricePerMillion": 0.78,
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
        "name": "qwen/qwen-plus-2025-07-28:thinking",
        "canonicalSlug": "qwen/qwen-plus-2025-07-28",
        "isUncensored": true,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.39999999999999997,
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
        "name": "nvidia/nemotron-nano-9b-v2:free",
        "canonicalSlug": "nvidia/nemotron-nano-9b-v2",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 0,
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
        "name": "moonshotai/kimi-k2-0905",
        "canonicalSlug": "moonshotai/kimi-k2-0905",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 100352,
        "inputPricePerMillion": 0.6,
        "outputPricePerMillion": 2.5,
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
        "name": "qwen/qwen3-30b-a3b-thinking-2507",
        "canonicalSlug": "qwen/qwen3-30b-a3b-thinking-2507",
        "isUncensored": true,
        "maxRequestTokens": 81920,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.19999999999999998,
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
        "name": "nousresearch/hermes-4-70b",
        "canonicalSlug": "nousresearch/hermes-4-70b",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.13,
        "outputPricePerMillion": 0.39999999999999997,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
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
        "name": "nousresearch/hermes-4-405b",
        "canonicalSlug": "nousresearch/hermes-4-405b",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 1,
        "outputPricePerMillion": 3,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
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
        "name": "deepseek/deepseek-chat-v3.1",
        "canonicalSlug": "deepseek/deepseek-chat-v3.1",
        "isUncensored": true,
        "maxRequestTokens": 163840,
        "maxResponseTokens": 32768,
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
        }
    },
    {
        "name": "mistralai/mistral-medium-3.1",
        "canonicalSlug": "mistralai/mistral-medium-3.1",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.39999999999999997,
        "outputPricePerMillion": 2,
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
        "name": "z-ai/glm-4.5v",
        "canonicalSlug": "z-ai/glm-4.5v",
        "isUncensored": true,
        "maxRequestTokens": 65536,
        "maxResponseTokens": 16384,
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
        "name": "ai21/jamba-large-1.7",
        "canonicalSlug": "ai21/jamba-large-1.7",
        "isUncensored": true,
        "maxRequestTokens": 256000,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 2,
        "outputPricePerMillion": 8,
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
        "name": "openai/gpt-5",
        "canonicalSlug": "openai/gpt-5-2025-08-07",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/gpt-5:batch",
        "canonicalSlug": "openai/gpt-5-2025-08-07",
        "isUncensored": false,
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.625,
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
        }
    },
    {
        "name": "openai/gpt-5-mini",
        "canonicalSlug": "openai/gpt-5-mini-2025-08-07",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/gpt-5-mini:batch",
        "canonicalSlug": "openai/gpt-5-mini-2025-08-07",
        "isUncensored": false,
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.125,
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
        }
    },
    {
        "name": "openai/gpt-5-nano",
        "canonicalSlug": "openai/gpt-5-nano-2025-08-07",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/gpt-5-nano:batch",
        "canonicalSlug": "openai/gpt-5-nano-2025-08-07",
        "isUncensored": false,
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.024999999999999998,
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
        }
    },
    {
        "name": "openai/gpt-oss-120b",
        "canonicalSlug": "openai/gpt-oss-120b",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.03,
        "outputPricePerMillion": 0.16999999999999998,
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
        "name": "openai/gpt-oss-20b",
        "canonicalSlug": "openai/gpt-oss-20b",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.03,
        "outputPricePerMillion": 0.13,
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
        "name": "openai/gpt-oss-20b:free",
        "canonicalSlug": "openai/gpt-oss-20b",
        "isUncensored": true,
        "maxRequestTokens": 131072,
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
                        "text",
                        "json"
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
        "name": "anthropic/claude-opus-4.1",
        "canonicalSlug": "anthropic/claude-4.1-opus-20250805",
        "isUncensored": false,
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
        }
    },
    {
        "name": "anthropic/claude-opus-4.1:batch",
        "canonicalSlug": "anthropic/claude-4.1-opus-20250805",
        "isUncensored": false,
        "maxRequestTokens": 200000,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 7.5,
        "outputPricePerMillion": 37.5,
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
        "name": "mistralai/codestral-2508",
        "canonicalSlug": "mistralai/codestral-2508",
        "isUncensored": true,
        "maxRequestTokens": 256000,
        "maxResponseTokens": 0,
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
        }
    },
    {
        "name": "qwen/qwen3-coder-30b-a3b-instruct",
        "canonicalSlug": "qwen/qwen3-coder-30b-a3b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.07,
        "outputPricePerMillion": 0.28,
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
        "name": "qwen/qwen3-30b-a3b-instruct-2507",
        "canonicalSlug": "qwen/qwen3-30b-a3b-instruct-2507",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 0.04815,
        "outputPricePerMillion": 0.19305,
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
        "name": "z-ai/glm-4.5",
        "canonicalSlug": "z-ai/glm-4.5",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 98304,
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
        "name": "z-ai/glm-4.5-air",
        "canonicalSlug": "z-ai/glm-4.5-air",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 98304,
        "inputPricePerMillion": 0.13,
        "outputPricePerMillion": 0.85,
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
        "name": "qwen/qwen3-235b-a22b-thinking-2507",
        "canonicalSlug": "qwen/qwen3-235b-a22b-thinking-2507",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.22999999999999998,
        "outputPricePerMillion": 2.3,
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
        "name": "qwen/qwen3-coder",
        "canonicalSlug": "qwen/qwen3-coder-480b-a35b-07-25",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.3,
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
        "name": "bytedance/ui-tars-1.5-7b",
        "canonicalSlug": "bytedance/ui-tars-1.5-7b",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 2048,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0.19999999999999998,
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
                        "text"
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
        "name": "google/gemini-2.5-flash-lite",
        "canonicalSlug": "google/gemini-2.5-flash-lite",
        "isUncensored": true,
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
        }
    },
    {
        "name": "google/gemini-2.5-flash-lite:batch",
        "canonicalSlug": "google/gemini-2.5-flash-lite",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65535,
        "inputPricePerMillion": 0.049999999999999996,
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
        }
    },
    {
        "name": "qwen/qwen3-235b-a22b-2507",
        "canonicalSlug": "qwen/qwen3-235b-a22b-07-25",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.09,
        "outputPricePerMillion": 0.55,
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
        "name": "moonshotai/kimi-k2",
        "canonicalSlug": "moonshotai/kimi-k2",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 100352,
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
        "name": "cognitivecomputations/dolphin-mistral-24b-venice-edition",
        "canonicalSlug": "venice/uncensored",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.19999999999999998,
        "outputPricePerMillion": 0.8999999999999999,
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
        "name": "tencent/hunyuan-a13b-instruct",
        "canonicalSlug": "tencent/hunyuan-a13b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.14,
        "outputPricePerMillion": 0.5700000000000001,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
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
        "name": "morph/morph-v3-large",
        "canonicalSlug": "morph/morph-v3-large",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 131072,
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
        "name": "morph/morph-v3-fast",
        "canonicalSlug": "morph/morph-v3-fast",
        "isUncensored": true,
        "maxRequestTokens": 81920,
        "maxResponseTokens": 38000,
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
        "name": "baidu/ernie-4.5-vl-424b-a47b",
        "canonicalSlug": "baidu/ernie-4.5-vl-424b-a47b",
        "isUncensored": true,
        "maxRequestTokens": 123000,
        "maxResponseTokens": 16000,
        "inputPricePerMillion": 0.42,
        "outputPricePerMillion": 1.25,
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
        }
    },
    {
        "name": "mistralai/mistral-small-3.2-24b-instruct",
        "canonicalSlug": "mistralai/mistral-small-3.2-24b-instruct-2506",
        "isUncensored": true,
        "maxRequestTokens": 256000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.09375,
        "outputPricePerMillion": 0.25,
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
        "name": "minimax/minimax-m1",
        "canonicalSlug": "minimax/minimax-m1",
        "isUncensored": true,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 40000,
        "inputPricePerMillion": 0.55,
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
        "name": "google/gemini-2.5-flash",
        "canonicalSlug": "google/gemini-2.5-flash",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
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
        }
    },
    {
        "name": "google/gemini-2.5-flash:batch",
        "canonicalSlug": "google/gemini-2.5-flash",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65535,
        "inputPricePerMillion": 0.15,
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
        }
    },
    {
        "name": "google/gemini-2.5-pro",
        "canonicalSlug": "google/gemini-2.5-pro",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65536,
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
        }
    },
    {
        "name": "google/gemini-2.5-pro:batch",
        "canonicalSlug": "google/gemini-2.5-pro",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.625,
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
        }
    },
    {
        "name": "openai/o3-pro",
        "canonicalSlug": "openai/o3-pro-2025-06-10",
        "isUncensored": false,
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
        "name": "openai/o3-pro:batch",
        "canonicalSlug": "openai/o3-pro-2025-06-10",
        "isUncensored": false,
        "maxRequestTokens": 200000,
        "maxResponseTokens": 100000,
        "inputPricePerMillion": 10,
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
        }
    },
    {
        "name": "google/gemini-2.5-pro-preview",
        "canonicalSlug": "google/gemini-2.5-pro-preview-06-05",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65536,
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
        }
    },
    {
        "name": "deepseek/deepseek-r1-0528",
        "canonicalSlug": "deepseek/deepseek-r1-0528",
        "isUncensored": true,
        "maxRequestTokens": 163840,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.5,
        "outputPricePerMillion": 2.1500000000000004,
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
        "name": "anthropic/claude-opus-4",
        "canonicalSlug": "anthropic/claude-4-opus-20250522",
        "isUncensored": true,
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
        }
    },
    {
        "name": "anthropic/claude-sonnet-4",
        "canonicalSlug": "anthropic/claude-4-sonnet-20250522",
        "isUncensored": false,
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
        "name": "google/gemma-3n-e4b-it",
        "canonicalSlug": "google/gemma-3n-e4b-it",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.06,
        "outputPricePerMillion": 0.12,
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
        "name": "mistralai/mistral-medium-3",
        "canonicalSlug": "mistralai/mistral-medium-3",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.39999999999999997,
        "outputPricePerMillion": 2,
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
        "name": "google/gemini-2.5-pro-preview-05-06",
        "canonicalSlug": "google/gemini-2.5-pro-preview-03-25",
        "isUncensored": true,
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
        }
    },
    {
        "name": "arcee-ai/virtuoso-large",
        "canonicalSlug": "arcee-ai/virtuoso-large",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 0.75,
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
        "name": "meta-llama/llama-guard-4-12b",
        "canonicalSlug": "meta-llama/llama-guard-4-12b",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.18,
        "outputPricePerMillion": 0.18,
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
        "name": "qwen/qwen3-30b-a3b",
        "canonicalSlug": "qwen/qwen3-30b-a3b-04-28",
        "isUncensored": true,
        "maxRequestTokens": 131072,
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
        "name": "qwen/qwen3-8b",
        "canonicalSlug": "qwen/qwen3-8b-04-28",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.117,
        "outputPricePerMillion": 0.45499999999999996,
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
        "name": "qwen/qwen3-14b",
        "canonicalSlug": "qwen/qwen3-14b-04-28",
        "isUncensored": true,
        "maxRequestTokens": 131072,
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
        "name": "qwen/qwen3-32b",
        "canonicalSlug": "qwen/qwen3-32b-04-28",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.08,
        "outputPricePerMillion": 0.28,
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
        "name": "qwen/qwen3-235b-a22b",
        "canonicalSlug": "qwen/qwen3-235b-a22b-04-28",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.45499999999999996,
        "outputPricePerMillion": 1.8199999999999998,
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
        "name": "openai/o4-mini-high",
        "canonicalSlug": "openai/o4-mini-high-2025-04-16",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/o4-mini-high:batch",
        "canonicalSlug": "openai/o4-mini-high-2025-04-16",
        "isUncensored": false,
        "maxRequestTokens": 200000,
        "maxResponseTokens": 100000,
        "inputPricePerMillion": 0.55,
        "outputPricePerMillion": 2.2,
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
        "name": "openai/o3",
        "canonicalSlug": "openai/o3-2025-04-16",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/o3:batch",
        "canonicalSlug": "openai/o3-2025-04-16",
        "isUncensored": false,
        "maxRequestTokens": 200000,
        "maxResponseTokens": 100000,
        "inputPricePerMillion": 1,
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
        "name": "openai/o4-mini",
        "canonicalSlug": "openai/o4-mini-2025-04-16",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/o4-mini:batch",
        "canonicalSlug": "openai/o4-mini-2025-04-16",
        "isUncensored": false,
        "maxRequestTokens": 200000,
        "maxResponseTokens": 100000,
        "inputPricePerMillion": 0.55,
        "outputPricePerMillion": 2.2,
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
        "name": "openai/gpt-4.1",
        "canonicalSlug": "openai/gpt-4.1-2025-04-14",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/gpt-4.1:batch",
        "canonicalSlug": "openai/gpt-4.1-2025-04-14",
        "isUncensored": false,
        "maxRequestTokens": 1047576,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 1,
        "outputPricePerMillion": 4,
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
        "name": "openai/gpt-4.1-mini",
        "canonicalSlug": "openai/gpt-4.1-mini-2025-04-14",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/gpt-4.1-mini:batch",
        "canonicalSlug": "openai/gpt-4.1-mini-2025-04-14",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/gpt-4.1-nano",
        "canonicalSlug": "openai/gpt-4.1-nano-2025-04-14",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/gpt-4.1-nano:batch",
        "canonicalSlug": "openai/gpt-4.1-nano-2025-04-14",
        "isUncensored": false,
        "maxRequestTokens": 1047576,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.049999999999999996,
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
        }
    },
    {
        "name": "meta-llama/llama-4-maverick",
        "canonicalSlug": "meta-llama/llama-4-maverick-17b-128e-instruct",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.19999999999999998,
        "outputPricePerMillion": 0.696,
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
        "name": "meta-llama/llama-4-scout",
        "canonicalSlug": "meta-llama/llama-4-scout-17b-16e-instruct",
        "isUncensored": true,
        "maxRequestTokens": 1310720,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0.3,
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
        "name": "deepseek/deepseek-chat-v3-0324",
        "canonicalSlug": "deepseek/deepseek-chat-v3-0324",
        "isUncensored": true,
        "maxRequestTokens": 163840,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.27,
        "outputPricePerMillion": 1.12,
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
        "name": "openai/o1-pro",
        "canonicalSlug": "openai/o1-pro",
        "isUncensored": false,
        "maxRequestTokens": 200000,
        "maxResponseTokens": 100000,
        "inputPricePerMillion": 150,
        "outputPricePerMillion": 600,
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
        "name": "openai/o1-pro:batch",
        "canonicalSlug": "openai/o1-pro",
        "isUncensored": false,
        "maxRequestTokens": 200000,
        "maxResponseTokens": 100000,
        "inputPricePerMillion": 75,
        "outputPricePerMillion": 300,
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
        "name": "mistralai/mistral-small-3.1-24b-instruct",
        "canonicalSlug": "mistralai/mistral-small-3.1-24b-instruct-2503",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.351,
        "outputPricePerMillion": 0.5549999999999999,
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
        "name": "google/gemma-3-4b-it",
        "canonicalSlug": "google/gemma-3-4b-it",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.049999999999999996,
        "outputPricePerMillion": 0.09999999999999999,
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
        "name": "google/gemma-3-12b-it",
        "canonicalSlug": "google/gemma-3-12b-it",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.049999999999999996,
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
        }
    },
    {
        "name": "cohere/command-a",
        "canonicalSlug": "cohere/command-a-03-2025",
        "isUncensored": false,
        "maxRequestTokens": 256000,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 2.5,
        "outputPricePerMillion": 10,
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
        "name": "rekaai/reka-flash-3",
        "canonicalSlug": "rekaai/reka-flash-3",
        "isUncensored": true,
        "maxRequestTokens": 65536,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0.19999999999999998,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
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
        "name": "google/gemma-3-27b-it",
        "canonicalSlug": "google/gemma-3-27b-it",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.08,
        "outputPricePerMillion": 0.44999999999999996,
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
        "name": "thedrummer/skyfall-36b-v2",
        "canonicalSlug": "thedrummer/skyfall-36b-v2",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.55,
        "outputPricePerMillion": 0.7999999999999999,
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
        "name": "perplexity/sonar-reasoning-pro",
        "canonicalSlug": "perplexity/sonar-reasoning-pro",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 2,
        "outputPricePerMillion": 8,
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
        }
    },
    {
        "name": "perplexity/sonar-pro",
        "canonicalSlug": "perplexity/sonar-pro",
        "isUncensored": true,
        "maxRequestTokens": 200000,
        "maxResponseTokens": 8000,
        "inputPricePerMillion": 3,
        "outputPricePerMillion": 15,
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
        "name": "perplexity/sonar-deep-research",
        "canonicalSlug": "perplexity/sonar-deep-research",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 2,
        "outputPricePerMillion": 8,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
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
        "name": "mistralai/mistral-saba",
        "canonicalSlug": "mistralai/mistral-saba-2502",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.19999999999999998,
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
        "name": "openai/o3-mini-high",
        "canonicalSlug": "openai/o3-mini-high-2025-01-31",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/o3-mini-high:batch",
        "canonicalSlug": "openai/o3-mini-high-2025-01-31",
        "isUncensored": false,
        "maxRequestTokens": 200000,
        "maxResponseTokens": 100000,
        "inputPricePerMillion": 0.55,
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
        }
    },
    {
        "name": "aion-labs/aion-rp-llama-3.1-8b",
        "canonicalSlug": "aion-labs/aion-rp-llama-3.1-8b",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.7999999999999999,
        "outputPricePerMillion": 1.5999999999999999,
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
        "name": "qwen/qwen2.5-vl-72b-instruct",
        "canonicalSlug": "qwen/qwen2.5-vl-72b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.25,
        "outputPricePerMillion": 0.75,
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
        "name": "qwen/qwen-plus",
        "canonicalSlug": "qwen/qwen-plus-2025-01-25",
        "isUncensored": true,
        "maxRequestTokens": 1000000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.26,
        "outputPricePerMillion": 0.78,
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
        "name": "openai/o3-mini",
        "canonicalSlug": "openai/o3-mini-2025-01-31",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/o3-mini:batch",
        "canonicalSlug": "openai/o3-mini-2025-01-31",
        "isUncensored": false,
        "maxRequestTokens": 200000,
        "maxResponseTokens": 100000,
        "inputPricePerMillion": 0.55,
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
        }
    },
    {
        "name": "mistralai/mistral-small-24b-instruct-2501",
        "canonicalSlug": "mistralai/mistral-small-24b-instruct-2501",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.049999999999999996,
        "outputPricePerMillion": 0.08,
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
        "name": "perplexity/sonar",
        "canonicalSlug": "perplexity/sonar",
        "isUncensored": true,
        "maxRequestTokens": 127072,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 1,
        "outputPricePerMillion": 1,
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
        "name": "deepseek/deepseek-r1-distill-llama-70b",
        "canonicalSlug": "deepseek/deepseek-r1-distill-llama-70b",
        "isUncensored": true,
        "maxRequestTokens": 8192,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.7999999999999999,
        "outputPricePerMillion": 0.7999999999999999,
        "capabilities": {
            "streaming": true,
            "toolCalls": false,
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
        "name": "deepseek/deepseek-r1",
        "canonicalSlug": "deepseek/deepseek-r1",
        "isUncensored": true,
        "maxRequestTokens": 163840,
        "maxResponseTokens": 16000,
        "inputPricePerMillion": 0.7,
        "outputPricePerMillion": 2.5,
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
        "name": "minimax/minimax-01",
        "canonicalSlug": "minimax/minimax-01",
        "isUncensored": true,
        "maxRequestTokens": 1000192,
        "maxResponseTokens": 1000192,
        "inputPricePerMillion": 0.19999999999999998,
        "outputPricePerMillion": 1.1,
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
        "name": "microsoft/phi-4",
        "canonicalSlug": "microsoft/phi-4",
        "isUncensored": true,
        "maxRequestTokens": 16384,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.07,
        "outputPricePerMillion": 0.14,
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
        "name": "deepseek/deepseek-chat",
        "canonicalSlug": "deepseek/deepseek-chat-v3",
        "isUncensored": true,
        "maxRequestTokens": 163840,
        "maxResponseTokens": 16000,
        "inputPricePerMillion": 0.2574,
        "outputPricePerMillion": 1.0287,
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
        "name": "sao10k/l3.3-euryale-70b",
        "canonicalSlug": "sao10k/l3.3-euryale-70b-v2.3",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.65,
        "outputPricePerMillion": 0.75,
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
        "name": "openai/o1",
        "canonicalSlug": "openai/o1-2024-12-17",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/o1:batch",
        "canonicalSlug": "openai/o1-2024-12-17",
        "isUncensored": false,
        "maxRequestTokens": 200000,
        "maxResponseTokens": 100000,
        "inputPricePerMillion": 7.5,
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
        }
    },
    {
        "name": "cohere/command-r7b-12-2024",
        "canonicalSlug": "cohere/command-r7b-12-2024",
        "isUncensored": false,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 4000,
        "inputPricePerMillion": 0.0375,
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
        }
    },
    {
        "name": "meta-llama/llama-3.3-70b-instruct",
        "canonicalSlug": "meta-llama/llama-3.3-70b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0.32,
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
        "name": "amazon/nova-lite-v1",
        "canonicalSlug": "amazon/nova-lite-v1",
        "isUncensored": false,
        "maxRequestTokens": 300000,
        "maxResponseTokens": 5120,
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
        "name": "amazon/nova-micro-v1",
        "canonicalSlug": "amazon/nova-micro-v1",
        "isUncensored": false,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 5120,
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
        "name": "amazon/nova-pro-v1",
        "canonicalSlug": "amazon/nova-pro-v1",
        "isUncensored": false,
        "maxRequestTokens": 300000,
        "maxResponseTokens": 5120,
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
        "name": "openai/gpt-4o-2024-11-20",
        "canonicalSlug": "openai/gpt-4o-2024-11-20",
        "isUncensored": false,
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
        }
    },
    {
        "name": "mistralai/mistral-large-2407",
        "canonicalSlug": "mistralai/mistral-large-2407",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 2,
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
        }
    },
    {
        "name": "qwen/qwen-2.5-coder-32b-instruct",
        "canonicalSlug": "qwen/qwen-2.5-coder-32b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.66,
        "outputPricePerMillion": 1,
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
        "name": "thedrummer/unslopnemo-12b",
        "canonicalSlug": "thedrummer/unslopnemo-12b",
        "isUncensored": true,
        "maxRequestTokens": 1024000,
        "maxResponseTokens": 1024000,
        "inputPricePerMillion": 0.39999999999999997,
        "outputPricePerMillion": 0.39999999999999997,
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
        "name": "anthracite-org/magnum-v4-72b",
        "canonicalSlug": "anthracite-org/magnum-v4-72b",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 3,
        "outputPricePerMillion": 5,
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
        "name": "qwen/qwen-2.5-7b-instruct",
        "canonicalSlug": "qwen/qwen-2.5-7b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0.19999999999999998,
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
        "name": "thedrummer/rocinante-12b",
        "canonicalSlug": "thedrummer/rocinante-12b",
        "isUncensored": true,
        "maxRequestTokens": 65536,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.25,
        "outputPricePerMillion": 0.5,
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
        "name": "meta-llama/llama-3.2-1b-instruct",
        "canonicalSlug": "meta-llama/llama-3.2-1b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 60000,
        "maxResponseTokens": 60000,
        "inputPricePerMillion": 0.027,
        "outputPricePerMillion": 0.201,
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
        "name": "meta-llama/llama-3.2-3b-instruct",
        "canonicalSlug": "meta-llama/llama-3.2-3b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.049999999999999996,
        "outputPricePerMillion": 0.33,
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
        "name": "qwen/qwen-2.5-72b-instruct",
        "canonicalSlug": "qwen/qwen-2.5-72b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.36,
        "outputPricePerMillion": 0.39999999999999997,
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
        "name": "cohere/command-r-08-2024",
        "canonicalSlug": "cohere/command-r-08-2024",
        "isUncensored": false,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 4000,
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
        "name": "cohere/command-r-plus-08-2024",
        "canonicalSlug": "cohere/command-r-plus-08-2024",
        "isUncensored": false,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 4000,
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
        "name": "sao10k/l3.1-euryale-70b",
        "canonicalSlug": "sao10k/l3.1-euryale-70b",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.85,
        "outputPricePerMillion": 0.85,
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
        "name": "nousresearch/hermes-3-llama-3.1-70b",
        "canonicalSlug": "nousresearch/hermes-3-llama-3.1-70b",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.7,
        "outputPricePerMillion": 0.7,
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
        "name": "nousresearch/hermes-3-llama-3.1-405b",
        "canonicalSlug": "nousresearch/hermes-3-llama-3.1-405b",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 1,
        "outputPricePerMillion": 1,
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
        "name": "sao10k/l3-lunaris-8b",
        "canonicalSlug": "sao10k/l3-lunaris-8b",
        "isUncensored": true,
        "maxRequestTokens": 8192,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.04,
        "outputPricePerMillion": 0.049999999999999996,
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
        "name": "openai/gpt-4o-2024-08-06",
        "canonicalSlug": "openai/gpt-4o-2024-08-06",
        "isUncensored": false,
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
        }
    },
    {
        "name": "meta-llama/llama-3.1-70b-instruct",
        "canonicalSlug": "meta-llama/llama-3.1-70b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.39999999999999997,
        "outputPricePerMillion": 0.39999999999999997,
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
        "name": "meta-llama/llama-3.1-8b-instruct",
        "canonicalSlug": "meta-llama/llama-3.1-8b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.049999999999999996,
        "outputPricePerMillion": 0.08,
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
        "name": "mistralai/mistral-nemo",
        "canonicalSlug": "mistralai/mistral-nemo",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.019000000000000003,
        "outputPricePerMillion": 0.03,
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
        "name": "openai/gpt-4o-mini",
        "canonicalSlug": "openai/gpt-4o-mini",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/gpt-4o-mini-2024-07-18",
        "canonicalSlug": "openai/gpt-4o-mini-2024-07-18",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/gpt-4o-mini:batch",
        "canonicalSlug": "openai/gpt-4o-mini",
        "isUncensored": false,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.075,
        "outputPricePerMillion": 0.3,
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
        "name": "google/gemma-2-27b-it",
        "canonicalSlug": "google/gemma-2-27b-it",
        "isUncensored": true,
        "maxRequestTokens": 8192,
        "maxResponseTokens": 2048,
        "inputPricePerMillion": 0.65,
        "outputPricePerMillion": 0.65,
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
        "name": "openai/gpt-4o",
        "canonicalSlug": "openai/gpt-4o",
        "isUncensored": false,
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
        }
    },
    {
        "name": "openai/gpt-4o-2024-05-13",
        "canonicalSlug": "openai/gpt-4o-2024-05-13",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 5,
        "outputPricePerMillion": 15,
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
        "name": "openai/gpt-4o:batch",
        "canonicalSlug": "openai/gpt-4o",
        "isUncensored": false,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 5,
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
        "name": "mistralai/mixtral-8x22b-instruct",
        "canonicalSlug": "mistralai/mixtral-8x22b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 65536,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 2,
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
        }
    },
    {
        "name": "microsoft/wizardlm-2-8x22b",
        "canonicalSlug": "microsoft/wizardlm-2-8x22b",
        "isUncensored": true,
        "maxRequestTokens": 65535,
        "maxResponseTokens": 8000,
        "inputPricePerMillion": 0.62,
        "outputPricePerMillion": 0.62,
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
        "canonicalSlug": "openai/gpt-4-turbo",
        "isUncensored": false,
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
                        "text",
                        "json"
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
        "name": "openai/gpt-4-turbo:batch",
        "canonicalSlug": "openai/gpt-4-turbo",
        "isUncensored": false,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 5,
        "outputPricePerMillion": 15,
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
        "name": "anthropic/claude-3-haiku",
        "canonicalSlug": "anthropic/claude-3-haiku",
        "isUncensored": false,
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
        "name": "mistralai/mistral-large",
        "canonicalSlug": "mistralai/mistral-large",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 2,
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
        }
    },
    {
        "name": "openai/gpt-3.5-turbo-0613",
        "canonicalSlug": "openai/gpt-3.5-turbo-0613",
        "isUncensored": true,
        "maxRequestTokens": 4095,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 1,
        "outputPricePerMillion": 2,
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
        "name": "openai/gpt-4-turbo-preview",
        "canonicalSlug": "openai/gpt-4-turbo-preview",
        "isUncensored": false,
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
        "name": "openrouter/auto",
        "canonicalSlug": "openrouter/auto",
        "isUncensored": true,
        "maxRequestTokens": 2000000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": -1000000,
        "outputPricePerMillion": -1000000,
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
        "name": "openai/gpt-3.5-turbo-instruct",
        "canonicalSlug": "openai/gpt-3.5-turbo-instruct",
        "isUncensored": false,
        "maxRequestTokens": 4095,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 1.5,
        "outputPricePerMillion": 2,
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
        "name": "openai/gpt-3.5-turbo-16k",
        "canonicalSlug": "openai/gpt-3.5-turbo-16k",
        "isUncensored": true,
        "maxRequestTokens": 16385,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 3,
        "outputPricePerMillion": 4,
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
        "name": "mancer/weaver",
        "canonicalSlug": "mancer/weaver",
        "isUncensored": true,
        "maxRequestTokens": 8000,
        "maxResponseTokens": 6000,
        "inputPricePerMillion": 0.5,
        "outputPricePerMillion": 0.75,
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
        "name": "undi95/remm-slerp-l2-13b",
        "canonicalSlug": "undi95/remm-slerp-l2-13b",
        "isUncensored": true,
        "maxRequestTokens": 6144,
        "maxResponseTokens": 6144,
        "inputPricePerMillion": 0.44999999999999996,
        "outputPricePerMillion": 0.65,
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
        "name": "gryphe/mythomax-l2-13b",
        "canonicalSlug": "gryphe/mythomax-l2-13b",
        "isUncensored": true,
        "maxRequestTokens": 8192,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 0.06,
        "outputPricePerMillion": 0.06,
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
        "name": "openai/gpt-3.5-turbo",
        "canonicalSlug": "openai/gpt-3.5-turbo",
        "isUncensored": false,
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
                        "text",
                        "json"
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
        "name": "openai/gpt-3.5-turbo:batch",
        "canonicalSlug": "openai/gpt-3.5-turbo",
        "isUncensored": false,
        "maxRequestTokens": 16385,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 0.25,
        "outputPricePerMillion": 0.75,
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
        "name": "openai/gpt-4",
        "canonicalSlug": "openai/gpt-4",
        "isUncensored": true,
        "maxRequestTokens": 8191,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 30,
        "outputPricePerMillion": 60,
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
    }
];
