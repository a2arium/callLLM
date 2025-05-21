import { jest } from '@jest/globals';
/**
 * Integration Test: ChatController - Tool Calls with JSON Schema Persistence
 *
 * Verifies that when a chat call requests JSON output with a schema and involves
 * tool execution, the JSON schema requirement is correctly passed to the
 * follow-up LLM call after tool results are processed, ensuring the final
 * response is properly formatted and validated.
 */
import { z } from 'zod';
import { LLMCaller } from '../../../../core/caller/LLMCaller.js';
import { LLMProvider } from '../../../../interfaces/LLMProvider.js';
import { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse, FinishReason } from '../../../../interfaces/UniversalInterfaces.js';
import { ToolDefinition } from '../../../../types/tooling.js';
import { ModelManager } from '../../../../core/models/ModelManager.js';
import { ProviderManager } from '../../../../core/caller/ProviderManager.js';

// Mock Provider using the LLMProvider interface
const mockProviderAdapter: jest.Mocked<LLMProvider> = {
  chatCall: jest.fn(),
  streamCall: jest.fn(),
  // Required LLMProvider methods
  convertToProviderParams: jest.fn().mockImplementation((params) => params),
  convertFromProviderResponse: jest.fn().mockImplementation((resp) => resp),
  convertFromProviderStreamResponse: jest.fn().mockImplementation((resp) => resp)
};

// Mock the model info
const mockModelInfo = {
  name: 'mock-model',
  inputPricePerMillion: 1,
  outputPricePerMillion: 1,
  maxRequestTokens: 4000,
  maxResponseTokens: 1000,
  capabilities: {
    streaming: true,
    toolCalls: true,
    input: { text: true },
    output: { text: { textOutputFormats: ['text', 'json'] as ('text' | 'json')[] } }
  },
  characteristics: {
    qualityIndex: 50,
    outputSpeed: 50,
    firstTokenLatency: 500
  }
};

// Mock Usage Tracker
const mockUsageTracker = {
  trackUsage: jest.fn().mockResolvedValue({
    tokens: { input: { total: 10, cached: 0 }, output: { total: 20, reasoning: 0 }, total: 30 },
    costs: { input: { total: 0.00001, cached: 0 }, output: { total: 0.00002, reasoning: 0 }, total: 0.00003 }
  }),
  setCallerId: jest.fn(),
  getCallerId: jest.fn().mockReturnValue('test-caller-id')
};

// Simple tool definition
const simpleTool: ToolDefinition = {
  name: 'get_simple_data',
  description: 'Gets simple data',
  parameters: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description: 'The key for the data'
      }
    },
    required: ['key']
  },
  // Use a simpler approach with a type assertion for the test
  callFunction: (async (params: any) => {
    return {
      success: true,
      value: `Data for ${params.key}`
    };
  }) as unknown as <TParams extends Record<string, unknown>, TResponse = unknown>(
  params: TParams)
  => Promise<TResponse>
};

// Zod schema for expected JSON output
const SimpleDataSchema = z.object({
  resultValue: z.string(),
  sourceKey: z.string()
});

// Mock the ProviderManager
const mockProviderManager: jest.Mocked<ProviderManager> = {
  getProvider: jest.fn().mockReturnValue(mockProviderAdapter),
  registerProvider: jest.fn(),
  updateProviderApiKey: jest.fn(),
  getProviderName: jest.fn().mockReturnValue('openai')
} as unknown as jest.Mocked<ProviderManager>;

describe('Integration: ChatController - Tools with JSON Schema', () => {
  let caller: LLMCaller;
  let modelManager: ModelManager;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Set up the model manager and register the mock model
    modelManager = new ModelManager('openai');
    modelManager.addModel(mockModelInfo);

    // Define the mock usage object to resolve the promise
    const mockUsage = {
      tokens: { input: { total: 10, cached: 0 }, output: { total: 20, reasoning: 0 }, total: 30 },
      costs: { input: { total: 0.00001, cached: 0 }, output: { total: 0.00002, reasoning: 0 }, total: 0.00003 }
    };
    mockUsageTracker.trackUsage.mockResolvedValue(mockUsage);

    // Mock the two-step response from the provider adapter
    mockProviderAdapter.chatCall
    // 1. First call: LLM responds with a tool call request
    .mockResolvedValueOnce({
      content: '',
      role: 'assistant',
      toolCalls: [{
        id: 'tool_call_123',
        name: 'get_simple_data',
        arguments: { key: 'testKey' }
      }],
      metadata: { finishReason: FinishReason.TOOL_CALLS, usage: mockUsage }
    })
    // 2. Second call (after tool result): LLM responds with the final JSON content
    .mockResolvedValueOnce({
      content: JSON.stringify({ resultValue: 'Data for testKey', sourceKey: 'testKey' }),
      role: 'assistant',
      contentObject: { resultValue: 'Data for testKey', sourceKey: 'testKey' },
      metadata: { finishReason: FinishReason.STOP, usage: mockUsage }
    });

    // Initialize LLMCaller, injecting the mock ProviderManager and ModelManager
    caller = new LLMCaller('openai', 'mock-model', 'System Prompt', {
      modelManager,
      providerManager: mockProviderManager
    });

    // Inject other mocks directly if necessary
    (caller as any).usageTracker = mockUsageTracker;
    caller.addTool(simpleTool);
  });

  it('should persist JSON schema requirement across tool execution and return validated contentObject', async () => {
    const response = await caller.call<typeof SimpleDataSchema>(
      'Get simple data for key "testKey" and format as JSON.',
      {
        responseFormat: 'json',
        jsonSchema: {
          name: 'SimpleDataResponse',
          schema: SimpleDataSchema
        },
        tools: [simpleTool]
      }
    );

    // Assertions
    expect(mockProviderAdapter.chatCall).toHaveBeenCalledTimes(2);

    // Check first call parameters (initial request);
    const firstCallParams = mockProviderAdapter.chatCall.mock.calls[0][1];
    expect(firstCallParams.responseFormat).toBe('json');
    expect(firstCallParams.jsonSchema?.name).toEqual('SimpleDataResponse');
    expect(firstCallParams.jsonSchema?.schema).toEqual(SimpleDataSchema);
    expect(firstCallParams.tools).toBeDefined();
    expect(firstCallParams.tools).toHaveLength(1);
    expect(firstCallParams.tools?.[0].name).toBe('get_simple_data');

    // Check second call parameters (request after tool result);
    const secondCallParams = mockProviderAdapter.chatCall.mock.calls[1][1];
    expect(secondCallParams.messages).toEqual(expect.arrayContaining([
    expect.objectContaining({ role: 'system', content: 'System Prompt' }),
    expect.objectContaining({ role: 'user', content: 'Get simple data for key "testKey" and format as JSON.' }),
    expect.objectContaining({ role: 'assistant', toolCalls: expect.any(Array) }),
    expect.objectContaining({ role: 'tool', toolCallId: 'tool_call_123', content: JSON.stringify({ success: true, value: 'Data for testKey' }) })]
    ));
    expect(secondCallParams.responseFormat).toBe('json');
    expect(secondCallParams.jsonSchema?.name).toEqual('SimpleDataResponse');
    expect(secondCallParams.jsonSchema?.schema).toEqual(SimpleDataSchema);
    expect(secondCallParams.tools).toBeUndefined();

    // Check final response (accessing the first element of the array)
    expect(response).toBeDefined();
    expect(response).toHaveLength(1);
    expect(response[0].content).toBe(JSON.stringify({ resultValue: 'Data for testKey', sourceKey: 'testKey' }));
    expect(response[0].contentObject).toBeDefined();
    expect(response[0].contentObject).toEqual({ resultValue: 'Data for testKey', sourceKey: 'testKey' });

    // Check schema validation occurred (implicitly via contentObject being correct type);
    const validationResult = SimpleDataSchema.safeParse(response[0].contentObject);
    expect(validationResult.success).toBe(true);
  });
});