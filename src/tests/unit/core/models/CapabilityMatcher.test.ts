import {
  candidateMeetsRequirements,
  explainCapabilityMatch,
  filterCandidatesByRequirements,
  getEffectiveCapabilities,
  supportsAudioApi,
  supportsEmbeddings,
  supportsImageOutput,
  supportsTextOutput,
  supportsToolCalls,
  supportsVideoOutput,
  type RequestRequirements
} from '../../../../core/models/CapabilityMatcher.ts';
import type { ModelCandidate } from '../../../../core/models/ModelCatalog.ts';
import type { ModelCapabilities, ModelInfo } from '../../../../interfaces/UniversalInterfaces.ts';

describe('CapabilityMatcher', () => {
  describe('default capabilities', () => {
    it('defaults missing capabilities to basic streaming text output', () => {
      const model = modelInfo('default-model', undefined);
      const caps = getEffectiveCapabilities(model);

      expect(caps.streaming).toBe(true);
      expect(supportsTextOutput(caps, { required: true, formats: ['text'] })).toBe(true);
      expect(supportsTextOutput(caps, { required: true, formats: ['json'] })).toBe(false);
    });
  });

  describe('text output', () => {
    it('supports true text output for text only', () => {
      const caps = capabilities({ output: { text: true } });

      expect(supportsTextOutput(caps, { required: true, formats: ['text'] })).toBe(true);
      expect(supportsTextOutput(caps, { required: true, formats: ['json'] })).toBe(false);
    });

    it('supports JSON and structured output checks', () => {
      const caps = capabilities({
        output: {
          text: {
            textOutputFormats: ['text', 'json'],
            structuredOutputs: true
          }
        }
      });

      expect(supportsTextOutput(caps, { required: true, formats: ['json'] })).toBe(true);
      expect(supportsTextOutput(caps, { required: true, formats: ['json'], structuredOutputsRequired: true })).toBe(true);
      expect(supportsTextOutput(capabilities({ output: { text: { textOutputFormats: ['text', 'json'] } } }), {
        required: true,
        formats: ['json'],
        structuredOutputsRequired: true
      })).toBe(false);
    });
  });

  describe('image capabilities', () => {
    it('checks image input formats', () => {
      const imageCandidate = candidate('image-input', capabilities({
        input: {
          text: true,
          image: { formats: ['png', 'jpeg'] }
        }
      }));

      expect(candidateMeetsRequirements(imageCandidate, { imageInput: { required: true, formats: ['png'] } })).toBe(true);
      expect(candidateMeetsRequirements(imageCandidate, { imageInput: { required: true, formats: ['webp'] } })).toBe(false);
    });

    it('checks image output operations', () => {
      const caps = capabilities({
        output: {
          text: false,
          image: {
            generate: true,
            edit: true,
            editWithMask: false
          }
        }
      });

      expect(supportsImageOutput(caps, ['generate'])).toBe(true);
      expect(supportsImageOutput(caps, ['edit'])).toBe(true);
      expect(supportsImageOutput(caps, ['editWithMask'])).toBe(false);
    });
  });

  describe('audio and video capabilities', () => {
    it('checks audio input and output formats', () => {
      const audioCandidate = candidate('audio-io', capabilities({
        input: {
          text: true,
          audio: { formats: ['mp3', 'wav'] }
        },
        output: {
          text: true,
          audio: { formats: ['mp3'] }
        }
      }));

      expect(candidateMeetsRequirements(audioCandidate, {
        audioInput: { required: true, formats: ['wav'] },
        audioOutput: { required: true, formats: ['mp3'] }
      })).toBe(true);
      expect(candidateMeetsRequirements(audioCandidate, {
        audioInput: { required: true, formats: ['flac'] }
      })).toBe(false);
    });

    it('checks video size, seconds, and variant metadata', () => {
      const caps = capabilities({
        output: {
          text: false,
          video: {
            sizes: ['1280x720'],
            maxSeconds: 10,
            variants: ['video', 'thumbnail']
          }
        }
      });

      expect(supportsVideoOutput(caps, { required: true, size: '1280x720', seconds: 5, variant: 'video' })).toBe(true);
      expect(supportsVideoOutput(caps, { required: true, size: '720x1280' })).toBe(false);
      expect(supportsVideoOutput(caps, { required: true, seconds: 20 })).toBe(false);
      expect(supportsVideoOutput(caps, { required: true, variant: 'spritesheet' })).toBe(false);
    });
  });

  describe('embeddings and audio API', () => {
    it('checks embedding dimensions and encoding format when declared', () => {
      const caps = capabilities({
        embeddings: {
          dimensions: [512, 1536],
          encodingFormats: ['float']
        }
      });

      expect(supportsEmbeddings(caps, { required: true, dimensions: 512, encodingFormat: 'float' })).toBe(true);
      expect(supportsEmbeddings(caps, { required: true, dimensions: 1024 })).toBe(false);
      expect(supportsEmbeddings(caps, { required: true, encodingFormat: 'base64' })).toBe(false);
    });

    it('treats boolean embeddings as broadly supported', () => {
      expect(supportsEmbeddings(capabilities({ embeddings: true }), {
        required: true,
        dimensions: 1024,
        encodingFormat: 'base64'
      })).toBe(true);
    });

    it('checks standalone audio API operations and options', () => {
      const caps = capabilities({
        audio: {
          transcribe: true,
          translate: false,
          synthesize: true,
          supportedInputFormats: ['mp3'],
          supportedOutputFormats: ['wav'],
          voices: ['alloy']
        }
      });

      expect(supportsAudioApi(caps, {
        required: true,
        operations: ['transcribe'],
        inputFormat: 'mp3'
      })).toBe(true);
      expect(supportsAudioApi(caps, { required: true, operations: ['translate'] })).toBe(false);
      expect(supportsAudioApi(caps, { required: true, outputFormat: 'mp3' })).toBe(false);
      expect(supportsAudioApi(caps, { required: true, voice: 'nova' })).toBe(false);
    });
  });

  describe('tool calls, streaming, and reasoning', () => {
    it('checks boolean tool support with legacy parallel flag', () => {
      expect(supportsToolCalls(capabilities({ toolCalls: true, parallelToolCalls: true }), {
        required: true,
        streaming: true,
        parallel: true
      })).toBe(true);

      expect(supportsToolCalls(capabilities({ toolCalls: true, parallelToolCalls: false }), {
        required: true,
        parallel: true
      })).toBe(false);
    });

    it('checks object tool support and streaming mode', () => {
      const nonStreamingOnly = capabilities({
        toolCalls: {
          nonStreaming: true,
          streamingMode: 'none',
          parallel: false
        }
      });
      const streamingDeltas = capabilities({
        toolCalls: {
          nonStreaming: true,
          streamingMode: 'deltas',
          parallel: true
        }
      });

      expect(supportsToolCalls(nonStreamingOnly, { required: true })).toBe(true);
      expect(supportsToolCalls(nonStreamingOnly, { required: true, streaming: true })).toBe(false);
      expect(supportsToolCalls(streamingDeltas, { required: true, streaming: true, parallel: true })).toBe(true);
    });

    it('checks streaming and reasoning requirements', () => {
      const candidateModel = candidate('reasoning', capabilities({
        streaming: false,
        reasoning: true
      }));

      expect(candidateMeetsRequirements(candidateModel, { reasoning: { required: true } })).toBe(true);
      expect(candidateMeetsRequirements(candidateModel, { streaming: { required: true } })).toBe(false);
    });
  });

  describe('token budgets and provider interfaces', () => {
    it('checks token budget limits', () => {
      const candidateModel = candidate('small', capabilities());

      expect(candidateMeetsRequirements(candidateModel, {
        tokenBudget: {
          estimatedInputTokens: 1000,
          requestedOutputTokens: 500
        }
      })).toBe(true);
      expect(explainCapabilityMatch(candidateModel, {
        tokenBudget: {
          estimatedInputTokens: 1001
        }
      }).rejectionReasons).toContain('estimated input tokens 1001 exceed max request tokens 1000');
      expect(explainCapabilityMatch(candidateModel, {
        tokenBudget: {
          requestedOutputTokens: 501
        }
      }).rejectionReasons).toContain('requested output tokens 501 exceed max response tokens 500');
    });

    it('checks required provider interfaces', () => {
      const candidateModel = candidate('image-model', capabilities({
        output: {
          text: false,
          image: true
        }
      }));
      const requirements: RequestRequirements = {
        imageOutput: { required: true, operations: ['generate'] },
        providerInterfaces: { imageCall: true }
      };

      expect(candidateMeetsRequirements(candidateModel, requirements, { imageCall: true })).toBe(true);
      expect(explainCapabilityMatch(candidateModel, requirements, { imageCall: false }).rejectionReasons).toContain('provider imageCall interface is not available');
    });
  });

  describe('candidate filtering and explanations', () => {
    it('filters candidates by requirements and provider interface support', () => {
      const candidates = [
        candidate('text-model', capabilities()),
        candidate('embedding-model', capabilities({ embeddings: true }), 'gemini')
      ];

      expect(filterCandidatesByRequirements(candidates, {
        embeddings: { required: true },
        providerInterfaces: { embeddingCall: true }
      }, {
        openai: { embeddingCall: false },
        gemini: { embeddingCall: true }
      }).map(item => item.model.name)).toEqual(['embedding-model']);
    });

    it('returns all rejection reasons', () => {
      const result = explainCapabilityMatch(candidate('plain', capabilities()), {
        textOutput: { required: true, formats: ['json'] },
        imageInput: { required: true },
        providerInterfaces: { imageCall: true }
      }, {});

      expect(result.matches).toBe(false);
      expect(result.rejectionReasons).toEqual([
        'text output does not support required formats: json',
        'image input is not supported',
        'provider imageCall interface is not available'
      ]);
    });
  });
});

function candidate(name: string, caps: ModelCapabilities | undefined, provider: 'openai' | 'gemini' = 'openai'): ModelCandidate {
  return {
    provider,
    model: modelInfo(name, caps)
  };
}

function modelInfo(name: string, caps: ModelCapabilities | undefined): ModelInfo {
  return {
    name,
    inputPricePerMillion: 1,
    outputPricePerMillion: 2,
    maxRequestTokens: 1000,
    maxResponseTokens: 500,
    capabilities: caps,
    characteristics: {
      qualityIndex: 80,
      outputSpeed: 100,
      firstTokenLatency: 1000
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
