import { jest } from "@jest/globals"; import { ModelSelector } from '../../../../core/models/ModelSelector.ts';
import type { ModelInfo, ModelAlias, ModelCapabilities } from '../../../../interfaces/UniversalInterfaces.ts';

describe('ModelSelector', () => {
  // Test models with various characteristics
  const models: ModelInfo[] = [
    {
      name: 'cheap-model',
      inputPricePerMillion: 10,
      outputPricePerMillion: 15,
      maxRequestTokens: 1000,
      maxResponseTokens: 1000,
      characteristics: {
        qualityIndex: 75,
        outputSpeed: 120,
        firstTokenLatency: 2000
      }
    },
    {
      name: 'balanced-model',
      inputPricePerMillion: 50,
      outputPricePerMillion: 75,
      maxRequestTokens: 2000,
      maxResponseTokens: 2000,
      characteristics: {
        qualityIndex: 85,
        outputSpeed: 150,
        firstTokenLatency: 1500
      }
    },
    {
      name: 'fast-model',
      inputPricePerMillion: 100,
      outputPricePerMillion: 150,
      maxRequestTokens: 3000,
      maxResponseTokens: 3000,
      characteristics: {
        qualityIndex: 80,
        outputSpeed: 200,
        firstTokenLatency: 1000
      }
    },
    {
      name: 'premium-model',
      inputPricePerMillion: 200,
      outputPricePerMillion: 300,
      maxRequestTokens: 4000,
      maxResponseTokens: 4000,
      characteristics: {
        qualityIndex: 95,
        outputSpeed: 180,
        firstTokenLatency: 1200
      }
    }
  ];

  // Enhanced test models with capabilities for capability-aware testing
  const modelsWithCapabilities: ModelInfo[] = [
    {
      name: 'chat-cheap',
      inputPricePerMillion: 5,
      outputPricePerMillion: 10,
      maxRequestTokens: 2000,
      maxResponseTokens: 1000,
      characteristics: {
        qualityIndex: 70,
        outputSpeed: 100,
        firstTokenLatency: 3000
      },
      capabilities: {
        streaming: true,
        toolCalls: false,
        parallelToolCalls: false,
        batchProcessing: false,
        reasoning: false,
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
      name: 'chat-balanced',
      inputPricePerMillion: 20,
      outputPricePerMillion: 40,
      maxRequestTokens: 4000,
      maxResponseTokens: 2000,
      characteristics: {
        qualityIndex: 85,
        outputSpeed: 150,
        firstTokenLatency: 2000
      },
      capabilities: {
        streaming: true,
        toolCalls: true,
        parallelToolCalls: false,
        batchProcessing: false,
        reasoning: false,
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
      name: 'chat-premium',
      inputPricePerMillion: 50,
      outputPricePerMillion: 100,
      maxRequestTokens: 8000,
      maxResponseTokens: 4000,
      characteristics: {
        qualityIndex: 95,
        outputSpeed: 200,
        firstTokenLatency: 1000
      },
      capabilities: {
        streaming: true,
        toolCalls: true,
        parallelToolCalls: true,
        batchProcessing: false,
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
      }
    },
    {
      name: 'embedding-cheap',
      inputPricePerMillion: 0.1,
      outputPricePerMillion: 0,
      maxRequestTokens: 1000,
      maxResponseTokens: 0,
      characteristics: {
        qualityIndex: 80,
        outputSpeed: 0,
        firstTokenLatency: 50
      },
      capabilities: {
        streaming: false,
        toolCalls: false,
        parallelToolCalls: false,
        batchProcessing: false,
        reasoning: false,
        input: {
          text: true
        },
        output: {
          text: false // Embeddings don't output text
        },
        embeddings: {
          maxInputLength: 1000,
          dimensions: [512, 1536],
          defaultDimensions: 1536,
          encodingFormats: ['float', 'base64']
        }
      }
    },
    {
      name: 'image-generator',
      inputPricePerMillion: 25,
      outputPricePerMillion: 0,
      maxRequestTokens: 4000,
      maxResponseTokens: 1000,
      characteristics: {
        qualityIndex: 90,
        outputSpeed: 50,
        firstTokenLatency: 5000
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
          image: {
            generate: true,
            edit: false,
            editWithMask: false
          }
        }
      }
    },
    {
      name: 'text-only-model',
      inputPricePerMillion: 15,
      outputPricePerMillion: 30,
      maxRequestTokens: 3000,
      maxResponseTokens: 1500,
      characteristics: {
        qualityIndex: 75,
        outputSpeed: 120,
        firstTokenLatency: 2500
      },
      capabilities: {
        streaming: true,
        toolCalls: false,
        parallelToolCalls: false,
        batchProcessing: false,
        reasoning: false,
        input: {
          text: true
        },
        output: {
          text: {
            textOutputFormats: ['text']
          }
        }
      }
    }
  ];


  describe('selectModel', () => {
    it('should select the cheapest model', () => {
      const selected = ModelSelector.selectModel(models, 'cheap');
      expect(selected).toBe('cheap-model');
    });

    it('should select the balanced model', () => {
      const selected = ModelSelector.selectModel(models, 'balanced');
      expect(selected).toBe('balanced-model');
    });

    it('should select the fastest model', () => {
      const selected = ModelSelector.selectModel(models, 'fast');
      expect(selected).toBe('fast-model');
    });

    it('should select the premium model', () => {
      const selected = ModelSelector.selectModel(models, 'premium');
      expect(selected).toBe('premium-model');
    });

    it('should throw error for unknown alias', () => {
      expect(() => ModelSelector.selectModel(models, 'unknown' as ModelAlias)).
        toThrow('Unknown model alias: unknown');
    });

    it('should throw error for empty model list', () => {
      expect(() => ModelSelector.selectModel([], 'fast')).
        toThrow('No models available that meet the capability requirements for alias: fast');
    });
  });

  describe('edge cases', () => {
    it('should handle extremely cheap model', () => {
      const modelsWithExtremeCheap = [
        ...models,
        {
          name: 'extremely-cheap',
          inputPricePerMillion: 1,
          outputPricePerMillion: 1,
          maxRequestTokens: 1000,
          maxResponseTokens: 1000,
          characteristics: {
            qualityIndex: 60,
            outputSpeed: 100,
            firstTokenLatency: 3000
          }
        }];

      const selected = ModelSelector.selectModel(modelsWithExtremeCheap, 'cheap');
      expect(selected).toBe('extremely-cheap');
    });

    it('should handle extremely fast model', () => {
      const modelsWithExtremeFast = [
        ...models,
        {
          name: 'extremely-fast',
          inputPricePerMillion: 300,
          outputPricePerMillion: 450,
          maxRequestTokens: 1000,
          maxResponseTokens: 1000,
          characteristics: {
            qualityIndex: 75,
            outputSpeed: 500,
            firstTokenLatency: 500
          }
        }];

      const selected = ModelSelector.selectModel(modelsWithExtremeFast, 'fast');
      expect(selected).toBe('extremely-fast');
    });

    it('should handle extremely high quality model', () => {
      const modelsWithExtremeQuality = [
        ...models,
        {
          name: 'extremely-premium',
          inputPricePerMillion: 500,
          outputPricePerMillion: 750,
          maxRequestTokens: 1000,
          maxResponseTokens: 1000,
          characteristics: {
            qualityIndex: 100,
            outputSpeed: 150,
            firstTokenLatency: 2000
          }
        }];

      const selected = ModelSelector.selectModel(modelsWithExtremeQuality, 'premium');
      expect(selected).toBe('extremely-premium');
    });
  });

  describe('balanced selection', () => {
    it('should reject models with low quality for balanced selection', () => {
      const modelsWithLowQuality = models.map((m) => ({
        ...m,
        characteristics: { ...m.characteristics, qualityIndex: 60 }
      }));
      expect(() => ModelSelector.selectModel(modelsWithLowQuality, 'balanced')).
        toThrow('No models meet the balanced criteria');
    });

    it('should reject models with low speed for balanced selection', () => {
      const modelsWithLowSpeed = models.map((m) => ({
        ...m,
        characteristics: { ...m.characteristics, outputSpeed: 50 }
      }));
      expect(() => ModelSelector.selectModel(modelsWithLowSpeed, 'balanced')).
        toThrow('No models meet the balanced criteria');
    });

    it('should reject models with high latency for balanced selection', () => {
      const modelsWithHighLatency = models.map((m) => ({
        ...m,
        characteristics: { ...m.characteristics, firstTokenLatency: 30000 }
      }));
      expect(() => ModelSelector.selectModel(modelsWithHighLatency, 'balanced')).
        toThrow('No models meet the balanced criteria');
    });

    it('should select model with best balance of characteristics', () => {
      const selected = ModelSelector.selectModel(models, 'balanced');
      expect(selected).toBe('balanced-model');
    });
  });

  describe('capability-aware alias resolution', () => {
    describe('default text output requirement', () => {
      it('should filter out embedding models when no specific requirements provided', () => {
        const selected = ModelSelector.selectModel(modelsWithCapabilities, 'cheap');
        expect(selected).toBe('chat-cheap'); // Should NOT select 'embedding-cheap' even though it's cheaper
      });

      it('should filter out image generation models when no specific requirements provided', () => {
        const selected = ModelSelector.selectModel(modelsWithCapabilities, 'premium');
        expect(selected).toBe('chat-premium'); // Should NOT select 'image-generator'
      });

      it('should throw error when no models support basic text output', () => {
        const nonTextModels = [
          modelsWithCapabilities.find(m => m.name === 'embedding-cheap')!,
          modelsWithCapabilities.find(m => m.name === 'image-generator')!
        ];
        expect(() => ModelSelector.selectModel(nonTextModels, 'cheap'))
          .toThrow('No models available that meet the capability requirements for alias: cheap');
      });
    });

    describe('text output capability filtering', () => {
      it('should select model that supports JSON output when JSON is required', () => {
        const requirements = {
          textOutput: {
            required: true,
            formats: ['json'] as const
          }
        };
        const selected = ModelSelector.selectModel(modelsWithCapabilities, 'cheap', requirements);
        expect(selected).toBe('chat-cheap'); // chat-cheap supports JSON
      });

      it('should filter out models that only support text when JSON is required', () => {
        const requirements = {
          textOutput: {
            required: true,
            formats: ['json'] as const
          }
        };
        const textOnlyModels = [
          modelsWithCapabilities.find(m => m.name === 'text-only-model')!
        ];
        expect(() => ModelSelector.selectModel(textOnlyModels, 'cheap', requirements))
          .toThrow('No models available that meet the capability requirements for alias: cheap');
      });

      it('should select any text-capable model when only text is required', () => {
        const requirements = {
          textOutput: {
            required: true,
            formats: ['text'] as const
          }
        };
        const selected = ModelSelector.selectModel(modelsWithCapabilities, 'cheap', requirements);
        expect(selected).toBe('chat-cheap');
      });
    });

    describe('image capability filtering', () => {
      it('should select model that supports image input when image input is required', () => {
        const requirements = {
          imageInput: {
            required: true
          }
        };
        const selected = ModelSelector.selectModel(modelsWithCapabilities, 'cheap', requirements);
        expect(selected).toBe('image-generator'); // image-generator (25) is cheaper than chat-balanced (60) and supports image input
      });

      it('should select model that supports image generation when image generation is required', () => {
        const requirements = {
          imageOutput: {
            required: true,
            operations: ['generate'] as const
          }
        };
        const selected = ModelSelector.selectModel(modelsWithCapabilities, 'premium');
        expect(selected).toBe('chat-premium'); // chat-premium has higher quality index (95) than image-generator (90)
      });

      it('should select cheapest model that supports image generation when cheap alias is used', () => {
        const requirements = {
          imageOutput: {
            required: true,
            operations: ['generate'] as const
          }
        };
        const selected = ModelSelector.selectModel(modelsWithCapabilities, 'cheap', requirements);
        expect(selected).toBe('image-generator'); // Should select cheapest model that supports image generation
      });

      it('should throw error when no models support required image capabilities', () => {
        const requirements = {
          imageOutput: {
            required: true,
            operations: ['edit'] as const
          }
        };
        expect(() => ModelSelector.selectModel(modelsWithCapabilities, 'cheap', requirements))
          .toThrow('No models available that meet the capability requirements for alias: cheap');
      });
    });

    describe('tool calling capability filtering', () => {
      it('should select model that supports tool calls when tool calls are required', () => {
        const requirements = {
          toolCalls: {
            required: true
          }
        };
        const selected = ModelSelector.selectModel(modelsWithCapabilities, 'cheap', requirements);
        expect(selected).toBe('chat-balanced'); // chat-cheap doesn't support tools, so next cheapest is chat-balanced
      });

      it('should select model that supports parallel tool calls when required', () => {
        const requirements = {
          toolCalls: {
            required: true,
            parallel: true
          }
        };
        const selected = ModelSelector.selectModel(modelsWithCapabilities, 'cheap', requirements);
        expect(selected).toBe('chat-premium'); // Only chat-premium supports parallel tool calls
      });

      it('should throw error when no models support required tool capabilities', () => {
        const requirements = {
          toolCalls: {
            required: true,
            parallel: true
          }
        };
        const limitedModels = [
          modelsWithCapabilities.find(m => m.name === 'chat-cheap')!,
          modelsWithCapabilities.find(m => m.name === 'chat-balanced')!
        ];
        expect(() => ModelSelector.selectModel(limitedModels, 'cheap', requirements))
          .toThrow('No models available that meet the capability requirements for alias: cheap');
      });
    });

    describe('streaming capability filtering', () => {
      it('should select model that supports streaming when streaming is required', () => {
        const requirements = {
          streaming: {
            required: true
          }
        };
        const selected = ModelSelector.selectModel(modelsWithCapabilities, 'cheap', requirements);
        expect(selected).toBe('chat-cheap'); // chat-cheap supports streaming
      });

      it('should throw error when no models support streaming', () => {
        const requirements = {
          streaming: {
            required: true
          }
        };
        const nonStreamingModels = [
          modelsWithCapabilities.find(m => m.name === 'embedding-cheap')!,
          modelsWithCapabilities.find(m => m.name === 'image-generator')!
        ];
        expect(() => ModelSelector.selectModel(nonStreamingModels, 'cheap', requirements))
          .toThrow('No models available that meet the capability requirements for alias: cheap');
      });
    });

    describe('embedding capability filtering', () => {
      it('should select embedding model when embeddings are required', () => {
        const requirements = {
          embeddings: {
            required: true
          }
        };
        const selected = ModelSelector.selectModel(modelsWithCapabilities, 'cheap', requirements);
        expect(selected).toBe('embedding-cheap'); // Should select the embedding model
      });

      it('should select embedding model with specific dimension requirement', () => {
        const requirements = {
          embeddings: {
            required: true,
            dimensions: [512] as const
          }
        };
        const selected = ModelSelector.selectModel(modelsWithCapabilities, 'cheap', requirements);
        expect(selected).toBe('embedding-cheap'); // embedding-cheap supports 512 dimensions
      });

      it('should throw error when no models support required embedding dimensions', () => {
        const requirements = {
          embeddings: {
            required: true,
            dimensions: [1024] as const
          }
        };
        expect(() => ModelSelector.selectModel(modelsWithCapabilities, 'cheap', requirements))
          .toThrow('No models available that meet the capability requirements for alias: cheap');
      });

      it('should throw error when no embedding models are available', () => {
        const requirements = {
          embeddings: {
            required: true
          }
        };
        const chatOnlyModels = [
          modelsWithCapabilities.find(m => m.name === 'chat-cheap')!,
          modelsWithCapabilities.find(m => m.name === 'chat-balanced')!
        ];
        expect(() => ModelSelector.selectModel(chatOnlyModels, 'cheap', requirements))
          .toThrow('No models available that meet the capability requirements for alias: cheap');
      });
    });

    describe('reasoning capability filtering', () => {
      it('should select reasoning model when reasoning is required', () => {
        const requirements = {
          reasoning: {
            required: true
          }
        };
        const selected = ModelSelector.selectModel(modelsWithCapabilities, 'premium');
        expect(selected).toBe('chat-premium'); // Only chat-premium supports reasoning
      });

      it('should throw error when no models support reasoning', () => {
        const requirements = {
          reasoning: {
            required: true
          }
        };
        const nonReasoningModels = [
          modelsWithCapabilities.find(m => m.name === 'chat-cheap')!,
          modelsWithCapabilities.find(m => m.name === 'chat-balanced')!
        ];
        expect(() => ModelSelector.selectModel(nonReasoningModels, 'premium', requirements))
          .toThrow('No models available that meet the capability requirements for alias: premium');
      });
    });

    describe('complex capability requirements', () => {
      it('should select model that meets multiple capability requirements', () => {
        const requirements = {
          toolCalls: {
            required: true
          },
          imageInput: {
            required: true
          },
          textOutput: {
            required: true,
            formats: ['json'] as const
          }
        };
        const selected = ModelSelector.selectModel(modelsWithCapabilities, 'premium', requirements);
        expect(selected).toBe('chat-premium'); // Only chat-premium meets all requirements
      });

      it('should select cheapest model that meets complex requirements', () => {
        const requirements = {
          toolCalls: {
            required: true
          },
          textOutput: {
            required: true,
            formats: ['text'] as const
          }
        };
        const selected = ModelSelector.selectModel(modelsWithCapabilities, 'cheap', requirements);
        expect(selected).toBe('chat-balanced'); // chat-cheap doesn't support tools, so chat-balanced is selected
      });

      it('should throw error when no model meets all complex requirements', () => {
        const requirements = {
          toolCalls: {
            required: true,
            parallel: true
          },
          imageOutput: {
            required: true,
            operations: ['generate'] as const
          }
        };
        expect(() => ModelSelector.selectModel(modelsWithCapabilities, 'cheap', requirements))
          .toThrow('No models available that meet the capability requirements for alias: cheap');
      });
    });

    describe('capability requirement validation', () => {
      it('should handle models without capabilities definition', () => {
        const modelWithoutCapabilities: ModelInfo = {
          name: 'no-capabilities-model',
          inputPricePerMillion: 10,
          outputPricePerMillion: 20,
          maxRequestTokens: 2000,
          maxResponseTokens: 1000,
          characteristics: {
            qualityIndex: 80,
            outputSpeed: 150,
            firstTokenLatency: 2000
          }
        };

        // Should work with default text requirement
        const requirements = {
          textOutput: {
            required: true,
            formats: ['text'] as const
          }
        };
        const selected = ModelSelector.selectModel([modelWithoutCapabilities], 'cheap', requirements);
        expect(selected).toBe('no-capabilities-model');
      });

      it('should filter out models that explicitly disable text output', () => {
        const modelWithDisabledText: ModelInfo = {
          name: 'disabled-text-model',
          inputPricePerMillion: 1,
          outputPricePerMillion: 1,
          maxRequestTokens: 1000,
          maxResponseTokens: 1000,
          characteristics: {
            qualityIndex: 80,
            outputSpeed: 150,
            firstTokenLatency: 2000
          },
          capabilities: {
            streaming: false,
            toolCalls: false,
            parallelToolCalls: false,
            batchProcessing: false,
            reasoning: false,
            input: {
              text: true
            },
            output: {
              text: false // Explicitly disabled
            }
          }
        };

        const requirements = {
          textOutput: {
            required: true,
            formats: ['text'] as const
          }
        };
        expect(() => ModelSelector.selectModel([modelWithDisabledText], 'cheap', requirements))
          .toThrow('No models available that meet the capability requirements for alias: cheap');
      });
    });
  });
});