import {
  ModelResolutionError,
  ModelSelectionError,
  describeRequestRequirements,
  resolveModel
} from '../../../../core/models/ModelResolver.ts';
import type { ProviderModelCatalogs } from '../../../../core/models/ModelCatalog.ts';
import type { ModelCapabilities, ModelInfo } from '../../../../interfaces/UniversalInterfaces.ts';

describe('ModelResolver', () => {
  const catalogs: ProviderModelCatalogs = {
    openai: [
      model('openai-basic', {
        input: 1,
        output: 2,
        quality: 70,
        speed: 100,
        latency: 250,
        context: 16000
      }),
      model('openai-tools', {
        input: 2,
        output: 4,
        quality: 85,
        speed: 130,
        latency: 200,
        context: 32000,
        capabilities: capabilities({
          toolCalls: {
            nonStreaming: true,
            streamingMode: 'deltas',
            parallel: true
          }
        })
      })
    ],
    gemini: [
      model('gemini-fast', {
        input: 0.2,
        output: 0.4,
        quality: 75,
        speed: 300,
        latency: 100,
        context: 32000
      }),
      model('gemini-image', {
        input: 1,
        output: 1,
        quality: 80,
        speed: 0,
        latency: 0,
        context: 8000,
        imagePrice: 0.03,
        capabilities: capabilities({
          output: {
            text: false,
            image: {
              generate: true,
              edit: false,
              editWithMask: false
            }
          }
        })
      })
    ]
  };

  it('resolves exact models and validates request capabilities', () => {
    const resolved = resolveModel({
      providerScope: 'openai',
      selection: 'openai-basic',
      requirements: {
        textInput: true,
        textOutput: { required: true, formats: ['text'] }
      },
      catalogs
    });

    expect(resolved).toMatchObject({
      provider: 'openai',
      model: 'openai-basic',
      mode: 'exact'
    });
    expect(resolved.resolution?.selected).toEqual({
      provider: 'openai',
      model: 'openai-basic'
    });
  });

  it('throws when an exact model cannot satisfy the request', () => {
    expect(() => resolveModel({
      providerScope: 'openai',
      selection: 'openai-basic',
      requirements: {
        toolCalls: { required: true }
      },
      catalogs
    })).toThrow(ModelResolutionError);

    try {
      resolveModel({
        providerScope: 'openai',
        selection: 'openai-basic',
        requirements: {
          toolCalls: { required: true }
        },
        catalogs
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ModelResolutionError);
      expect(error).toBeInstanceOf(ModelSelectionError);
      const resolutionError = error as ModelResolutionError;
      expect(resolutionError.message).toContain('Provider scope:\n- openai');
      expect(resolutionError.message).toContain('Required by request:\n- tool calling');
      expect(resolutionError.message).toContain('Rejected candidates:\n- openai/openai-basic: tool calling is not supported');
      expect(resolutionError.details.rejected[0]).toMatchObject({
        provider: 'openai',
        model: 'openai-basic',
        rejected: true,
        rejectionReasons: ['tool calling is not supported']
      });
    }
  });

  it('filters dynamic candidates by request capabilities before scoring', () => {
    const resolved = resolveModel({
      providerScope: ['openai', 'gemini'],
      selection: 'fast',
      requirements: {
        toolCalls: {
          required: true,
          streaming: true,
          parallel: true
        },
        streaming: { required: true }
      },
      catalogs
    });

    expect(resolved.provider).toBe('openai');
    expect(resolved.model).toBe('openai-tools');
    expect(resolved.mode).toBe('preset');
    expect(resolved.resolution?.candidates?.find(candidate => candidate.model === 'gemini-fast')).toMatchObject({
      rejected: true,
      rejectionReasons: ['tool calling does not support required modes: streaming, parallel']
    });
  });

  it('applies provider interface requirements as hard request filters', () => {
    const resolved = resolveModel({
      providerScope: ['openai', 'gemini'],
      selection: 'cheap',
      requirements: {
        imageOutput: { required: true, operations: ['generate'] },
        providerInterfaces: { imageCall: true }
      },
      providerInterfacesByProvider: {
        gemini: { imageCall: true }
      },
      catalogs
    });

    expect(resolved.provider).toBe('gemini');
    expect(resolved.model).toBe('gemini-image');
  });

  it('uses operation-specific score context when ranking media models', () => {
    const mediaCatalogs: ProviderModelCatalogs = {
      openai: [
        model('text-cheap-image-expensive', {
          input: 0.1,
          output: 0.1,
          quality: 80,
          speed: 100,
          latency: 100,
          context: 16000,
          imagePrice: 0.12,
          capabilities: capabilities({
            output: {
              text: false,
              image: {
                generate: true,
                edit: false,
                editWithMask: false
              }
            }
          })
        })
      ],
      gemini: [
        model('text-expensive-image-cheap', {
          input: 10,
          output: 10,
          quality: 80,
          speed: 100,
          latency: 100,
          context: 16000,
          imagePrice: 0.02,
          capabilities: capabilities({
            output: {
              text: false,
              image: {
                generate: true,
                edit: false,
                editWithMask: false
              }
            }
          })
        })
      ]
    };

    const withoutImageScoreContext = resolveModel({
      providerScope: ['openai', 'gemini'],
      selection: {
        preset: 'cheap',
        prefer: {
          cost: 1,
          latency: 0,
          throughput: 0,
          quality: 0,
          context: 0
        }
      },
      requirements: {
        imageOutput: { required: true, operations: ['generate'] }
      },
      catalogs: mediaCatalogs
    });

    const withImageScoreContext = resolveModel({
      providerScope: ['openai', 'gemini'],
      selection: {
        preset: 'cheap',
        prefer: {
          cost: 1,
          latency: 0,
          throughput: 0,
          quality: 0,
          context: 0
        }
      },
      requirements: {
        imageOutput: { required: true, operations: ['generate'] }
      },
      scoreContext: {
        operation: 'imageOutput'
      },
      catalogs: mediaCatalogs
    });

    expect(withoutImageScoreContext.model).toBe('text-cheap-image-expensive');
    expect(withImageScoreContext.model).toBe('text-expensive-image-cheap');
  });

  it('turns empty capability matches into explainable resolution errors', () => {
    expect(() => resolveModel({
      providerScope: ['openai', 'gemini'],
      selection: 'balanced',
      requirements: {
        videoOutput: {
          required: true,
          size: '1280x720'
        },
        providerInterfaces: { videoCall: true }
      },
      catalogs
    })).toThrow('No model matched the request requirements');

    try {
      resolveModel({
        providerScope: ['openai', 'gemini'],
        selection: 'balanced',
        requirements: {
          videoOutput: {
            required: true,
            size: '1280x720'
          },
          providerInterfaces: { videoCall: true }
        },
        catalogs
      });
    } catch (error) {
      const resolutionError = error as ModelResolutionError;
      expect(resolutionError.details.providerScope).toEqual(['openai', 'gemini']);
      expect(resolutionError.details.requiredByRequest).toEqual([
        'video output',
        'provider video interface'
      ]);
      expect(resolutionError.details.rejected.length).toBe(4);
    }
  });

  it('turns constraint exhaustion into explainable resolution errors', () => {
    expect(() => resolveModel({
      providerScope: ['openai', 'gemini'],
      selection: {
        preset: 'cheap',
        constraints: {
          maxOutputPricePerMillion: 0.1
        }
      },
      requirements: {
        textOutput: { required: true, formats: ['text'] }
      },
      catalogs
    })).toThrow(ModelResolutionError);

    try {
      resolveModel({
        providerScope: ['openai', 'gemini'],
        selection: {
          preset: 'cheap',
          constraints: {
            maxOutputPricePerMillion: 0.1
          }
        },
        requirements: {
          textOutput: { required: true, formats: ['text'] }
        },
        catalogs
      });
    } catch (error) {
      const resolutionError = error as ModelResolutionError;
      expect(resolutionError.details.rejected.map(candidate => candidate.model)).toEqual([
        'openai-basic',
        'openai-tools',
        'gemini-fast',
        'gemini-image'
      ]);
      expect(resolutionError.details.rejected[0].rejectionReasons).toEqual([
        'outputPricePerMillion 2 exceeds maximum 0.1'
      ]);
    }
  });

  it('describes request requirements for diagnostic output', () => {
    expect(describeRequestRequirements({
      textInput: true,
      textOutput: {
        required: true,
        formats: ['json'],
        nativeJsonRequired: true
      },
      streaming: { required: true },
      toolCalls: {
        required: true,
        streaming: true
      }
    })).toEqual([
      'text input',
      'native JSON output',
      'tool calling with streaming',
      'streaming'
    ]);
  });
});

function model(name: string, options: {
  input: number;
  output: number;
  quality: number;
  speed: number;
  latency: number;
  context: number;
  imagePrice?: number;
  capabilities?: ModelCapabilities;
}): ModelInfo {
  return {
    name,
    inputPricePerMillion: options.input,
    outputPricePerMillion: options.output,
    imagePricePerImage: options.imagePrice,
    maxRequestTokens: options.context,
    maxResponseTokens: Math.floor(options.context / 2),
    capabilities: options.capabilities ?? capabilities(),
    characteristics: {
      qualityIndex: options.quality,
      outputSpeed: options.speed,
      firstTokenLatency: options.latency
    }
  };
}

function capabilities(overrides: Partial<ModelCapabilities> = {}): ModelCapabilities {
  return {
    streaming: true,
    toolCalls: false,
    parallelToolCalls: false,
    batchProcessing: false,
    reasoning: false,
    embeddings: false,
    audio: false,
    input: {
      text: true,
      ...overrides.input
    },
    output: {
      text: {
        textOutputFormats: ['text']
      },
      ...overrides.output
    },
    ...withoutInputOutput(overrides)
  };
}

function withoutInputOutput(overrides: Partial<ModelCapabilities>): Omit<Partial<ModelCapabilities>, 'input' | 'output'> {
  const { input, output, ...rest } = overrides;
  return rest;
}
