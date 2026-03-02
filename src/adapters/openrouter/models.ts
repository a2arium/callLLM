import type { ModelInfo } from '../../interfaces/UniversalInterfaces.ts';

/**
 * Automatically generated model list from OpenRouter API.
 * This file is managed by the scripts/fetch-openrouter-models.ts script.
 * Last updated: 2026-02-12T19:48:14.366Z
 */
export const defaultModels: ModelInfo[] = [
    {
        "name": "minimax/minimax-m2.5",
        "canonicalSlug": "minimax/minimax-m2.5-20260211",
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
        "name": "z-ai/glm-5",
        "canonicalSlug": "z-ai/glm-5-20260211",
        "isUncensored": true,
        "maxRequestTokens": 202752,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.7999999999999999,
        "outputPricePerMillion": 2.56,
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
        }
    },
    {
        "name": "openrouter/aurora-alpha",
        "canonicalSlug": "openrouter/aurora-alpha",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 50000,
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
        "name": "qwen/qwen3-coder-next",
        "canonicalSlug": "qwen/qwen3-coder-next-2025-02-03",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.07,
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
        "name": "stepfun/step-3.5-flash:free",
        "canonicalSlug": "stepfun/step-3.5-flash",
        "isUncensored": true,
        "maxRequestTokens": 256000,
        "maxResponseTokens": 256000,
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
        "name": "stepfun/step-3.5-flash",
        "canonicalSlug": "stepfun/step-3.5-flash",
        "isUncensored": true,
        "maxRequestTokens": 256000,
        "maxResponseTokens": 256000,
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
        "name": "arcee-ai/trinity-large-preview:free",
        "canonicalSlug": "arcee-ai/trinity-large-preview",
        "isUncensored": true,
        "maxRequestTokens": 131000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
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
        "name": "moonshotai/kimi-k2.5",
        "canonicalSlug": "moonshotai/kimi-k2.5-0127",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.44999999999999996,
        "outputPricePerMillion": 2.25,
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
        "name": "upstage/solar-pro-3:free",
        "canonicalSlug": "upstage/solar-pro-3",
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
        "name": "liquid/lfm-2.5-1.2b-thinking:free",
        "canonicalSlug": "liquid/lfm-2.5-1.2b-thinking-20260120",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
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
        "name": "liquid/lfm-2.5-1.2b-instruct:free",
        "canonicalSlug": "liquid/lfm-2.5-1.2b-instruct-20260120",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
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
        "name": "openai/gpt-audio-mini",
        "canonicalSlug": "openai/gpt-audio-mini",
        "isUncensored": false,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.6,
        "outputPricePerMillion": 2.4,
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
        "name": "z-ai/glm-4.7-flash",
        "canonicalSlug": "z-ai/glm-4.7-flash-20260119",
        "isUncensored": true,
        "maxRequestTokens": 202752,
        "maxResponseTokens": 0,
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
        "name": "allenai/molmo-2-8b",
        "canonicalSlug": "allenai/molmo-2-8b-20260109",
        "isUncensored": true,
        "maxRequestTokens": 36864,
        "maxResponseTokens": 36864,
        "inputPricePerMillion": 0.19999999999999998,
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
        "name": "allenai/olmo-3.1-32b-instruct",
        "canonicalSlug": "allenai/olmo-3.1-32b-instruct-20251215",
        "isUncensored": true,
        "maxRequestTokens": 65536,
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
        "maxRequestTokens": 196608,
        "maxResponseTokens": 0,
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
        "name": "z-ai/glm-4.7",
        "canonicalSlug": "z-ai/glm-4.7-20251222",
        "isUncensored": true,
        "maxRequestTokens": 202752,
        "maxResponseTokens": 65535,
        "inputPricePerMillion": 0.39999999999999997,
        "outputPricePerMillion": 1.5,
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
        "name": "google/gemini-3-flash-preview",
        "canonicalSlug": "google/gemini-3-flash-preview-20251217",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 65535,
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
        "name": "mistralai/mistral-small-creative",
        "canonicalSlug": "mistralai/mistral-small-creative-20251216",
        "isUncensored": true,
        "maxRequestTokens": 32768,
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
        "name": "allenai/olmo-3.1-32b-think",
        "canonicalSlug": "allenai/olmo-3.1-32b-think-20251215",
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
        "name": "xiaomi/mimo-v2-flash",
        "canonicalSlug": "xiaomi/mimo-v2-flash-20251210",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.09,
        "outputPricePerMillion": 0.29,
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
        "name": "nvidia/nemotron-3-nano-30b-a3b",
        "canonicalSlug": "nvidia/nemotron-3-nano-30b-a3b",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 0,
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
        "name": "openai/gpt-5.2-chat",
        "canonicalSlug": "openai/gpt-5.2-chat-20251211",
        "isUncensored": false,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
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
        "name": "mistralai/devstral-2512",
        "canonicalSlug": "mistralai/devstral-2512",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.049999999999999996,
        "outputPricePerMillion": 0.22,
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
        "name": "z-ai/glm-4.6v",
        "canonicalSlug": "z-ai/glm-4.6-20251208",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
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
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "nex-agi/deepseek-v3.1-nex-n1",
        "canonicalSlug": "nex-agi/deepseek-v3.1-nex-n1",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 163840,
        "inputPricePerMillion": 0.27,
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
        "name": "essentialai/rnj-1-instruct",
        "canonicalSlug": "essentialai/rnj-1-instruct",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.15,
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
        "name": "arcee-ai/trinity-mini:free",
        "canonicalSlug": "arcee-ai/trinity-mini-20251201",
        "isUncensored": true,
        "maxRequestTokens": 131072,
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
        "name": "arcee-ai/trinity-mini",
        "canonicalSlug": "arcee-ai/trinity-mini-20251201",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.045,
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
        }
    },
    {
        "name": "deepseek/deepseek-v3.2-speciale",
        "canonicalSlug": "deepseek/deepseek-v3.2-speciale-20251201",
        "isUncensored": true,
        "maxRequestTokens": 163840,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.27,
        "outputPricePerMillion": 0.41,
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
        "name": "deepseek/deepseek-v3.2",
        "canonicalSlug": "deepseek/deepseek-v3.2-20251201",
        "isUncensored": true,
        "maxRequestTokens": 163840,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.25,
        "outputPricePerMillion": 0.38,
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
        "name": "prime-intellect/intellect-3",
        "canonicalSlug": "prime-intellect/intellect-3-20251126",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
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
        }
    },
    {
        "name": "tngtech/tng-r1t-chimera:free",
        "canonicalSlug": "tngtech/tng-r1t-chimera",
        "isUncensored": true,
        "maxRequestTokens": 163840,
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
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "tngtech/tng-r1t-chimera",
        "canonicalSlug": "tngtech/tng-r1t-chimera",
        "isUncensored": true,
        "maxRequestTokens": 163840,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.25,
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
        "name": "allenai/olmo-3-7b-instruct",
        "canonicalSlug": "allenai/olmo-3-7b-instruct-20251121",
        "isUncensored": true,
        "maxRequestTokens": 65536,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.09999999999999999,
        "outputPricePerMillion": 0.19999999999999998,
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
        "name": "allenai/olmo-3-7b-think",
        "canonicalSlug": "allenai/olmo-3-7b-think-20251121",
        "isUncensored": true,
        "maxRequestTokens": 65536,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.12,
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
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
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
        "name": "x-ai/grok-4.1-fast",
        "canonicalSlug": "x-ai/grok-4.1-fast",
        "isUncensored": true,
        "maxRequestTokens": 2000000,
        "maxResponseTokens": 30000,
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
        }
    },
    {
        "name": "google/gemini-3-pro-preview",
        "canonicalSlug": "google/gemini-3-pro-preview-20251117",
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
        "name": "openai/gpt-5.1-chat",
        "canonicalSlug": "openai/gpt-5.1-chat-20251113",
        "isUncensored": false,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 1.25,
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
        "name": "openai/gpt-5.1-codex",
        "canonicalSlug": "openai/gpt-5.1-codex-20251113",
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
        "name": "openai/gpt-5.1-codex-mini",
        "canonicalSlug": "openai/gpt-5.1-codex-mini-20251113",
        "isUncensored": false,
        "maxRequestTokens": 400000,
        "maxResponseTokens": 100000,
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
        "name": "kwaipilot/kat-coder-pro",
        "canonicalSlug": "kwaipilot/kat-coder-pro-v1",
        "isUncensored": true,
        "maxRequestTokens": 256000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0.207,
        "outputPricePerMillion": 0.828,
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
        "name": "moonshotai/kimi-k2-thinking",
        "canonicalSlug": "moonshotai/kimi-k2-thinking-20251106",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 65535,
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
        "name": "nvidia/nemotron-nano-12b-v2-vl",
        "canonicalSlug": "nvidia/nemotron-nano-12b-v2-vl",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.19999999999999998,
        "outputPricePerMillion": 0.6,
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
        "name": "minimax/minimax-m2",
        "canonicalSlug": "minimax/minimax-m2",
        "isUncensored": true,
        "maxRequestTokens": 196608,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.255,
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
        "name": "liquid/lfm2-8b-a1b",
        "canonicalSlug": "liquid/lfm2-8b-a1b",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.01,
        "outputPricePerMillion": 0.02,
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
        "name": "liquid/lfm-2.2-6b",
        "canonicalSlug": "liquid/lfm-2.2-6b",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.01,
        "outputPricePerMillion": 0.02,
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
        "name": "ibm-granite/granite-4.0-h-micro",
        "canonicalSlug": "ibm-granite/granite-4.0-h-micro",
        "isUncensored": true,
        "maxRequestTokens": 131000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.017,
        "outputPricePerMillion": 0.11,
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
        "name": "openai/gpt-5-image-mini",
        "canonicalSlug": "openai/gpt-5-image-mini",
        "isUncensored": false,
        "maxRequestTokens": 400000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 2.5,
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
        "name": "anthropic/claude-haiku-4.5",
        "canonicalSlug": "anthropic/claude-4.5-haiku-20251001",
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
        "name": "qwen/qwen3-vl-8b-thinking",
        "canonicalSlug": "qwen/qwen3-vl-8b-thinking",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.117,
        "outputPricePerMillion": 1.365,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
            "parallelToolCalls": false,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
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
        "maxRequestTokens": 131072,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.08,
        "outputPricePerMillion": 0.5,
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
            "toolCalls": true,
            "parallelToolCalls": false,
            "reasoning": true,
            "input": {
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "openai/o3-deep-research",
        "canonicalSlug": "openai/o3-deep-research-2025-06-26",
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
        "name": "openai/o4-mini-deep-research",
        "canonicalSlug": "openai/o4-mini-deep-research-2025-06-26",
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
        "name": "nvidia/llama-3.3-nemotron-super-49b-v1.5",
        "canonicalSlug": "nvidia/llama-3.3-nemotron-super-49b-v1.5",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.09999999999999999,
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
        "name": "baidu/ernie-4.5-21b-a3b-thinking",
        "canonicalSlug": "baidu/ernie-4.5-21b-a3b-thinking",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.07,
        "outputPricePerMillion": 0.28,
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
        "name": "google/gemini-2.5-flash-image",
        "canonicalSlug": "google/gemini-2.5-flash-image",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 32768,
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
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
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
        "maxRequestTokens": 131072,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.13,
        "outputPricePerMillion": 0.52,
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
        "name": "z-ai/glm-4.6",
        "canonicalSlug": "z-ai/glm-4.6",
        "isUncensored": true,
        "maxRequestTokens": 202752,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.35,
        "outputPricePerMillion": 1.5,
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
        "name": "z-ai/glm-4.6:exacto",
        "canonicalSlug": "z-ai/glm-4.6",
        "isUncensored": true,
        "maxRequestTokens": 204800,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.44,
        "outputPricePerMillion": 1.76,
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
        "isUncensored": true,
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
        "name": "google/gemini-2.5-flash-preview-09-2025",
        "canonicalSlug": "google/gemini-2.5-flash-preview-09-2025",
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
        "name": "google/gemini-2.5-flash-lite-preview-09-2025",
        "canonicalSlug": "google/gemini-2.5-flash-lite-preview-09-2025",
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
        "name": "qwen/qwen3-vl-235b-a22b-thinking",
        "canonicalSlug": "qwen/qwen3-vl-235b-a22b-thinking",
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
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
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
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.19999999999999998,
        "outputPricePerMillion": 0.88,
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
        "name": "qwen/qwen3-coder-plus",
        "canonicalSlug": "qwen/qwen3-coder-plus",
        "isUncensored": true,
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
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
            }
        },
        "characteristics": {
            "qualityIndex": 50,
            "outputSpeed": 50,
            "firstTokenLatency": 1000
        }
    },
    {
        "name": "openai/gpt-5-codex",
        "canonicalSlug": "openai/gpt-5-codex",
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
        "name": "deepseek/deepseek-v3.1-terminus:exacto",
        "canonicalSlug": "deepseek/deepseek-v3.1-terminus",
        "isUncensored": true,
        "maxRequestTokens": 163840,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.21,
        "outputPricePerMillion": 0.7899999999999999,
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
        "name": "deepseek/deepseek-v3.1-terminus",
        "canonicalSlug": "deepseek/deepseek-v3.1-terminus",
        "isUncensored": true,
        "maxRequestTokens": 163840,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.21,
        "outputPricePerMillion": 0.7899999999999999,
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
        "name": "x-ai/grok-4-fast",
        "canonicalSlug": "x-ai/grok-4-fast",
        "isUncensored": true,
        "maxRequestTokens": 2000000,
        "maxResponseTokens": 30000,
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
        }
    },
    {
        "name": "alibaba/tongyi-deepresearch-30b-a3b",
        "canonicalSlug": "alibaba/tongyi-deepresearch-30b-a3b",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.09,
        "outputPricePerMillion": 0.44999999999999996,
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
        "inputPricePerMillion": 0.3,
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
        "name": "opengvlab/internvl3-78b",
        "canonicalSlug": "opengvlab/internvl3-78b",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.15,
        "outputPricePerMillion": 0.6,
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
        "name": "qwen/qwen3-next-80b-a3b-thinking",
        "canonicalSlug": "qwen/qwen3-next-80b-a3b-thinking-2509",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 0,
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
        "name": "qwen/qwen3-next-80b-a3b-instruct:free",
        "canonicalSlug": "qwen/qwen3-next-80b-a3b-instruct-2509",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
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
        "name": "qwen/qwen3-next-80b-a3b-instruct",
        "canonicalSlug": "qwen/qwen3-next-80b-a3b-instruct-2509",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.09,
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
        "name": "meituan/longcat-flash-chat",
        "canonicalSlug": "meituan/longcat-flash-chat",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.19999999999999998,
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
        "name": "qwen/qwen-plus-2025-07-28",
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
        "name": "nvidia/nemotron-nano-9b-v2",
        "canonicalSlug": "nvidia/nemotron-nano-9b-v2",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.04,
        "outputPricePerMillion": 0.16,
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
        "name": "moonshotai/kimi-k2-0905",
        "canonicalSlug": "moonshotai/kimi-k2-0905",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.39,
        "outputPricePerMillion": 1.9,
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
        "name": "moonshotai/kimi-k2-0905:exacto",
        "canonicalSlug": "moonshotai/kimi-k2-0905",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 0,
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
        "maxRequestTokens": 32768,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.051,
        "outputPricePerMillion": 0.33999999999999997,
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
        "name": "x-ai/grok-code-fast-1",
        "canonicalSlug": "x-ai/grok-code-fast-1",
        "isUncensored": true,
        "maxRequestTokens": 256000,
        "maxResponseTokens": 10000,
        "inputPricePerMillion": 0.19999999999999998,
        "outputPricePerMillion": 1.5,
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
        "name": "nousresearch/hermes-4-70b",
        "canonicalSlug": "nousresearch/hermes-4-70b",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.11,
        "outputPricePerMillion": 0.38,
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
        "maxRequestTokens": 32768,
        "maxResponseTokens": 7168,
        "inputPricePerMillion": 0.15,
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
        "name": "openai/gpt-4o-audio-preview",
        "canonicalSlug": "openai/gpt-4o-audio-preview",
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
        "name": "baidu/ernie-4.5-21b-a3b",
        "canonicalSlug": "baidu/ernie-4.5-21b-a3b",
        "isUncensored": true,
        "maxRequestTokens": 120000,
        "maxResponseTokens": 8000,
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
        "name": "baidu/ernie-4.5-vl-28b-a3b",
        "canonicalSlug": "baidu/ernie-4.5-vl-28b-a3b",
        "isUncensored": true,
        "maxRequestTokens": 30000,
        "maxResponseTokens": 8000,
        "inputPricePerMillion": 0.14,
        "outputPricePerMillion": 0.56,
        "capabilities": {
            "streaming": true,
            "toolCalls": true,
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
                    "structuredOutputs": true
                }
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
        "name": "openai/gpt-5-chat",
        "canonicalSlug": "openai/gpt-5-chat-2025-08-07",
        "isUncensored": false,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 1.25,
        "outputPricePerMillion": 10,
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
        "name": "openai/gpt-oss-120b:free",
        "canonicalSlug": "openai/gpt-oss-120b",
        "isUncensored": false,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
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
        "name": "openai/gpt-oss-120b",
        "canonicalSlug": "openai/gpt-oss-120b",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.039,
        "outputPricePerMillion": 0.19,
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
        "name": "openai/gpt-oss-120b:exacto",
        "canonicalSlug": "openai/gpt-oss-120b",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.039,
        "outputPricePerMillion": 0.19,
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
        "isUncensored": false,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
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
        "name": "openai/gpt-oss-20b",
        "canonicalSlug": "openai/gpt-oss-20b",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
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
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
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
        "maxRequestTokens": 160000,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.07,
        "outputPricePerMillion": 0.27,
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
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.08,
        "outputPricePerMillion": 0.33,
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
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.35,
        "outputPricePerMillion": 1.55,
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
        "name": "z-ai/glm-4.5-air:free",
        "canonicalSlug": "z-ai/glm-4.5-air",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 96000,
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
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
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
        "maxResponseTokens": 262144,
        "inputPricePerMillion": 0.11,
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
        "name": "z-ai/glm-4-32b",
        "canonicalSlug": "z-ai/glm-4-32b-0414",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.09999999999999999,
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
        "name": "qwen/qwen3-coder:free",
        "canonicalSlug": "qwen/qwen3-coder-480b-a35b-07-25",
        "isUncensored": true,
        "maxRequestTokens": 262000,
        "maxResponseTokens": 262000,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
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
        "name": "qwen/qwen3-coder",
        "canonicalSlug": "qwen/qwen3-coder-480b-a35b-07-25",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.22,
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
        "name": "qwen/qwen3-coder:exacto",
        "canonicalSlug": "qwen/qwen3-coder-480b-a35b-07-25",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.22,
        "outputPricePerMillion": 1.7999999999999998,
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
        "name": "qwen/qwen3-235b-a22b-2507",
        "canonicalSlug": "qwen/qwen3-235b-a22b-07-25",
        "isUncensored": true,
        "maxRequestTokens": 262144,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.071,
        "outputPricePerMillion": 0.09999999999999999,
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
        "name": "switchpoint/router",
        "canonicalSlug": "switchpoint/router",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.85,
        "outputPricePerMillion": 3.4,
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
        "name": "moonshotai/kimi-k2",
        "canonicalSlug": "moonshotai/kimi-k2",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.5,
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
        "name": "mistralai/devstral-medium",
        "canonicalSlug": "mistralai/devstral-medium-2507",
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
        "name": "mistralai/devstral-small",
        "canonicalSlug": "mistralai/devstral-small-2507",
        "isUncensored": true,
        "maxRequestTokens": 131072,
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
        "name": "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
        "canonicalSlug": "venice/uncensored",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
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
        "name": "x-ai/grok-4",
        "canonicalSlug": "x-ai/grok-4-07-09",
        "isUncensored": true,
        "maxRequestTokens": 256000,
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
        "name": "google/gemma-3n-e2b-it:free",
        "canonicalSlug": "google/gemma-3n-e2b-it",
        "isUncensored": true,
        "maxRequestTokens": 8192,
        "maxResponseTokens": 2048,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
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
        "name": "tngtech/deepseek-r1t2-chimera:free",
        "canonicalSlug": "tngtech/deepseek-r1t2-chimera",
        "isUncensored": true,
        "maxRequestTokens": 163840,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
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
        "name": "tngtech/deepseek-r1t2-chimera",
        "canonicalSlug": "tngtech/deepseek-r1t2-chimera",
        "isUncensored": true,
        "maxRequestTokens": 163840,
        "maxResponseTokens": 163840,
        "inputPricePerMillion": 0.25,
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
        "name": "baidu/ernie-4.5-300b-a47b",
        "canonicalSlug": "baidu/ernie-4.5-300b-a47b",
        "isUncensored": true,
        "maxRequestTokens": 123000,
        "maxResponseTokens": 12000,
        "inputPricePerMillion": 0.28,
        "outputPricePerMillion": 1.1,
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
        "name": "inception/mercury",
        "canonicalSlug": "inception/mercury",
        "isUncensored": true,
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
        "name": "mistralai/mistral-small-3.2-24b-instruct",
        "canonicalSlug": "mistralai/mistral-small-3.2-24b-instruct-2506",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.06,
        "outputPricePerMillion": 0.18,
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
        "inputPricePerMillion": 0.39999999999999997,
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
        "name": "x-ai/grok-3-mini",
        "canonicalSlug": "x-ai/grok-3-mini",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.3,
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
        "name": "x-ai/grok-3",
        "canonicalSlug": "x-ai/grok-3",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 3,
        "outputPricePerMillion": 15,
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
        "name": "deepseek/deepseek-r1-0528:free",
        "canonicalSlug": "deepseek/deepseek-r1-0528",
        "isUncensored": true,
        "maxRequestTokens": 163840,
        "maxResponseTokens": 163840,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
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
        "name": "deepseek/deepseek-r1-0528",
        "canonicalSlug": "deepseek/deepseek-r1-0528",
        "isUncensored": true,
        "maxRequestTokens": 163840,
        "maxResponseTokens": 65536,
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
        "name": "anthropic/claude-opus-4",
        "canonicalSlug": "anthropic/claude-4-opus-20250522",
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
        "name": "anthropic/claude-sonnet-4",
        "canonicalSlug": "anthropic/claude-4-sonnet-20250522",
        "isUncensored": true,
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
        "name": "google/gemma-3n-e4b-it:free",
        "canonicalSlug": "google/gemma-3n-e4b-it",
        "isUncensored": true,
        "maxRequestTokens": 8192,
        "maxResponseTokens": 2048,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
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
        "name": "google/gemma-3n-e4b-it",
        "canonicalSlug": "google/gemma-3n-e4b-it",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.02,
        "outputPricePerMillion": 0.04,
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
        "name": "nousresearch/deephermes-3-mistral-24b-preview",
        "canonicalSlug": "nousresearch/deephermes-3-mistral-24b-preview",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.02,
        "outputPricePerMillion": 0.09999999999999999,
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
        "name": "arcee-ai/spotlight",
        "canonicalSlug": "arcee-ai/spotlight",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 65537,
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
        "name": "arcee-ai/maestro-reasoning",
        "canonicalSlug": "arcee-ai/maestro-reasoning",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 32000,
        "inputPricePerMillion": 0.8999999999999999,
        "outputPricePerMillion": 3.3000000000000003,
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
        "name": "arcee-ai/coder-large",
        "canonicalSlug": "arcee-ai/coder-large",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.5,
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
        "name": "inception/mercury-coder",
        "canonicalSlug": "inception/mercury-coder-small-beta",
        "isUncensored": true,
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
        "name": "qwen/qwen3-4b:free",
        "canonicalSlug": "qwen/qwen3-4b-04-28",
        "isUncensored": true,
        "maxRequestTokens": 40960,
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
        "name": "meta-llama/llama-guard-4-12b",
        "canonicalSlug": "meta-llama/llama-guard-4-12b",
        "isUncensored": true,
        "maxRequestTokens": 163840,
        "maxResponseTokens": 0,
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
        "maxRequestTokens": 40960,
        "maxResponseTokens": 40960,
        "inputPricePerMillion": 0.06,
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
        "name": "qwen/qwen3-8b",
        "canonicalSlug": "qwen/qwen3-8b-04-28",
        "isUncensored": true,
        "maxRequestTokens": 32000,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.049999999999999996,
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
        "name": "qwen/qwen3-14b",
        "canonicalSlug": "qwen/qwen3-14b-04-28",
        "isUncensored": true,
        "maxRequestTokens": 40960,
        "maxResponseTokens": 40960,
        "inputPricePerMillion": 0.049999999999999996,
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
        "name": "qwen/qwen3-32b",
        "canonicalSlug": "qwen/qwen3-32b-04-28",
        "isUncensored": true,
        "maxRequestTokens": 40960,
        "maxResponseTokens": 40960,
        "inputPricePerMillion": 0.08,
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
        "name": "qwen/qwen3-235b-a22b",
        "canonicalSlug": "qwen/qwen3-235b-a22b-04-28",
        "isUncensored": true,
        "maxRequestTokens": 40960,
        "maxResponseTokens": 40960,
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
        "name": "tngtech/deepseek-r1t-chimera:free",
        "canonicalSlug": "tngtech/deepseek-r1t-chimera",
        "isUncensored": true,
        "maxRequestTokens": 163840,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
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
        "name": "tngtech/deepseek-r1t-chimera",
        "canonicalSlug": "tngtech/deepseek-r1t-chimera",
        "isUncensored": true,
        "maxRequestTokens": 163840,
        "maxResponseTokens": 163840,
        "inputPricePerMillion": 0.3,
        "outputPricePerMillion": 1.2,
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
        "name": "qwen/qwen2.5-coder-7b-instruct",
        "canonicalSlug": "qwen/qwen2.5-coder-7b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.03,
        "outputPricePerMillion": 0.09,
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
        "name": "eleutherai/llemma_7b",
        "canonicalSlug": "eleutherai/llemma_7b",
        "isUncensored": true,
        "maxRequestTokens": 4096,
        "maxResponseTokens": 4096,
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
        "name": "alfredpros/codellama-7b-instruct-solidity",
        "canonicalSlug": "alfredpros/codellama-7b-instruct-solidity",
        "isUncensored": true,
        "maxRequestTokens": 4096,
        "maxResponseTokens": 4096,
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
        "name": "x-ai/grok-3-mini-beta",
        "canonicalSlug": "x-ai/grok-3-mini-beta",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.3,
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
        "name": "x-ai/grok-3-beta",
        "canonicalSlug": "x-ai/grok-3-beta",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 3,
        "outputPricePerMillion": 15,
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
        "name": "nvidia/llama-3.1-nemotron-ultra-253b-v1",
        "canonicalSlug": "nvidia/llama-3.1-nemotron-ultra-253b-v1",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.6,
        "outputPricePerMillion": 1.7999999999999998,
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
        "name": "meta-llama/llama-4-maverick",
        "canonicalSlug": "meta-llama/llama-4-maverick-17b-128e-instruct",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
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
        "name": "meta-llama/llama-4-scout",
        "canonicalSlug": "meta-llama/llama-4-scout-17b-16e-instruct",
        "isUncensored": true,
        "maxRequestTokens": 327680,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.08,
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
        "name": "qwen/qwen2.5-vl-32b-instruct",
        "canonicalSlug": "qwen/qwen2.5-vl-32b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 16384,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.049999999999999996,
        "outputPricePerMillion": 0.22,
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
        "name": "deepseek/deepseek-chat-v3-0324",
        "canonicalSlug": "deepseek/deepseek-chat-v3-0324",
        "isUncensored": true,
        "maxRequestTokens": 163840,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.19,
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
        "name": "mistralai/mistral-small-3.1-24b-instruct:free",
        "canonicalSlug": "mistralai/mistral-small-3.1-24b-instruct-2503",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
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
        "name": "mistralai/mistral-small-3.1-24b-instruct",
        "canonicalSlug": "mistralai/mistral-small-3.1-24b-instruct-2503",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.03,
        "outputPricePerMillion": 0.11,
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
        "name": "allenai/olmo-2-0325-32b-instruct",
        "canonicalSlug": "allenai/olmo-2-0325-32b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.049999999999999996,
        "outputPricePerMillion": 0.19999999999999998,
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
        "name": "google/gemma-3-4b-it:free",
        "canonicalSlug": "google/gemma-3-4b-it",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 8192,
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
        "name": "google/gemma-3-4b-it",
        "canonicalSlug": "google/gemma-3-4b-it",
        "isUncensored": true,
        "maxRequestTokens": 96000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.01703012,
        "outputPricePerMillion": 0.0681536,
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
        "name": "google/gemma-3-12b-it:free",
        "canonicalSlug": "google/gemma-3-12b-it",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 8192,
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
        "name": "google/gemma-3-12b-it",
        "canonicalSlug": "google/gemma-3-12b-it",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.03,
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
        "name": "openai/gpt-4o-mini-search-preview",
        "canonicalSlug": "openai/gpt-4o-mini-search-preview-2025-03-11",
        "isUncensored": false,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.15,
        "outputPricePerMillion": 0.6,
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
        "name": "openai/gpt-4o-search-preview",
        "canonicalSlug": "openai/gpt-4o-search-preview-2025-03-11",
        "isUncensored": false,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
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
        "name": "google/gemma-3-27b-it:free",
        "canonicalSlug": "google/gemma-3-27b-it",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
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
        "name": "google/gemma-3-27b-it",
        "canonicalSlug": "google/gemma-3-27b-it",
        "isUncensored": true,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.04,
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
        "name": "qwen/qwq-32b",
        "canonicalSlug": "qwen/qwq-32b",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.15,
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
        "name": "google/gemini-2.0-flash-lite-001",
        "canonicalSlug": "google/gemini-2.0-flash-lite-001",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 8192,
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
        "name": "anthropic/claude-3.7-sonnet:thinking",
        "canonicalSlug": "anthropic/claude-3-7-sonnet-20250219",
        "isUncensored": true,
        "maxRequestTokens": 200000,
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
        "name": "anthropic/claude-3.7-sonnet",
        "canonicalSlug": "anthropic/claude-3-7-sonnet-20250219",
        "isUncensored": true,
        "maxRequestTokens": 200000,
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
        "name": "meta-llama/llama-guard-3-8b",
        "canonicalSlug": "meta-llama/llama-guard-3-8b",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.02,
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
        "name": "google/gemini-2.0-flash-001",
        "canonicalSlug": "google/gemini-2.0-flash-001",
        "isUncensored": true,
        "maxRequestTokens": 1048576,
        "maxResponseTokens": 8192,
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
        "name": "qwen/qwen-vl-plus",
        "canonicalSlug": "qwen/qwen-vl-plus",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.21,
        "outputPricePerMillion": 0.63,
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
        "name": "aion-labs/aion-1.0",
        "canonicalSlug": "aion-labs/aion-1.0",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 4,
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
        "name": "aion-labs/aion-1.0-mini",
        "canonicalSlug": "aion-labs/aion-1.0-mini",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.7,
        "outputPricePerMillion": 1.4,
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
        "name": "qwen/qwen-vl-max",
        "canonicalSlug": "qwen/qwen-vl-max-2025-01-25",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 32768,
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
        "name": "qwen/qwen-turbo",
        "canonicalSlug": "qwen/qwen-turbo-2024-11-01",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.049999999999999996,
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
        "maxRequestTokens": 32768,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.15,
        "outputPricePerMillion": 0.6,
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
        "inputPricePerMillion": 0.39999999999999997,
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
        "name": "qwen/qwen-max",
        "canonicalSlug": "qwen/qwen-max-2025-01-25",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 1.5999999999999999,
        "outputPricePerMillion": 6.3999999999999995,
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
        "name": "mistralai/mistral-small-24b-instruct-2501",
        "canonicalSlug": "mistralai/mistral-small-24b-instruct-2501",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 16384,
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
        "name": "deepseek/deepseek-r1-distill-qwen-32b",
        "canonicalSlug": "deepseek/deepseek-r1-distill-qwen-32b",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.29,
        "outputPricePerMillion": 0.29,
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
        "maxRequestTokens": 131072,
        "maxResponseTokens": 131072,
        "inputPricePerMillion": 0.03,
        "outputPricePerMillion": 0.11,
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
        "name": "deepseek/deepseek-r1",
        "canonicalSlug": "deepseek/deepseek-r1",
        "isUncensored": true,
        "maxRequestTokens": 64000,
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
        "inputPricePerMillion": 0.06,
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
        "name": "sao10k/l3.1-70b-hanami-x1",
        "canonicalSlug": "sao10k/l3.1-70b-hanami-x1",
        "isUncensored": true,
        "maxRequestTokens": 16000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 3,
        "outputPricePerMillion": 3,
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
        "name": "deepseek/deepseek-chat",
        "canonicalSlug": "deepseek/deepseek-chat-v3",
        "isUncensored": true,
        "maxRequestTokens": 163840,
        "maxResponseTokens": 163840,
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
        "name": "meta-llama/llama-3.3-70b-instruct:free",
        "canonicalSlug": "meta-llama/llama-3.3-70b-instruct",
        "isUncensored": false,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 128000,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
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
        "name": "mistralai/mistral-large-2411",
        "canonicalSlug": "mistralai/mistral-large-2411",
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
        "name": "mistralai/pixtral-large-2411",
        "canonicalSlug": "mistralai/pixtral-large-2411",
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
                "text": true,
                "image": true
            },
            "output": {
                "text": {
                    "textOutputFormats": [
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
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
        "inputPricePerMillion": 0.03,
        "outputPricePerMillion": 0.11,
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
        "name": "raifle/sorcererlm-8x22b",
        "canonicalSlug": "raifle/sorcererlm-8x22b",
        "isUncensored": true,
        "maxRequestTokens": 16000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 4.5,
        "outputPricePerMillion": 4.5,
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
        "maxRequestTokens": 32768,
        "maxResponseTokens": 32768,
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
        "name": "anthropic/claude-3.5-haiku",
        "canonicalSlug": "anthropic/claude-3-5-haiku",
        "isUncensored": false,
        "maxRequestTokens": 200000,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.7999999999999999,
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
        "name": "anthracite-org/magnum-v4-72b",
        "canonicalSlug": "anthracite-org/magnum-v4-72b",
        "isUncensored": true,
        "maxRequestTokens": 16384,
        "maxResponseTokens": 2048,
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
        "name": "anthropic/claude-3.5-sonnet",
        "canonicalSlug": "anthropic/claude-3.5-sonnet",
        "isUncensored": false,
        "maxRequestTokens": 200000,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 6,
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
        "name": "qwen/qwen-2.5-7b-instruct",
        "canonicalSlug": "qwen/qwen-2.5-7b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.04,
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
        "name": "nvidia/llama-3.1-nemotron-70b-instruct",
        "canonicalSlug": "nvidia/llama-3.1-nemotron-70b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 1.2,
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
        "name": "inflection/inflection-3-pi",
        "canonicalSlug": "inflection/inflection-3-pi",
        "isUncensored": true,
        "maxRequestTokens": 8000,
        "maxResponseTokens": 1024,
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
        "name": "inflection/inflection-3-productivity",
        "canonicalSlug": "inflection/inflection-3-productivity",
        "isUncensored": true,
        "maxRequestTokens": 8000,
        "maxResponseTokens": 1024,
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
        "name": "thedrummer/rocinante-12b",
        "canonicalSlug": "thedrummer/rocinante-12b",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.16999999999999998,
        "outputPricePerMillion": 0.43,
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
        "name": "meta-llama/llama-3.2-3b-instruct:free",
        "canonicalSlug": "meta-llama/llama-3.2-3b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
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
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.02,
        "outputPricePerMillion": 0.02,
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
        "name": "meta-llama/llama-3.2-1b-instruct",
        "canonicalSlug": "meta-llama/llama-3.2-1b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 60000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.027,
        "outputPricePerMillion": 0.19999999999999998,
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
        "name": "meta-llama/llama-3.2-11b-vision-instruct",
        "canonicalSlug": "meta-llama/llama-3.2-11b-vision-instruct",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.049,
        "outputPricePerMillion": 0.049,
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
        "name": "qwen/qwen-2.5-72b-instruct",
        "canonicalSlug": "qwen/qwen-2.5-72b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.12,
        "outputPricePerMillion": 0.39,
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
        "name": "neversleep/llama-3.1-lumimaid-8b",
        "canonicalSlug": "neversleep/llama-3.1-lumimaid-8b",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 0.09,
        "outputPricePerMillion": 0.6,
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
        "maxRequestTokens": 32768,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 0.65,
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
        "name": "qwen/qwen-2.5-vl-7b-instruct",
        "canonicalSlug": "qwen/qwen-2-vl-7b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.19999999999999998,
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
        "name": "nousresearch/hermes-3-llama-3.1-70b",
        "canonicalSlug": "nousresearch/hermes-3-llama-3.1-70b",
        "isUncensored": true,
        "maxRequestTokens": 65536,
        "maxResponseTokens": 65536,
        "inputPricePerMillion": 0.3,
        "outputPricePerMillion": 0.3,
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
        "name": "nousresearch/hermes-3-llama-3.1-405b:free",
        "canonicalSlug": "nousresearch/hermes-3-llama-3.1-405b",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0,
        "outputPricePerMillion": 0,
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
        "name": "openai/chatgpt-4o-latest",
        "canonicalSlug": "openai/chatgpt-4o-latest",
        "isUncensored": false,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 5,
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
                        "text",
                        "json"
                    ],
                    "structuredOutputs": true
                }
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
        "maxResponseTokens": 0,
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
        "isUncensored": true,
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
        "name": "meta-llama/llama-3.1-405b",
        "canonicalSlug": "meta-llama/llama-3.1-405b",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 32768,
        "inputPricePerMillion": 4,
        "outputPricePerMillion": 4,
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
        "name": "meta-llama/llama-3.1-8b-instruct",
        "canonicalSlug": "meta-llama/llama-3.1-8b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 16384,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.02,
        "outputPricePerMillion": 0.049999999999999996,
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
        "name": "meta-llama/llama-3.1-405b-instruct",
        "canonicalSlug": "meta-llama/llama-3.1-405b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 131000,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 4,
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
        "name": "meta-llama/llama-3.1-70b-instruct",
        "canonicalSlug": "meta-llama/llama-3.1-70b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 0,
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
        "name": "mistralai/mistral-nemo",
        "canonicalSlug": "mistralai/mistral-nemo",
        "isUncensored": true,
        "maxRequestTokens": 131072,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.02,
        "outputPricePerMillion": 0.04,
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
        "name": "google/gemma-2-9b-it",
        "canonicalSlug": "google/gemma-2-9b-it",
        "isUncensored": true,
        "maxRequestTokens": 8192,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.03,
        "outputPricePerMillion": 0.09,
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
        "name": "sao10k/l3-euryale-70b",
        "canonicalSlug": "sao10k/l3-euryale-70b",
        "isUncensored": true,
        "maxRequestTokens": 8192,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 1.48,
        "outputPricePerMillion": 1.48,
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
        "name": "nousresearch/hermes-2-pro-llama-3-8b",
        "canonicalSlug": "nousresearch/hermes-2-pro-llama-3-8b",
        "isUncensored": true,
        "maxRequestTokens": 8192,
        "maxResponseTokens": 8192,
        "inputPricePerMillion": 0.14,
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
        "name": "mistralai/mistral-7b-instruct",
        "canonicalSlug": "mistralai/mistral-7b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 0.19999999999999998,
        "outputPricePerMillion": 0.19999999999999998,
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
        "name": "mistralai/mistral-7b-instruct-v0.3",
        "canonicalSlug": "mistralai/mistral-7b-instruct-v0.3",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 4096,
        "inputPricePerMillion": 0.19999999999999998,
        "outputPricePerMillion": 0.19999999999999998,
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
        "name": "meta-llama/llama-guard-2-8b",
        "canonicalSlug": "meta-llama/llama-guard-2-8b",
        "isUncensored": true,
        "maxRequestTokens": 8192,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.19999999999999998,
        "outputPricePerMillion": 0.19999999999999998,
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
        "name": "openai/gpt-4o-2024-05-13",
        "canonicalSlug": "openai/gpt-4o-2024-05-13",
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
        "name": "openai/gpt-4o:extended",
        "canonicalSlug": "openai/gpt-4o",
        "isUncensored": false,
        "maxRequestTokens": 128000,
        "maxResponseTokens": 64000,
        "inputPricePerMillion": 6,
        "outputPricePerMillion": 18,
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
        "name": "meta-llama/llama-3-70b-instruct",
        "canonicalSlug": "meta-llama/llama-3-70b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 8192,
        "maxResponseTokens": 8000,
        "inputPricePerMillion": 0.51,
        "outputPricePerMillion": 0.74,
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
        "name": "meta-llama/llama-3-8b-instruct",
        "canonicalSlug": "meta-llama/llama-3-8b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 8192,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.03,
        "outputPricePerMillion": 0.04,
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
        "name": "mistralai/mistral-7b-instruct-v0.2",
        "canonicalSlug": "mistralai/mistral-7b-instruct-v0.2",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.19999999999999998,
        "outputPricePerMillion": 0.19999999999999998,
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
        "name": "mistralai/mixtral-8x7b-instruct",
        "canonicalSlug": "mistralai/mixtral-8x7b-instruct",
        "isUncensored": true,
        "maxRequestTokens": 32768,
        "maxResponseTokens": 16384,
        "inputPricePerMillion": 0.54,
        "outputPricePerMillion": 0.54,
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
        "name": "neversleep/noromaid-20b",
        "canonicalSlug": "neversleep/noromaid-20b",
        "isUncensored": true,
        "maxRequestTokens": 4096,
        "maxResponseTokens": 2048,
        "inputPricePerMillion": 1,
        "outputPricePerMillion": 1.75,
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
        "name": "alpindale/goliath-120b",
        "canonicalSlug": "alpindale/goliath-120b",
        "isUncensored": true,
        "maxRequestTokens": 6144,
        "maxResponseTokens": 1024,
        "inputPricePerMillion": 3.75,
        "outputPricePerMillion": 7.5,
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
        "name": "openai/gpt-4-1106-preview",
        "canonicalSlug": "openai/gpt-4-1106-preview",
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
        "name": "mistralai/mistral-7b-instruct-v0.1",
        "canonicalSlug": "mistralai/mistral-7b-instruct-v0.1",
        "isUncensored": true,
        "maxRequestTokens": 2824,
        "maxResponseTokens": 0,
        "inputPricePerMillion": 0.11,
        "outputPricePerMillion": 0.19,
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
        "name": "openai/gpt-3.5-turbo-16k",
        "canonicalSlug": "openai/gpt-3.5-turbo-16k",
        "isUncensored": false,
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
        "maxResponseTokens": 2000,
        "inputPricePerMillion": 0.75,
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
        "name": "undi95/remm-slerp-l2-13b",
        "canonicalSlug": "undi95/remm-slerp-l2-13b",
        "isUncensored": true,
        "maxRequestTokens": 6144,
        "maxResponseTokens": 4096,
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
        "maxRequestTokens": 4096,
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
        "name": "openai/gpt-4-0314",
        "canonicalSlug": "openai/gpt-4-0314",
        "isUncensored": false,
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
    },
    {
        "name": "openai/gpt-4",
        "canonicalSlug": "openai/gpt-4",
        "isUncensored": false,
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
    }
];
