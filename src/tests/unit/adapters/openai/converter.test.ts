import { jest, beforeAll } from '@jest/globals';
import { Converter, extractPathFromPlaceholder, parseFileReferences } from '@/adapters/openai/converter.ts';
import { type ToolDefinition } from '@/types/tooling.ts';
import { type UniversalChatParams, type UniversalMessage, type FinishReason, type ModelInfo, type ReasoningEffort } from '@/interfaces/UniversalInterfaces.ts';
// Declare variables for modules to be dynamically imported
let ModelManager;
import { OpenAIResponseValidationError } from '@/adapters/openai/errors.ts';
import { z } from 'zod';

// Mock ModelManager
jest.unstable_mockModule('@/core/models/ModelManager.ts', () => ({
  __esModule: true,
}));

// Mock UnionTransformer (MUST be before any imports that use it)
const mockFlattenUnions = jest.fn((schema) => ({ schema, mapping: [] }));
const mockUnflattenData = jest.fn((data) => data);

jest.unstable_mockModule('@/core/schema/UnionTransformer', () => {
  return {
    __esModule: true,
    flattenUnions: mockFlattenUnions,
    unflattenData: mockUnflattenData,
    responseHasFlattenedUnionKeys: jest.fn(() => false),
    OPTIONAL_UNION_OPTION_KEY: 'x-callllm-optional-union-option',
    collapseNullableUnion: jest.fn(() => null)
  };
});

// Dynamically import modules after mocks are set up
beforeAll(async () => {
  const ModelManagerModule = await import('@/core/models/ModelManager.ts');
  ModelManager = ModelManagerModule.ModelManager;
});


describe('OpenAI Response API Converter', () => {
  let converter: Converter;
  let mockModelManager: jest.Mocked<typeof ModelManager>;

  beforeEach(() => {
    // Create a mock ModelManager
    mockModelManager = {
      getModel: jest.fn()
    } as unknown as jest.Mocked<typeof ModelManager>;

    converter = new Converter(mockModelManager);

    // Set up test-specific environment
    process.env.TEST_MODE = 'true';

    // Reset UnionTransformer mocks
    mockFlattenUnions.mockClear();
    mockUnflattenData.mockClear();
    mockFlattenUnions.mockImplementation((schema) => ({ schema, mapping: [] }));
    mockUnflattenData.mockImplementation((data) => data);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.TEST_MODE;
  });

  describe('convertToOpenAIResponseParams', () => {
    test('should convert basic universal params to OpenAI Response params', async () => {
      const universalParams: UniversalChatParams = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello!' }],

        model: 'gpt-4o',
        settings: {
          maxTokens: 100,
          temperature: 0.7
        }
      };

      const result = await converter.convertToOpenAIResponseParams('gpt-4o', universalParams);

      expect(result).toEqual(expect.objectContaining({
        input: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello!' }],

        model: 'gpt-4o',
        max_output_tokens: 100,
        temperature: 0.7
      }));
    });

    test('encodes assistant toolCalls and tool results as native function_call items', async () => {
      const universalParams: UniversalChatParams = {
        messages: [
          { role: 'user', content: 'Close the account' },
          {
            role: 'assistant',
            content: 'I will close it.',
            toolCalls: [{
              id: 'call_1',
              name: 'close_account',
              arguments: { id: 'at58506', reason: 'duplicate_account' }
            }]
          },
          {
            role: 'tool',
            content: JSON.stringify({ status: 'ambiguous' }),
            toolCallId: 'call_1'
          }
        ],
        model: 'gpt-4o',
        tools: [{
          name: 'close_account',
          description: 'Close an account',
          parameters: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              reason: { type: 'string' }
            },
            required: ['id', 'reason']
          }
        }]
      };

      const result = await converter.convertToOpenAIResponseParams('gpt-4o', universalParams);

      expect(result.input).toEqual([
        { role: 'user', content: 'Close the account' },
        { role: 'assistant', content: 'I will close it.' },
        {
          type: 'function_call',
          call_id: 'call_1',
          name: 'close_account',
          arguments: JSON.stringify({ id: 'at58506', reason: 'duplicate_account' }),
          id: 'call_1'
        },
        {
          type: 'function_call_output',
          call_id: 'call_1',
          output: JSON.stringify({ status: 'ambiguous' })
        }
      ]);
      expect(result.tools).toHaveLength(1);
    });

    test('encodes tool history as native items for reasoning models without system substitutes', async () => {
      mockModelManager.getModel.mockReturnValue({
        name: 'gpt-5.4-mini-2026-03-17',
        capabilities: {
          reasoning: true,
          toolCalls: true,
          input: { text: true },
          output: { text: { textOutputFormats: ['text', 'json'], structuredOutputs: true } }
        }
      } as any);

      const universalParams: UniversalChatParams = {
        messages: [
          { role: 'system', content: 'You are the actor.' },
          { role: 'user', content: 'Close the account' },
          {
            role: 'assistant',
            content: '',
            toolCalls: [{
              id: 'call_1',
              name: 'close_account',
              arguments: { id: 'at58506' }
            }]
          },
          {
            role: 'tool',
            content: '{"status":"ambiguous"}',
            toolCallId: 'call_1'
          }
        ],
        model: 'gpt-5.4-mini-2026-03-17',
        systemMessage: 'You are the actor.'
      };

      const result = await converter.convertToOpenAIResponseParams(
        'gpt-5.4-mini-2026-03-17',
        universalParams
      );

      expect(result.instructions).toBe('You are the actor.');
      expect(result.input).toEqual([
        { role: 'user', content: 'Close the account' },
        {
          type: 'function_call',
          call_id: 'call_1',
          name: 'close_account',
          arguments: JSON.stringify({ id: 'at58506' }),
          id: 'call_1'
        },
        {
          type: 'function_call_output',
          call_id: 'call_1',
          output: '{"status":"ambiguous"}'
        }
      ]);
      expect(result.input?.some((item: any) => item.role === 'system')).toBe(false);
      expect(result.input?.some((item: any) => item.type === 'function_call')).toBe(true);
      expect(result.input?.some((item: any) => item.type === 'function_call_output')).toBe(true);
    });

    test('preserves rawArguments when serializing malformed tool call args', async () => {
      const universalParams: UniversalChatParams = {
        messages: [
          { role: 'user', content: 'Call it' },
          {
            role: 'assistant',
            content: '',
            toolCalls: [{
              id: 'fc_bad',
              name: 'close_account',
              arguments: { rawArguments: '{not-json' }
            }]
          }
        ],
        model: 'gpt-4o'
      };

      const result = await converter.convertToOpenAIResponseParams('gpt-4o', universalParams);

      expect(result.input).toContainEqual({
        type: 'function_call',
        call_id: 'fc_bad',
        name: 'close_account',
        arguments: '{not-json',
        id: 'fc_bad'
      });
    });

    test('should pass namespaced OpenAI store false to the Responses API', async () => {
      const universalParams: UniversalChatParams = {
        messages: [{ role: 'user', content: 'Do not retain this response.' }],
        model: 'gpt-5.4-mini-2026-03-17',
        settings: {
          providerOptions: {
            openai: { store: false }
          }
        }
      };

      const result = await converter.convertToOpenAIResponseParams(
        'gpt-5.4-mini-2026-03-17',
        universalParams
      );

      expect(result.store).toBe(false);
    });

    test('should reject invalid namespaced OpenAI store controls', async () => {
      const base: UniversalChatParams = {
        messages: [{ role: 'user', content: 'Hello!' }],
        model: 'gpt-5.4-mini-2026-03-17'
      };

      await expect(converter.convertToOpenAIResponseParams(
        'gpt-5.4-mini-2026-03-17',
        { ...base, settings: { providerOptions: { openai: { store: 'false' } } } }
      )).rejects.toThrow('settings.providerOptions.openai.store must be a boolean');

      await expect(converter.convertToOpenAIResponseParams(
        'gpt-5.4-mini-2026-03-17',
        { ...base, settings: { providerOptions: { openai: false } } }
      )).rejects.toThrow('settings.providerOptions.openai must be an object');
    });

    test.each([
      ['plain object', {
        type: 'object',
        additionalProperties: false,
        properties: { correct: { type: 'boolean' } },
        required: ['correct']
      }],
      ['serialized JSON Schema', JSON.stringify({
        type: 'object',
        additionalProperties: false,
        properties: { correct: { type: 'boolean' } },
        required: ['correct']
      })]
    ])('should preserve %s as strict Responses API json_schema', async (_label, schema) => {
      const result = await converter.convertToOpenAIResponseParams(
        'gpt-5.1-2025-11-13',
        {
          messages: [{ role: 'user', content: 'Return the assessment.' }],
          model: 'gpt-5.1-2025-11-13',
          jsonSchema: { name: 'Assessment', schema },
          responseFormat: 'json'
        }
      );

      expect(result.text).toEqual({
        format: {
          type: 'json_schema',
          strict: true,
          name: 'Assessment',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: { correct: { type: 'boolean' } },
            required: ['correct']
          }
        }
      });
    });

    test('should set text.verbosity for GPT-5 models', async () => {
      const universalParams: UniversalChatParams = {
        messages: [{ role: 'user', content: 'Hello!' }],
        model: 'gpt-5',
        settings: {
          verbosity: 'high'
        }
      };

      // Model info with reasoning true (GPT-5)
      mockModelManager.getModel.mockReturnValue({
        name: 'gpt-5',
        inputPricePerMillion: 1.25,
        outputPricePerMillion: 10,
        maxRequestTokens: 400000,
        maxResponseTokens: 128000,
        capabilities: { reasoning: true, input: { text: true }, output: { text: true } },
        characteristics: { qualityIndex: 90, outputSpeed: 100, firstTokenLatency: 1000 }
      } as unknown as ModelInfo);

      const result = await converter.convertToOpenAIResponseParams('gpt-5', universalParams);
      expect((result.text as any)?.verbosity).toBe('high');
    });

    test('should map verbosity to max_output_tokens for non-reasoning models when maxTokens not provided', async () => {
      const universalParams: UniversalChatParams = {
        messages: [{ role: 'user', content: 'Hello!' }],
        model: 'gpt-4o',
        settings: {
          verbosity: 'medium'
        }
      };

      mockModelManager.getModel.mockReturnValue({
        name: 'gpt-4o',
        inputPricePerMillion: 2.5,
        outputPricePerMillion: 10,
        maxRequestTokens: 200000,
        maxResponseTokens: 100000,
        capabilities: { input: { text: true }, output: { text: true } },
        characteristics: { qualityIndex: 80, outputSpeed: 100, firstTokenLatency: 300 }
      } as unknown as ModelInfo);

      const result = await converter.convertToOpenAIResponseParams('gpt-4o', universalParams);
      expect(result.max_output_tokens).toBe(50000);
    });

    test('should not override user-provided maxTokens with verbosity mapping', async () => {
      const universalParams: UniversalChatParams = {
        messages: [{ role: 'user', content: 'Hello!' }],
        model: 'gpt-4o',
        settings: {
          verbosity: 'high',
          maxTokens: 1234
        }
      };

      mockModelManager.getModel.mockReturnValue({
        name: 'gpt-4o',
        inputPricePerMillion: 2.5,
        outputPricePerMillion: 10,
        maxRequestTokens: 200000,
        maxResponseTokens: 100000,
        capabilities: { input: { text: true }, output: { text: true } },
        characteristics: { qualityIndex: 80, outputSpeed: 100, firstTokenLatency: 300 }
      } as unknown as ModelInfo);

      const result = await converter.convertToOpenAIResponseParams('gpt-4o', universalParams);
      expect(result.max_output_tokens).toBe(1234);
    });

    test('should convert universal tools to OpenAI Response tools', async () => {
      const toolDef: ToolDefinition = {
        name: 'test_tool',
        description: 'A test tool',
        parameters: {
          type: 'object',
          properties: {
            param1: { type: 'string' }
          },
          required: ['param1']
        }
      };

      const universalParams: UniversalChatParams = {
        messages: [{ role: 'user', content: 'Use the tool' }],
        tools: [toolDef],
        model: 'gpt-4o'
      };

      const result = await converter.convertToOpenAIResponseParams('gpt-4o', universalParams);

      expect(result.tools).toHaveLength(1);
      expect(result.tools?.[0]).toEqual({
        type: 'function',
        name: 'test_tool',
        description: 'A test tool',
        parameters: expect.objectContaining({
          type: 'object',
          properties: {
            param1: { type: 'string' }
          },
          required: ['param1']
        }),
        strict: true
      });
    });

    test('should encode nested open-map tool fields as JSON strings without mutating caller schema', async () => {
      const patchSchema = {
        type: 'object',
        propertyNames: { type: 'string' },
        additionalProperties: {}
      };
      const toolDef: ToolDefinition = {
        name: 'update_account',
        description: 'Update an account using a free-form patch object.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            patch: patchSchema
          },
          required: ['id', 'patch'],
          additionalProperties: false
        }
      };

      const result = await converter.convertToOpenAIResponseParams('gpt-4o', {
        messages: [{ role: 'user', content: 'Update account' }],
        tools: [toolDef],
        model: 'gpt-4o'
      });

      const tool = result.tools?.[0] as {
        type: string;
        name: string;
        strict: boolean;
        parameters: Record<string, unknown>;
      };
      expect(tool).toMatchObject({
        type: 'function',
        name: 'update_account',
        strict: true
      });
      expect(tool.parameters).toEqual({
        type: 'object',
        properties: {
          id: { type: 'string' },
          patch: {
            type: 'string',
            description: expect.stringContaining('JSON-encoded object')
          }
        },
        required: ['id', 'patch'],
        additionalProperties: false
      });
      expect(JSON.stringify(tool.parameters)).not.toContain('propertyNames');

      // Caller schema must remain the original open map
      expect(toolDef.parameters.properties.patch).toBe(patchSchema);
      expect(toolDef.parameters.properties.patch).toEqual({
        type: 'object',
        propertyNames: { type: 'string' },
        additionalProperties: {}
      });
    });

    test('should reject root-level open-map tool parameters', async () => {
      const toolDef: ToolDefinition = {
        name: 'update_account',
        description: 'Root is an open map',
        parameters: {
          type: 'object',
          additionalProperties: true,
          properties: {}
        }
      };

      await expect(converter.convertToOpenAIResponseParams('gpt-4o', {
        messages: [{ role: 'user', content: 'Update' }],
        tools: [toolDef],
        model: 'gpt-4o'
      })).rejects.toThrow(OpenAIResponseValidationError);

      await expect(converter.convertToOpenAIResponseParams('gpt-4o', {
        messages: [{ role: 'user', content: 'Update' }],
        tools: [toolDef],
        model: 'gpt-4o'
      })).rejects.toThrow(/update_account/);
    });

    test('should handle toolChoice in settings', async () => {
      const toolDef: ToolDefinition = {
        name: 'test_tool',
        description: 'A test tool',
        parameters: {
          type: 'object',
          properties: {
            param1: { type: 'string' }
          },
          required: ['param1']
        }
      };

      const universalParams: UniversalChatParams = {
        messages: [{ role: 'user', content: 'Use the tool' }],
        tools: [toolDef],
        model: 'gpt-4o',
        settings: {
          toolChoice: 'auto'
        }
      };

      const result = await converter.convertToOpenAIResponseParams('gpt-4o', universalParams);

      expect(result.tool_choice).toBe('auto');
    });

    test('should handle toolChoice object in settings', async () => {
      const toolDef: ToolDefinition = {
        name: 'test_tool',
        description: 'A test tool',
        parameters: {
          type: 'object',
          properties: {
            param1: { type: 'string' }
          },
          required: ['param1']
        }
      };

      const universalParams: UniversalChatParams = {
        messages: [{ role: 'user', content: 'Use the tool' }],
        tools: [toolDef],
        model: 'gpt-4o',
        settings: {
          toolChoice: {
            type: 'function',
            function: { name: 'test_tool' }
          }
        }
      };

      const result = await converter.convertToOpenAIResponseParams('gpt-4o', universalParams);

      expect(result.tool_choice).toEqual({
        type: 'function',
        function: { name: 'test_tool' }
      });
    });

    test('should properly handle multipart message content', async () => {
      const universalParams: UniversalChatParams = {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Look at this image:' },
              {
                type: 'image_url',
                image_url: {
                  url: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
                  detail: 'high'
                }
              }] as
              any
          }],

        model: 'gpt-4o-vision'
      };

      const result = await converter.convertToOpenAIResponseParams('gpt-4o-vision', universalParams);

      expect(result.input).toEqual([
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Look at this image:' },
            {
              type: 'image_url',
              image_url: {
                url: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
                detail: 'high'
              }
            }]

        }]
      );
    });

    test('should handle file placeholder format in message content', async () => {
      const universalParams: UniversalChatParams = {
        messages: [
          { role: 'user', content: '<file:/path/to/image.jpg>' }],

        model: 'gpt-4o-vision'
      };

      // Call converter (which will use TEST_MODE);
      const result = await converter.convertToOpenAIResponseParams('gpt-4o-vision', universalParams, {
        imageDetail: 'high'
      });

      // In test mode, we replace the placeholder directly since we already have the mocked structure
      // of what we expect the result to look like
      const processedResult = {
        ...result,
        input: result.input && Array.isArray(result.input) ? result.input.map((message: any) => {
          if (typeof message === 'object' && message !== null && 'content' in message && Array.isArray(message.content)) {
            return {
              ...message,
              content: message.content.map((content: any) => {
                if (typeof content === 'object' && content !== null && 'image_url' in content && content.image_url === 'TEST_MODE_PLACEHOLDER') {
                  return {
                    ...content,
                    image_url: 'data:image/jpeg;base64,mock-base64-data'
                  };
                }
                return content;
              })
            };
          }
          return message;
        }) : result.input
      };

      expect(processedResult.input).toEqual([
        {
          role: 'user',
          content: [
            {
              type: 'input_image',
              image_url: 'data:image/jpeg;base64,mock-base64-data',
              detail: 'high'
            }]

        }]
      );
    });

    test('should use default imageDetail if not provided with file placeholder', async () => {
      const universalParams: UniversalChatParams = {
        messages: [
          { role: 'user', content: '<file:/path/to/image.jpg>' }],

        model: 'gpt-4o-vision'
      };

      // Call converter (which will use TEST_MODE);
      const result = await converter.convertToOpenAIResponseParams('gpt-4o-vision', universalParams);

      // In test mode, we replace the placeholder directly since we already have the mocked structure
      // of what we expect the result to look like
      const processedResult = {
        ...result,
        input: result.input && Array.isArray(result.input) ? result.input.map((message: any) => {
          if (typeof message === 'object' && message !== null && 'content' in message && Array.isArray(message.content)) {
            return {
              ...message,
              content: message.content.map((content: any) => {
                if (typeof content === 'object' && content !== null && 'image_url' in content && content.image_url === 'TEST_MODE_PLACEHOLDER') {
                  return {
                    ...content,
                    image_url: 'data:image/jpeg;base64,mock-base64-data'
                  };
                }
                return content;
              })
            };
          }
          return message;
        }) : result.input
      };

      expect(processedResult.input).toEqual([
        {
          role: 'user',
          content: [
            {
              type: 'input_image',
              image_url: 'data:image/jpeg;base64,mock-base64-data',
              detail: 'auto'
            }]

        }]
      );
    });

    test('should ignore null or undefined parameters', async () => {
      const universalParams: UniversalChatParams = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-4o',
        settings: {
          maxTokens: undefined,
          temperature: undefined
        }
      };

      const result = await converter.convertToOpenAIResponseParams('gpt-4o', universalParams);

      expect(result).toEqual(expect.objectContaining({
        input: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-4o'
      }));
      expect(result.max_output_tokens).toBeUndefined();
      expect(result.temperature).toBeUndefined();
    });

    describe('reasoning models', () => {
      const standardModel: ModelInfo = {
        name: 'gpt-4',
        inputPricePerMillion: 10,
        outputPricePerMillion: 30,
        maxRequestTokens: 8000,
        maxResponseTokens: 2000,
        capabilities: {
          input: { text: true },
          output: { text: true }
        },
        characteristics: {
          qualityIndex: 90,
          outputSpeed: 15,
          firstTokenLatency: 200
        }
      };

      const reasoningModel: ModelInfo = {
        name: 'o3-mini',
        inputPricePerMillion: 1.10,
        outputPricePerMillion: 4.40,
        maxRequestTokens: 128000,
        maxResponseTokens: 65536,
        capabilities: {
          streaming: true,
          reasoning: true,
          input: { text: true },
          output: { text: true }
        },
        characteristics: {
          qualityIndex: 86,
          outputSpeed: 212.1,
          firstTokenLatency: 10890
        }
      };

      const basicParams: UniversalChatParams = {
        model: 'o3-mini',
        messages: [{ role: 'user', content: 'Hello' } as UniversalMessage],
        systemMessage: 'You are a helpful assistant.'
      };

      it('should set reasoning configuration for reasoning-capable models', async () => {
        // Setup
        mockModelManager.getModel.mockReturnValue(reasoningModel);

        // Add reasoning setting to params
        const params = {
          ...basicParams,
          settings: {
            reasoning: { effort: 'high' as ReasoningEffort }
          }
        };

        // Execute
        const result = await converter.convertToOpenAIResponseParams('o3-mini', params);

        // Verify
        expect(result.reasoning).toBeDefined();
        expect(result.reasoning?.effort).toBe('high');
      });

      it('should default to medium effort when reasoning capability is present but no effort specified', async () => {
        // Setup
        mockModelManager.getModel.mockReturnValue(reasoningModel);

        // Execute
        const result = await converter.convertToOpenAIResponseParams('o3-mini', basicParams);

        // Verify
        expect(result.reasoning).toBeDefined();
        expect(result.reasoning?.effort).toBe('medium');
      });

      it('should not set temperature for reasoning-capable models even if specified', async () => {
        // Setup
        mockModelManager.getModel.mockReturnValue(reasoningModel);

        // Add temperature to params
        const params = {
          ...basicParams,
          settings: {
            temperature: 0.7,
            reasoning: { effort: 'medium' as ReasoningEffort }
          }
        };

        // Execute
        const result = await converter.convertToOpenAIResponseParams('o3-mini', params);

        // Verify
        expect(result.temperature).toBeUndefined();
        expect(result.reasoning?.effort).toBe('medium');
      });

      it('should send system message via instructions for reasoning models', async () => {
        // Setup
        mockModelManager.getModel.mockReturnValue(reasoningModel);

        // System message and user message
        const params = {
          ...basicParams,
          messages: [{ role: 'user', content: 'Tell me a joke' } as UniversalMessage],
          systemMessage: 'You are a comedy assistant.'
        };

        // Execute
        const result = await converter.convertToOpenAIResponseParams('o3-mini', params);

        // Verify
        expect(result.instructions).toBe('You are a comedy assistant.');
        expect(result.input).toBeDefined();
        expect(Array.isArray(result.input)).toBe(true);
        expect(JSON.stringify(result.input)).not.toContain('System Instructions:');
        expect(JSON.stringify(result.input)).toContain('Tell me a joke');
      });

      it('should treat standard models normally (not apply reasoning transformations)', async () => {
        // Setup
        mockModelManager.getModel.mockReturnValue(standardModel);

        // Add temperature and don't add reasoning
        const params = {
          ...basicParams,
          model: 'gpt-4',
          settings: {
            temperature: 0.7
          }
        };

        // Execute
        const result = await converter.convertToOpenAIResponseParams('gpt-4', params);

        // Verify
        expect(result.temperature).toBe(0.7);
        expect(result.reasoning).toBeUndefined();
        expect(result.instructions).toBe('You are a helpful assistant.');

        // Use JSON stringify approach to check content without type issues
        expect(JSON.stringify(result.input)).toContain('Hello');
      });
    });

    test('parseFileReferences should extract file paths from placeholders', () => {
      const content = 'Look at <file:/path/to/image1.jpg> and <file:https://example.com/image2.jpg> and compare them';
      const result = parseFileReferences(content);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        placeholder: '<file:/path/to/image1.jpg>',
        path: '/path/to/image1.jpg'
      });
      expect(result[1]).toEqual({
        placeholder: '<file:https://example.com/image2.jpg>',
        path: 'https://example.com/image2.jpg'
      });
    });

    test('should handle multiple file placeholders mixed with text in a single message', async () => {
      const params: UniversalChatParams = {
        model: 'gpt-4o-vision',
        messages: [{
          role: 'user' as const,
          content: 'Look at these images: <file:/local/image1.jpg> and <file:https://example.com/image2.png> - what do you see?'
        }]
      };

      // Call converter (which will use TEST_MODE);
      const result = await converter.convertToOpenAIResponseParams('gpt-4o-vision', params, { imageDetail: 'low' });

      // In test mode, we replace the placeholder directly
      const processedResult = {
        ...result,
        input: result.input && Array.isArray(result.input) ? result.input.map((message: any) => {
          if (typeof message === 'object' && message !== null && 'content' in message) {
            if (Array.isArray(message.content)) {
              return {
                ...message,
                content: message.content.map((content: any) => {
                  if (typeof content === 'object' && content !== null && 'image_url' in content && content.image_url === 'TEST_MODE_PLACEHOLDER') {
                    if (message.content.indexOf(content) === 0) {
                      return {
                        ...content,
                        image_url: 'data:image/jpeg;base64,base64data1'
                      };
                    } else {
                      return {
                        ...content,
                        image_url: 'https://example.com/image2.png'
                      };
                    }
                  }
                  return content;
                })
              };
            }
          }
          return message;
        }) : result.input
      };

      // The implementation splits the message into multiple pieces
      expect(processedResult.input).toBeDefined();

      // Safely check input array existence and length
      if (processedResult.input && Array.isArray(processedResult.input)) {
        expect(processedResult.input.length).toBe(5);

        // Find and count image parts in the content
        let foundImages = 0;

        // Type-safe iteration through the input items
        for (const item of processedResult.input) {
          // Check if item has content property and it's an array
          if (typeof item !== 'string' && 'content' in item && Array.isArray(item.content)) {
            for (const contentPart of item.content) {
              // Check if this is an image content part
              if ('type' in contentPart && contentPart.type === 'input_image' && 'image_url' in contentPart) {
                if (contentPart.image_url === 'data:image/jpeg;base64,base64data1' ||
                  contentPart.image_url === 'https://example.com/image2.png') {
                  foundImages++;
                }
              }
            }
          }
        }

        // We should find 2 images
        expect(foundImages).toBe(2);
      }
    });

    test('should handle multiple file placeholders in a single message', async () => {
      const params: UniversalChatParams = {
        model: 'gpt-4o-vision',
        messages: [{
          role: 'user' as const,
          content: '<file:/path/to/image1.jpg> and <file:/path/to/image2.png>'
        }]
      };

      // Call converter (which will use TEST_MODE);
      const result = await converter.convertToOpenAIResponseParams('gpt-4o-vision', params);

      // In test mode, we replace the placeholder directly
      const processedResult = {
        ...result,
        input: result.input && Array.isArray(result.input) ? result.input.map((message: any) => {
          if (typeof message === 'object' && message !== null && 'content' in message) {
            if (Array.isArray(message.content)) {
              return {
                ...message,
                content: message.content.map((content: any) => {
                  if (typeof content === 'object' && content !== null && 'image_url' in content && content.image_url === 'TEST_MODE_PLACEHOLDER') {
                    if (message.content.indexOf(content) === 0) {
                      return {
                        ...content,
                        image_url: 'data:image/jpeg;base64,mockBase64Data'
                      };
                    } else {
                      return {
                        ...content,
                        image_url: 'data:image/png;base64,mockBase64Data'
                      };
                    }
                  }
                  return content;
                })
              };
            }
          }
          return message;
        }) : result.input
      };

      // Verify the result structure
      expect(processedResult.input).toBeDefined();

      if (processedResult.input && Array.isArray(processedResult.input)) {
        // Count how many images we found
        let foundImages = 0;

        // Type-safe iteration through the input items
        for (const item of processedResult.input) {
          // Check if item has content property and it's an array
          if (typeof item !== 'string' && 'content' in item && Array.isArray(item.content)) {
            for (const contentPart of item.content) {
              // Check if this is an image content part
              if ('type' in contentPart && contentPart.type === 'input_image') {
                foundImages++;
              }
            }
          }
        }

        expect(foundImages).toBe(2);
      }
    });

    it('should correctly include Zod schema descriptions in JSON Schema format', async () => {
      // Create a Zod schema with descriptions
      const zodSchema = z.object({
        name: z.string().describe('The user\'s full name'),
        email: z.string().email().describe('The user\'s email address'),
        age: z.number().describe('The user\'s age in years')
      }).describe('A user profile schema with personal information');

      // Convert to OpenAI params
      const result = await converter.convertToOpenAIResponseParams('test-model', {
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hi' }],
        jsonSchema: {
          name: 'UserProfile',
          schema: zodSchema
        },
        responseFormat: 'json'
      });

      // Verify the schema format and descriptions are preserved
      expect(result.text).toBeDefined();
      const format = (result.text as any).format;
      expect(format).toBeDefined();
      expect(format.type).toBe('json_schema');
      expect(format.name).toBe('UserProfile');

      // Check schema-level description
      expect(format.schema.description).toBe('A user profile schema with personal information');

      // Check field-level descriptions (SchemaSanitizer adds constraint hints)
      expect(format.schema.properties.name.description).toBe('The user\'s full name');
      expect(format.schema.properties.email.description).toBe('The user\'s email address (constraints: format: email)');
      expect(format.schema.properties.age.description).toBe('The user\'s age in years');
    });

    it('should make all properties required and modify optional field descriptions for OpenAI', async () => {
      // Create a Zod schema with both required and optional fields
      const zodSchema = z.object({
        venueName: z.string().describe('The name of the venue'),
        officialWebsite: z.string().optional().describe('Official website URL if found'),
        socialMedia: z.object({
          facebook: z.string().optional().describe('Facebook page URL'),
          instagram: z.string().optional().describe('Instagram account URL'),
          twitter: z.string().optional().describe('Twitter/X account URL'),
          linkedin: z.string().optional().describe('LinkedIn page URL'),
          youtube: z.string().optional().describe('YouTube channel URL'),
          tiktok: z.string().optional().describe('TikTok account URL')
        }).describe('Social media accounts found'),
        confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level in the results'),
        notes: z.string().optional().describe('Additional notes about the findings')
      });

      // Convert to OpenAI params
      const result = await converter.convertToOpenAIResponseParams('test-model', {
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hi' }],
        jsonSchema: {
          name: 'VenueLinks',
          schema: zodSchema
        },
        responseFormat: 'json'
      });

      // Verify the schema format
      expect(result.text).toBeDefined();
      const format = (result.text as any).format;
      expect(format).toBeDefined();
      expect(format.type).toBe('json_schema');
      expect(format.name).toBe('VenueLinks');

      const schema = format.schema;

      // All top-level properties should be required (OpenAI workaround)
      expect(schema.required).toEqual(['venueName', 'officialWebsite', 'socialMedia', 'confidence', 'notes']);

      // Required field descriptions should remain unchanged
      expect(schema.properties.venueName.description).toBe('The name of the venue');
      expect(schema.properties.confidence.description).toBe('Confidence level in the results');

      // NOTE: After Cerebras commit, SchemaSanitizer makes all fields required,
      // so prepareResponseSchemaForOpenAI can't detect which were originally optional.
      // Optional field suffixes are no longer added after sanitization.
      expect(schema.properties.officialWebsite.description).toBe('Official website URL if found');
      expect(schema.properties.notes.description).toBe('Additional notes about the findings');

      // Nested object should also have all properties required
      const socialMediaSchema = schema.properties.socialMedia;
      expect(socialMediaSchema.required).toEqual(['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok']);

      // After sanitization, optional tracking is lost, so no suffixes are added
      expect(socialMediaSchema.properties.facebook.description).toBe('Facebook page URL');
      expect(socialMediaSchema.properties.instagram.description).toBe('Instagram account URL');
      expect(socialMediaSchema.properties.twitter.description).toBe('Twitter/X account URL');
      expect(socialMediaSchema.properties.linkedin.description).toBe('LinkedIn page URL');
      expect(socialMediaSchema.properties.youtube.description).toBe('YouTube channel URL');
      expect(socialMediaSchema.properties.tiktok.description).toBe('TikTok account URL');
    });

    it('should work with the exact venueLinksSchema from user request', async () => {
      // This is the exact schema from the user's original request
      const venueLinksSchema = z.object({
        venueName: z.string().describe('The name of the venue'),
        officialWebsite: z.string().optional().describe('Official website URL if found'),
        socialMedia: z.object({
          facebook: z.string().optional().describe('Facebook page URL'),
          instagram: z.string().optional().describe('Instagram account URL'),
          twitter: z.string().optional().describe('Twitter/X account URL'),
          linkedin: z.string().optional().describe('LinkedIn page URL'),
          youtube: z.string().optional().describe('YouTube channel URL'),
          tiktok: z.string().optional().describe('TikTok account URL')
        }).describe('Social media accounts found'),
        confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level in the results'),
        notes: z.string().optional().describe('Additional notes about the findings')
      });

      // Convert to OpenAI params
      const result = await converter.convertToOpenAIResponseParams('test-model', {
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hi' }],
        jsonSchema: {
          schema: venueLinksSchema
        },
        responseFormat: 'json'
      });

      const schema = (result.text as any).format.schema;

      // Verify that all properties are required
      expect(schema.required).toEqual(['venueName', 'officialWebsite', 'socialMedia', 'confidence', 'notes']);

      // NOTE: After Cerebras commit, SchemaSanitizer makes all fields required,
      // so prepareResponseSchemaForOpenAI can't detect which were originally optional.
      // Optional field suffixes are no longer added after sanitization.
      expect(schema.properties.officialWebsite.description).toBe('Official website URL if found');
      expect(schema.properties.notes.description).toBe('Additional notes about the findings');

      // Verify nested fields
      const socialMedia = schema.properties.socialMedia;
      expect(socialMedia.required).toEqual(['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok']);
      expect(socialMedia.properties.facebook.description).toBe('Facebook page URL');
    });
  });

  describe('convertFromOpenAIResponse', () => {
    test('should convert basic OpenAI Response to universal format', () => {
      const openAIResponse = {
        id: 'resp_123',
        created_at: new Date().toISOString(),
        model: 'gpt-4o',
        usage: {
          input_tokens: 10,
          output_tokens: 20,
          total_tokens: 30
        },
        object: 'response',
        output_text: 'Hello, how can I help you?',
        status: 'completed'
      };

      const result = converter.convertFromOpenAIResponse(openAIResponse as any);

      expect(result).toEqual(expect.objectContaining({
        content: 'Hello, how can I help you?',
        role: 'assistant',
        metadata: expect.objectContaining({
          model: 'gpt-4o',
          created: expect.any(String),
          finishReason: 'stop',
          usage: expect.objectContaining({
            tokens: {
              input: {
                total: 10,
                cached: 0
              },
              output: {
                total: 20,
                reasoning: 0
              },
              total: 30
            }
          })
        })
      }));
    });

    test('should handle function tool calls', () => {
      // Mock the function call structure as it appears in the actual implementation
      const functionCall = {
        type: 'function_call',
        name: 'test_tool',
        arguments: '{"param1":"value1"}',
        id: 'fc_1234567890'
      };

      const openAIResponse = {
        id: 'resp_123',
        created_at: new Date().toISOString(),
        model: 'gpt-4o',
        usage: {
          input_tokens: 10,
          output_tokens: 20,
          total_tokens: 30
        },
        object: 'response',
        status: 'completed',
        output: [
          functionCall]

      };

      const result = converter.convertFromOpenAIResponse(openAIResponse as any);

      expect(result.content).toBe('');
      expect(result.toolCalls?.length).toBe(1);
      if (result.toolCalls && result.toolCalls.length > 0) {
        // Match the structure that extractDirectFunctionCalls actually creates
        expect(result.toolCalls[0]).toEqual({
          id: 'fc_1234567890',
          name: 'test_tool',
          arguments: { param1: 'value1' }
        });
      }
      // In the current implementation, the finishReason is set to 'stop' for completed responses,
      // regardless of whether tool calls are present
      expect(result.metadata?.finishReason).toBe('stop');
    });

    test('should preserve function_call items when top-level output_text is also present', () => {
      const openAIResponse = {
        id: 'resp_mixed',
        created_at: 0,
        model: 'gpt-5.4-mini-2026-03-17',
        object: 'response',
        status: 'completed',
        output_text: 'I will update it.',
        output: [{
          type: 'function_call',
          id: 'fc_1',
          call_id: 'call_1',
          name: 'update_account',
          arguments: JSON.stringify({ id: 'at58506', patch: {} })
        }],
        usage: {
          input_tokens: 10,
          output_tokens: 5,
          total_tokens: 15,
          input_tokens_details: { cached_tokens: 0 },
          output_tokens_details: { reasoning_tokens: 1 }
        }
      };

      const result = converter.convertFromOpenAIResponse(openAIResponse as any);

      expect(result.content).toBe('I will update it.');
      expect(result.toolCalls).toEqual([{
        id: 'fc_1',
        name: 'update_account',
        arguments: { id: 'at58506', patch: {} }
      }]);
      expect(result.metadata?.finishReason).toBe('stop');
    });

    test('should preserve function_call items with fallback assistant-message text without duplicating content', () => {
      const openAIResponse = {
        id: 'resp_mixed_fallback',
        created_at: 0,
        model: 'gpt-4o',
        object: 'response',
        status: 'completed',
        output: [
          {
            type: 'message',
            role: 'assistant',
            status: 'completed',
            content: [{ type: 'output_text', text: 'I will update it.' }]
          },
          {
            type: 'function_call',
            id: 'fc_1',
            name: 'update_account',
            arguments: '{"id":"at58506"}'
          }
        ]
      };

      const result = converter.convertFromOpenAIResponse(openAIResponse as any);

      expect(result.content).toBe('I will update it.');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls?.[0]).toEqual({
        id: 'fc_1',
        name: 'update_account',
        arguments: { id: 'at58506' }
      });
    });

    test('should not duplicate text when top-level output_text and assistant-message text are both present', () => {
      const openAIResponse = {
        id: 'resp_mixed_both_text',
        created_at: 0,
        model: 'gpt-4o',
        object: 'response',
        status: 'completed',
        output_text: 'I will update it.',
        output: [
          {
            type: 'message',
            role: 'assistant',
            status: 'completed',
            content: [{ type: 'output_text', text: 'I will update it.' }]
          },
          {
            type: 'function_call',
            id: 'fc_1',
            name: 'update_account',
            arguments: '{"id":"at58506"}'
          }
        ]
      };

      const result = converter.convertFromOpenAIResponse(openAIResponse as any);

      expect(result.content).toBe('I will update it.');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls?.[0].name).toBe('update_account');
    });

    test('should preserve multiple function_call items in native order when text is also present', () => {
      const openAIResponse = {
        id: 'resp_multi',
        created_at: 0,
        model: 'gpt-4o',
        object: 'response',
        status: 'completed',
        output_text: 'Working on it.',
        output: [
          { type: 'function_call', id: 'fc_a', name: 'first_tool', arguments: '{}' },
          { type: 'function_call', id: 'fc_b', name: 'second_tool', arguments: '{}' }
        ]
      };

      const result = converter.convertFromOpenAIResponse(openAIResponse as any);

      expect(result.content).toBe('Working on it.');
      expect(result.toolCalls?.map((call: { name: string }) => call.name)).toEqual(['first_tool', 'second_tool']);
      expect(result.toolCalls?.map((call: { id: string }) => call.id)).toEqual(['fc_a', 'fc_b']);
    });

    test('should keep text-only responses without inventing toolCalls', () => {
      const openAIResponse = {
        id: 'resp_text_only',
        created_at: 0,
        model: 'gpt-4o',
        object: 'response',
        status: 'completed',
        output_text: 'Hello, how can I help you?',
        output: [{
          type: 'message',
          role: 'assistant',
          status: 'completed',
          content: [{ type: 'output_text', text: 'Hello, how can I help you?' }]
        }]
      };

      const result = converter.convertFromOpenAIResponse(openAIResponse as any);

      expect(result.content).toBe('Hello, how can I help you?');
      expect(result.metadata?.outputTextProvenance).toEqual({
        outputTextCount: 1,
        responseId: 'resp_text_only',
        finalAnswerCount: 0,
        commentaryCount: 0,
        unphasedCount: 1,
        decisionalItem: { outputIndex: 0, contentIndex: 0 },
        items: [expect.objectContaining({
          outputIndex: 0,
          contentIndex: 0,
          length: 'Hello, how can I help you?'.length,
          sha256: expect.any(String),
          itemType: 'message',
          role: 'assistant',
          status: 'completed',
          contentType: 'output_text'
        })]
      });
      expect(result.toolCalls).toBeUndefined();
    });

    test('records provenance and withholds content when two identical output_text items are present', () => {
      const objectText = '{"action":"tool_call","toolName":"read_file"}';
      const openAIResponse = {
        id: 'resp_dup',
        created_at: 0,
        model: 'gpt-5.4-mini-2026-03-17',
        object: 'response',
        status: 'completed',
        output_text: objectText + objectText,
        output: [
          {
            id: 'msg_1',
            type: 'message',
            role: 'assistant',
            status: 'completed',
            content: [{ type: 'output_text', text: objectText }]
          },
          {
            id: 'msg_2',
            type: 'message',
            role: 'assistant',
            status: 'completed',
            content: [{ type: 'output_text', text: objectText }]
          }
        ]
      };

      const result = converter.convertFromOpenAIResponse(openAIResponse as any);

      expect(result.content).toBe('');
      expect(result.metadata?.outputTextProvenance?.outputTextCount).toBe(2);
      expect(result.metadata?.outputTextProvenance?.responseId).toBe('resp_dup');
      expect(result.metadata?.outputTextProvenance?.items).toHaveLength(2);
      expect(result.metadata?.outputTextProvenance?.items[0].sha256)
        .toBe(result.metadata?.outputTextProvenance?.items[1].sha256);
      expect(result.metadata?.outputTextProvenance?.items[0].length).toBe(objectText.length);
      expect(result.metadata?.outputTextProvenance?.items.map(i => i.itemId)).toEqual(['msg_1', 'msg_2']);
    });

    test('enumerates two distinct native messages after a reasoning item (incident shape)', () => {
      // Observed 0.5.3 provenance: outputIndex 1 and 2, equal length/hash, skipped index 0.
      const objectText = '{"action":"tool_call","toolName":"read_file","path":"/tmp/a"}';
      const padded = objectText + ' '.repeat(96 - objectText.length);
      expect(padded.length).toBe(96);

      const openAIResponse = {
        id: 'resp_00003d160c3a950b016ab17bfab6a087d2a17a1a40caec6264',
        created_at: 0,
        model: 'gpt-5.4-mini-2026-03-17',
        object: 'response',
        status: 'completed',
        output_text: padded + padded,
        output: [
          {
            id: 'rs_skipped',
            type: 'reasoning',
            summary: [{ type: 'summary_text', text: 'planning' }]
          },
          {
            id: 'msg_a',
            type: 'message',
            role: 'assistant',
            status: 'completed',
            phase: 'commentary',
            content: [{ type: 'output_text', text: padded }]
          },
          {
            id: 'msg_b',
            type: 'message',
            role: 'assistant',
            status: 'completed',
            phase: 'final_answer',
            content: [{ type: 'output_text', text: padded }]
          }
        ]
      };

      const result = converter.convertFromOpenAIResponse(openAIResponse as any);
      const provenance = result.metadata?.outputTextProvenance;

      // Commentary is intermediate; only the final_answer body is decisional.
      expect(result.content).toBe(padded);
      expect(provenance?.decisionalItem).toEqual({ outputIndex: 2, contentIndex: 0, phase: 'final_answer' });
      expect(result.toolCalls).toBeUndefined();
      expect(result.reasoning).toBe('planning');
      expect(provenance?.outputTextCount).toBe(2);
      expect(provenance?.responseId).toBe('resp_00003d160c3a950b016ab17bfab6a087d2a17a1a40caec6264');
      expect(provenance?.items.map(i => i.outputIndex)).toEqual([1, 2]);
      expect(provenance?.items.map(i => i.contentIndex)).toEqual([0, 0]);
      expect(provenance?.items[0].sha256).toBe(provenance?.items[1].sha256);
      expect(provenance?.items[0].length).toBe(96);
      expect(provenance?.items.map(i => i.itemId)).toEqual(['msg_a', 'msg_b']);
      expect(provenance?.items.map(i => i.phase)).toEqual(['commentary', 'final_answer']);
      expect(provenance?.items.every(i =>
        i.itemType === 'message' && i.role === 'assistant' && i.status === 'completed' && i.contentType === 'output_text'
      )).toBe(true);
    });

    test('does not invent a second output_text item from the SDK output_text join', () => {
      const objectText = '{"action":"tool_call","toolName":"read_file"}';
      const openAIResponse = {
        id: 'resp_join_only',
        created_at: 0,
        model: 'gpt-5.4-mini-2026-03-17',
        object: 'response',
        status: 'completed',
        // SDK addOutputText joins all parts with ''. Even if this getter looks duplicated,
        // CallLLM must count native output[] messages only.
        output_text: objectText + objectText,
        output: [
          {
            id: 'rs_1',
            type: 'reasoning',
            summary: []
          },
          {
            id: 'msg_only',
            type: 'message',
            role: 'assistant',
            status: 'completed',
            content: [{ type: 'output_text', text: objectText }]
          }
        ]
      };

      const result = converter.convertFromOpenAIResponse(openAIResponse as any);
      expect(result.metadata?.outputTextProvenance?.outputTextCount).toBe(1);
      expect(result.metadata?.outputTextProvenance?.items.map(i => i.outputIndex)).toEqual([1]);
      expect(result.content).toBe(objectText);
      expect(result.content).not.toBe(objectText + objectText);
    });

    test('records distinct hashes when two different output_text items are present', () => {
      const openAIResponse = {
        id: 'resp_diff',
        created_at: 0,
        model: 'gpt-4o',
        object: 'response',
        status: 'completed',
        output_text: '{"a":1}{"b":2}',
        output: [
          {
            type: 'message',
            role: 'assistant',
            status: 'completed',
            content: [{ type: 'output_text', text: '{"a":1}' }]
          },
          {
            type: 'message',
            role: 'assistant',
            status: 'completed',
            content: [{ type: 'output_text', text: '{"b":2}' }]
          }
        ]
      };

      const result = converter.convertFromOpenAIResponse(openAIResponse as any);
      expect(result.content).toBe('');
      expect(result.metadata?.outputTextProvenance?.outputTextCount).toBe(2);
      expect(result.metadata?.outputTextProvenance?.items[0].sha256)
        .not.toBe(result.metadata?.outputTextProvenance?.items[1].sha256);
    });

    test('counts two output_text parts inside a single message', () => {
      const openAIResponse = {
        id: 'resp_parts',
        created_at: 0,
        model: 'gpt-4o',
        object: 'response',
        status: 'completed',
        output_text: '{"a":1}{"a":1}',
        output: [{
          type: 'message',
          role: 'assistant',
          status: 'completed',
          content: [
            { type: 'output_text', text: '{"a":1}' },
            { type: 'output_text', text: '{"a":1}' }
          ]
        }]
      };

      const result = converter.convertFromOpenAIResponse(openAIResponse as any);
      expect(result.content).toBe('');
      expect(result.metadata?.outputTextProvenance?.outputTextCount).toBe(2);
      expect(result.metadata?.outputTextProvenance?.items.map(i => i.contentIndex)).toEqual([0, 1]);
    });

    test('preserves refusal with a single output_text item', () => {
      const openAIResponse = {
        id: 'resp_refusal_text',
        created_at: 0,
        model: 'gpt-4o',
        object: 'response',
        status: 'completed',
        output: [{
          type: 'message',
          role: 'assistant',
          status: 'completed',
          content: [
            { type: 'refusal', refusal: 'I cannot help with that.' },
            { type: 'output_text', text: '{"ok":true}' }
          ]
        }]
      };

      const result = converter.convertFromOpenAIResponse(openAIResponse as any);
      expect(result.content).toBe('{"ok":true}');
      expect(result.metadata?.refusal?.message).toBe('I cannot help with that.');
      expect(result.metadata?.outputTextProvenance?.outputTextCount).toBe(1);
    });

    test('preserves function_call when a single output_text item is also present', () => {
      const openAIResponse = {
        id: 'resp_text_tool',
        created_at: 0,
        model: 'gpt-4o',
        object: 'response',
        status: 'completed',
        output_text: 'calling',
        output: [
          {
            type: 'message',
            role: 'assistant',
            status: 'completed',
            content: [{ type: 'output_text', text: 'calling' }]
          },
          {
            type: 'function_call',
            id: 'fc_1',
            name: 'echo',
            arguments: '{"value":"x"}'
          }
        ]
      };

      const result = converter.convertFromOpenAIResponse(openAIResponse as any);
      expect(result.content).toBe('calling');
      expect(result.metadata?.outputTextProvenance?.outputTextCount).toBe(1);
      expect(result.toolCalls).toEqual([{
        id: 'fc_1',
        name: 'echo',
        arguments: { value: 'x' }
      }]);
    });

    describe('phase-aware decisional selection', () => {
      const message = (
        id: string,
        text: string,
        phase?: 'commentary' | 'final_answer' | null
      ) => ({
        id,
        type: 'message',
        role: 'assistant',
        status: 'completed',
        ...(phase !== undefined ? { phase } : {}),
        content: [{ type: 'output_text', text }]
      });

      const nativeResponse = (id: string, items: unknown[], extra: Record<string, unknown> = {}) => ({
        id,
        created_at: 0,
        model: 'gpt-5.4-mini-2026-03-17',
        object: 'response',
        status: 'completed',
        output: items,
        ...extra
      });

      test('projects only the final_answer body when commentary differs', () => {
        const result = converter.convertFromOpenAIResponse(nativeResponse('resp_phase_diff', [
          message('msg_c', 'Let me check the file first.', 'commentary'),
          message('msg_f', '{"action":"answer","text":"done"}', 'final_answer')
        ]) as any);

        expect(result.content).toBe('{"action":"answer","text":"done"}');
        const provenance = result.metadata?.outputTextProvenance;
        expect(provenance?.outputTextCount).toBe(2);
        expect(provenance?.finalAnswerCount).toBe(1);
        expect(provenance?.commentaryCount).toBe(1);
        expect(provenance?.unphasedCount).toBe(0);
        expect(provenance?.items.map(i => i.itemId)).toEqual(['msg_c', 'msg_f']);
        expect(provenance?.decisionalItem).toEqual({ outputIndex: 1, contentIndex: 0, phase: 'final_answer' });
      });

      test('projects the final_answer body when commentary is byte-identical', () => {
        const body = '{"action":"answer","text":"done"}';
        const result = converter.convertFromOpenAIResponse(nativeResponse('resp_phase_same', [
          message('msg_c', body, 'commentary'),
          message('msg_f', body, 'final_answer')
        ]) as any);

        // Same outcome as the differing-bodies case: equality plays no role in selection.
        expect(result.content).toBe(body);
        const provenance = result.metadata?.outputTextProvenance;
        expect(provenance?.items[0].sha256).toBe(provenance?.items[1].sha256);
        expect(provenance?.decisionalItem).toEqual({ outputIndex: 1, contentIndex: 0, phase: 'final_answer' });
      });

      test('projects the last final_answer body when several are present', () => {
        const result = converter.convertFromOpenAIResponse(nativeResponse('resp_two_final', [
          message('msg_f1', '{"a":1}', 'final_answer'),
          message('msg_f2', '{"a":2}', 'final_answer')
        ]) as any);

        expect(result.content).toBe('{"a":2}');
        const provenance = result.metadata?.outputTextProvenance;
        expect(provenance?.finalAnswerCount).toBe(2);
        expect(provenance?.items.map(i => i.itemId)).toEqual(['msg_f1', 'msg_f2']);
        expect(provenance?.decisionalItem).toEqual({ outputIndex: 1, contentIndex: 0, phase: 'final_answer' });
      });

      test('projects the last final_answer body even with commentary interleaved', () => {
        const result = converter.convertFromOpenAIResponse(nativeResponse('resp_interleaved', [
          message('msg_f1', '{"a":1}', 'final_answer'),
          message('msg_c', 'reconsidering', 'commentary'),
          message('msg_f2', '{"a":2}', 'final_answer')
        ]) as any);

        expect(result.content).toBe('{"a":2}');
        expect(result.metadata?.outputTextProvenance?.decisionalItem)
          .toEqual({ outputIndex: 2, contentIndex: 0, phase: 'final_answer' });
      });

      test('withholds content when only commentary items are present', () => {
        const result = converter.convertFromOpenAIResponse(nativeResponse('resp_commentary_only', [
          message('msg_c1', 'thinking', 'commentary'),
          message('msg_c2', 'still thinking', 'commentary')
        ]) as any);

        expect(result.content).toBe('');
        expect(result.metadata?.outputTextProvenance?.commentaryCount).toBe(2);
        expect(result.metadata?.outputTextProvenance?.finalAnswerCount).toBe(0);
      });

      test('withholds content when a final_answer coexists with an unphased item', () => {
        const result = converter.convertFromOpenAIResponse(nativeResponse('resp_mixed_phase', [
          message('msg_u', '{"a":1}'),
          message('msg_f', '{"a":2}', 'final_answer')
        ]) as any);

        expect(result.content).toBe('');
        const provenance = result.metadata?.outputTextProvenance;
        expect(provenance?.finalAnswerCount).toBe(1);
        expect(provenance?.unphasedCount).toBe(1);
        expect(provenance?.decisionalItem).toBeUndefined();
      });

      test('treats an explicit null phase as unphased on a lone item', () => {
        const result = converter.convertFromOpenAIResponse(nativeResponse('resp_null_phase', [
          message('msg_n', '{"a":1}', null)
        ]) as any);

        expect(result.content).toBe('{"a":1}');
        const provenance = result.metadata?.outputTextProvenance;
        expect(provenance?.unphasedCount).toBe(1);
        expect(provenance?.items[0].phase).toBeNull();
        expect(provenance?.decisionalItem).toEqual({ outputIndex: 0, contentIndex: 0, phase: null });
      });

      test('keeps a single final_answer item plus function_call unchanged', () => {
        const result = converter.convertFromOpenAIResponse(nativeResponse('resp_final_tool', [
          message('msg_f', 'calling', 'final_answer'),
          { type: 'function_call', id: 'fc_1', name: 'echo', arguments: '{"value":"x"}' }
        ]) as any);

        expect(result.content).toBe('calling');
        expect(result.metadata?.outputTextProvenance?.outputTextCount).toBe(1);
        expect(result.toolCalls).toEqual([{ id: 'fc_1', name: 'echo', arguments: { value: 'x' } }]);
      });
    });

    test('should keep malformed function-call arguments as rawArguments', () => {
      const openAIResponse = {
        id: 'resp_raw',
        created_at: 0,
        model: 'gpt-4o',
        object: 'response',
        status: 'completed',
        output_text: 'Calling the tool.',
        output: [{
          type: 'function_call',
          id: 'fc_bad',
          name: 'update_account',
          arguments: '{not-json'
        }]
      };

      const result = converter.convertFromOpenAIResponse(openAIResponse as any);

      expect(result.content).toBe('Calling the tool.');
      expect(result.toolCalls?.[0]).toEqual({
        id: 'fc_bad',
        name: 'update_account',
        arguments: { rawArguments: '{not-json' }
      });
    });

    test('should handle incomplete responses', () => {
      const openAIResponse = {
        id: 'resp_123',
        created_at: new Date().toISOString(),
        model: 'gpt-4o',
        status: 'incomplete',
        incomplete_details: {
          reason: 'max_output_tokens'
        },
        object: 'response',
        output_text: 'This response was cut off'
      };

      const result = converter.convertFromOpenAIResponse(openAIResponse as any);

      expect(result.metadata?.finishReason).toBe('length');
      expect(result.metadata?.providerStatus).toBe('incomplete');
      expect(result.metadata?.incompleteReason).toBe('max_output_tokens');
      expect(result.content).toBe('This response was cut off');
    });

    test('should project message-level refusal content into metadata', () => {
      const openAIResponse = {
        id: 'resp_refuse',
        created_at: Date.now(),
        model: 'gpt-4o',
        status: 'completed',
        object: 'response',
        output: [{
          type: 'message',
          role: 'assistant',
          status: 'completed',
          content: [{
            type: 'refusal',
            refusal: 'I cannot fulfill that request.'
          }]
        }]
      };

      const result = converter.convertFromOpenAIResponse(openAIResponse as any);

      expect(result.content).toBe('');
      expect(result.metadata?.refusal).toEqual({
        message: 'I cannot fulfill that request.'
      });
      expect(result.metadata?.providerStatus).toBe('completed');
      // Refusal-only completed responses must not look like ordinary stop content
      expect(result.metadata?.finishReason).toBe('content_filter');
    });

    test('should handle content safety issues', () => {
      const openAIResponse = {
        id: 'resp_123',
        created_at: new Date().toISOString(),
        model: 'gpt-4o',
        status: 'failed',
        error: {
          code: 'content_filter',
          message: 'Content was filtered due to safety concerns'
        },
        object: 'response'
      };

      const result = converter.convertFromOpenAIResponse(openAIResponse as any);

      // The converter maps 'failed' status to 'error' finish reason,
      // The refusal info is stored in metadata.refusal
      expect(result.metadata?.finishReason).toBe('error');
      expect(result.metadata?.refusal).toEqual({
        message: 'Content was filtered due to safety concerns',
        code: 'content_filter'
      });
      expect(result.content).toBe('');
    });
  });

  describe('structured output unions and GPT-5 request shaping', () => {
    const gpt5Model = {
      name: 'gpt-5',
      inputPricePerMillion: 1.25,
      outputPricePerMillion: 10,
      maxRequestTokens: 400000,
      maxResponseTokens: 128000,
      capabilities: {
        reasoning: true,
        input: { text: true },
        output: {
          text: {
            textOutputFormats: ['text', 'json'],
            structuredOutputs: true,
            jsonSchemaUnions: 'anyOf' as const
          }
        }
      },
      characteristics: { qualityIndex: 90, outputSpeed: 100, firstTokenLatency: 1000 }
    } as unknown as ModelInfo;

    const flattenModel = {
      ...gpt5Model,
      name: 'custom-flatten',
      capabilities: {
        reasoning: false,
        input: { text: true },
        output: {
          text: {
            textOutputFormats: ['text', 'json'],
            structuredOutputs: true,
            jsonSchemaUnions: 'flatten' as const
          }
        }
      }
    } as unknown as ModelInfo;

    const adjudicationSchema = z.object({
      outcome: z.enum(['MATCH', 'NO_MATCH', 'ABSTAIN']),
      canonicalEntityId: z.string().nullable().describe('Exact allowed candidate id or null'),
      confidence: z.number().min(0).max(1),
      reasonCode: z.string(),
      rationale: z.string(),
      supportingEvidence: z.array(z.string()).max(20),
      contradictingEvidence: z.array(z.string()).max(20)
    });

    it('keeps nullable anyOf for GPT-5 and preserves verbosity/strict/instructions', async () => {
      mockModelManager.getModel.mockReturnValue(gpt5Model);

      const result = await converter.convertToOpenAIResponseParams('gpt-5', {
        model: 'gpt-5',
        messages: [{ role: 'user', content: 'Adjudicate this case' }],
        systemMessage: 'You are a conservative entity-resolution reasoner.',
        settings: {
          reasoning: { effort: 'low' },
          verbosity: 'low'
        },
        jsonSchema: {
          name: 'CallKgResolutionAdjudication',
          schema: adjudicationSchema
        },
        responseFormat: 'json'
      });

      expect(result.instructions).toBe('You are a conservative entity-resolution reasoner.');
      expect((result.text as any)?.verbosity).toBe('low');
      const format = (result.text as any)?.format;
      expect(format.type).toBe('json_schema');
      expect(format.strict).toBe(true);
      expect(format.name).toBe('CallKgResolutionAdjudication');
      expect(format.schema.properties.canonicalEntityId.anyOf).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'string' }),
          expect.objectContaining({ type: 'null' })
        ])
      );
      expect(format.schema.properties.canonicalEntityId_selected).toBeUndefined();
      expect(JSON.stringify(result.input)).not.toContain('System Instructions:');
    });

    describe('composition-aware strict schema projection', () => {
      const project = async (properties: Record<string, unknown>, required: string[] = []) => {
        mockModelManager.getModel.mockReturnValue(gpt5Model);
        const result = await converter.convertToOpenAIResponseParams('gpt-5', {
          model: 'gpt-5',
          messages: [{ role: 'user', content: 'Decide' }],
          responseFormat: 'json',
          jsonSchema: {
            name: 'Projection',
            schema: { type: 'object', additionalProperties: false, properties, required }
          }
        });
        return {
          format: (result.text as any)?.format,
          properties: (result.text as any)?.format?.schema?.properties as Record<string, any>
        };
      };

      it('keeps a nullable property as a composition without a sibling type', async () => {
        const { format, properties } = await project({
          toolName: { type: ['string', 'null'] },
          argumentsJson: { type: ['string', 'null'] }
        }, ['toolName', 'argumentsJson']);

        expect(format.type).toBe('json_schema');
        expect(format.strict).toBe(true);
        for (const key of ['toolName', 'argumentsJson']) {
          expect(properties[key].anyOf).toEqual([{ type: 'string' }, { type: 'null' }]);
          expect('type' in properties[key]).toBe(false);
        }
      });

      it('keeps explicit anyOf, oneOf, and allOf properties as compositions', async () => {
        const { properties } = await project({
          explicitAnyOf: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          explicitOneOf: { oneOf: [{ type: 'string' }, { type: 'number' }] },
          explicitAllOf: { allOf: [{ type: 'object', properties: { c: { type: 'string' } } }] }
        });

        expect('type' in properties.explicitAnyOf).toBe(false);
        expect('type' in properties.explicitOneOf).toBe(false);
        expect('type' in properties.explicitAllOf).toBe(false);
        expect(properties.explicitOneOf.oneOf).toHaveLength(2);
      });

      it('preserves closed object variants inside a composition', async () => {
        const { properties } = await project({
          variants: {
            anyOf: [
              { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] },
              { type: 'object', properties: { b: { type: 'number' } }, required: ['b'] }
            ]
          }
        });

        expect('type' in properties.variants).toBe(false);
        expect(properties.variants.anyOf).toHaveLength(2);
        for (const branch of properties.variants.anyOf) {
          expect(branch.type).toBe('object');
          expect(branch.additionalProperties).toBe(false);
        }
        expect(properties.variants.anyOf[0].properties.a.type).toBe('string');
        expect(properties.variants.anyOf[1].properties.b.type).toBe('number');
      });

      it('keeps compositions nested inside array items', async () => {
        const { properties } = await project({
          listOfUnions: { type: 'array', items: { anyOf: [{ type: 'string' }, { type: 'null' }] } }
        });

        expect(properties.listOfUnions.type).toBe('array');
        expect('type' in properties.listOfUnions.items).toBe(false);
        expect(properties.listOfUnions.items.anyOf).toEqual([{ type: 'string' }, { type: 'null' }]);
      });

      it('leaves $ref nodes untouched, alone and inside a composition', async () => {
        mockModelManager.getModel.mockReturnValue(gpt5Model);
        const result = await converter.convertToOpenAIResponseParams('gpt-5', {
          model: 'gpt-5',
          messages: [{ role: 'user', content: 'Decide' }],
          responseFormat: 'json',
          jsonSchema: {
            name: 'Refs',
            schema: {
              type: 'object',
              additionalProperties: false,
              $defs: { Foo: { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] } },
              properties: {
                refProp: { $ref: '#/$defs/Foo' },
                nullableRef: { anyOf: [{ $ref: '#/$defs/Foo' }, { type: 'null' }] }
              },
              required: []
            }
          }
        });
        const properties = (result.text as any)?.format?.schema?.properties;

        expect(properties.refProp).toEqual({ $ref: '#/$defs/Foo' });
        expect(properties.nullableRef.anyOf[0]).toEqual({ $ref: '#/$defs/Foo' });
        expect('type' in properties.nullableRef).toBe(false);
      });

      it('derives enum and const types from their literals', async () => {
        const { properties } = await project({
          stringEnum: { enum: ['a', 'b'] },
          numericEnum: { enum: [1, 2, 3] },
          boolEnum: { enum: [true, false] },
          mixedEnum: { enum: ['a', 1, null] },
          constNumber: { const: 5 }
        });

        expect(properties.stringEnum.type).toBe('string');
        expect(properties.numericEnum.type).toBe('number');
        expect(properties.boolEnum.type).toBe('boolean');
        expect('type' in properties.mixedEnum).toBe(false);
        expect(properties.constNumber.type).toBe('number');
      });

      it('keeps ordinary structural and untyped-leaf inference unchanged', async () => {
        const { properties } = await project({
          untypedWithProps: { properties: { d: { type: 'string' } } },
          untypedWithItems: { items: { type: 'string' } },
          trulyUntyped: { description: 'leaf' }
        });

        expect(properties.untypedWithProps.type).toBe('object');
        expect(properties.untypedWithProps.additionalProperties).toBe(false);
        expect(properties.untypedWithItems.type).toBe('array');
        expect(properties.trulyUntyped.type).toBe('string');
      });
    });

    it('collapses nullable unions without selectors in flatten mode', async () => {
      mockModelManager.getModel.mockReturnValue(flattenModel);

      const result = await converter.convertToOpenAIResponseParams('custom-flatten', {
        model: 'custom-flatten',
        messages: [{ role: 'user', content: 'Hi' }],
        jsonSchema: {
          name: 'CallKgResolutionAdjudication',
          schema: adjudicationSchema
        },
        responseFormat: 'json'
      });

      const schema = (result.text as any)?.format?.schema;
      expect(schema.properties.canonicalEntityId_selected).toBeUndefined();
      expect(schema.properties.canonicalEntityId.type).toEqual(['string', 'null']);
    });

    it('flattens multi-variant unions with optional option fields only', async () => {
      mockModelManager.getModel.mockReturnValue(flattenModel);
      const multiSchema = z.object({
        payload: z.union([
          z.object({ kind: z.literal('text'), value: z.string() }),
          z.object({ kind: z.literal('number'), value: z.number() })
        ])
      });

      const result = await converter.convertToOpenAIResponseParams('custom-flatten', {
        model: 'custom-flatten',
        messages: [{ role: 'user', content: 'Hi' }],
        jsonSchema: {
          name: 'Multi',
          schema: multiSchema
        },
        responseFormat: 'json'
      });

      const schema = (result.text as any)?.format?.schema;
      expect(schema.required).toContain('payload_selected');
      expect(schema.required).not.toContain('payload_text');
      expect(schema.required).not.toContain('payload_number');
      expect(schema.properties.payload_text).toBeDefined();
      expect(schema.properties.payload_number).toBeDefined();
    });
  });
});
