import { jest } from '@jest/globals';
import type { AdapterConstructor } from '../../../../adapters/types.js';

// Mock function declarations
const mockGetRegisteredProviders = jest.fn();
const mockGetRegisteredProviders_1 = jest.fn();
const mockGetRegisteredProviders_2 = jest.fn()

let ProviderManager: any;
let OpenAIResponseAdapter: any;
let adapterRegistry: Map<string, AdapterConstructor>;
let getRegisteredProviders: () => string[];
let ProviderNotFoundError: any;

beforeAll(async () => {
  console.log('[PM Test] beforeAll: Setting up mocks...');
  jest.unstable_mockModule('../../../../adapters/index.js', () => {
    console.log('[PM Test] MOCK FACTORY FOR adapters/index EXECUTING');
    return {
      __esModule: true,
      adapterRegistry: new Map(),
      getRegisteredProviders: jest.fn(() => {
        console.log('[PM Test] Mocked getRegisteredProviders called from SIMPLIFIED mock');
        return ['openai'];
      }),
      __esModule: true
    };
  });

  jest.unstable_mockModule('../../../../adapters/openai/adapter.js', () => ({
    OpenAIResponseAdapter: jest.fn().mockImplementation(() => {
      console.log('[PM Test] Mocked OpenAIResponseAdapter constructor called');
      return {};
    }),
    __esModule: true
  }));

  console.log('[PM Test] beforeAll: Importing SUT and mocked modules...');
  const pmModule = await import('../../../../core/caller/ProviderManager');
  ProviderManager = pmModule.ProviderManager;

  const oaiAdapterModule = await import('../../../../adapters/openai/adapter');
  OpenAIResponseAdapter = oaiAdapterModule.OpenAIResponseAdapter;

  const adaptersIndexModule = await import('../../../../adapters/index');
  adapterRegistry = adaptersIndexModule.adapterRegistry;
  getRegisteredProviders = adaptersIndexModule.getRegisteredProviders;
  console.log('[PM Test] beforeAll: adapterRegistry from import:', adapterRegistry);
  console.log('[PM Test] beforeAll: getRegisteredProviders from import:', typeof getRegisteredProviders);


  const adaptersTypesModule = await import('../../../../adapters/types');
  ProviderNotFoundError = adaptersTypesModule.ProviderNotFoundError;
  console.log('[PM Test] beforeAll: Setup complete.');
});

describe('ProviderManager', () => {
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    console.log('[PM Test] beforeEach: Clearing and setting up mocks...');
    if (OpenAIResponseAdapter && typeof OpenAIResponseAdapter.mockClear === 'function') {
      OpenAIResponseAdapter.mockClear();
      console.log('[PM Test] beforeEach: OpenAIResponseAdapter mock cleared.');
    }

    if (adapterRegistry) {
      adapterRegistry.clear();
      console.log('[PM Test] beforeEach: adapterRegistry (mockMap) cleared.');
      if (getRegisteredProviders && typeof getRegisteredProviders === 'function') {
        const providers = getRegisteredProviders();
        console.log('[PM Test] beforeEach: getRegisteredProviders() returned:', providers);
        if (providers.includes('openai')) {
          adapterRegistry.set('openai', OpenAIResponseAdapter as AdapterConstructor);
          console.log('[PM Test] beforeEach: adapterRegistry set for openai with:', OpenAIResponseAdapter);
        } else {
          console.warn('[PM Test] beforeEach: Mocked getRegisteredProviders did not return \'openai\'.');
        }
      } else {
        console.warn('[PM Test] beforeEach: Mocked getRegisteredProviders is not a function or not available.');
      }
    } else {
      console.warn('[PM Test] beforeEach: adapterRegistry (mockMap) not available.');
    }

    if (typeof mockGetRegisteredProviders_1?.mockClear === 'function') {
      mockGetRegisteredProviders_1.mockClear();
      console.log('[PM Test] beforeEach: getRegisteredProviders mock cleared.');
    }
    console.log('[PM Test] beforeEach: Setup complete.');
  });

  describe('constructor', () => {
    it('should initialize with OpenAI provider', () => {
      console.log('[PM Test] Test: should initialize with OpenAI provider - START');
      console.log('[PM Test] Test: Current adapterRegistry before new ProviderManager():', adapterRegistry);
      console.log('[PM Test] Test: Is OpenAIResponseAdapter a mock function?', jest.isMockFunction(OpenAIResponseAdapter));
      const manager = new ProviderManager('openai', mockApiKey);
      expect(OpenAIResponseAdapter).toHaveBeenCalledWith({ apiKey: mockApiKey });
      expect(manager.getCurrentProviderName()).toBe('openai');
      console.log('[PM Test] Test: should initialize with OpenAI provider - END');
    });

    it('should initialize without API key', () => {
      const manager = new ProviderManager('openai');
      expect(OpenAIResponseAdapter).toHaveBeenCalledWith({});
      expect(manager.getCurrentProviderName()).toBe('openai');
    });

    it('should throw error for unregistered provider', () => {
      expect(() => new ProviderManager('unsupported' as any)).
        toThrow(new ProviderNotFoundError('unsupported').message);
    });
  });

  describe('getProvider', () => {
    it('should return the current provider', () => {
      const manager = new ProviderManager('openai', mockApiKey);
      const provider = manager.getProvider();
      expect(provider).toBeDefined();
      expect(OpenAIResponseAdapter).toHaveBeenCalledTimes(1);
    });
  });

  describe('switchProvider', () => {
    it('should throw error when switching to unregistered provider', () => {
      const manager = new ProviderManager('openai', mockApiKey);
      expect(() => manager.switchProvider('unsupported' as any)).
        toThrow(new ProviderNotFoundError('unsupported').message);
    });
  });

  describe('getCurrentProviderName', () => {
    it('should return current provider name', () => {
      const manager = new ProviderManager('openai', mockApiKey);
      expect(manager.getCurrentProviderName()).toBe('openai');
    });
  });

  describe('error handling', () => {
    it('should handle adapter initialization errors', () => {
      OpenAIResponseAdapter.mockImplementationOnce(() => {
        throw new Error('API key required');
      });

      expect(() => new ProviderManager('openai' as any)).
        toThrow('API key required');
    });

    it('should handle registry lookup errors', () => {
      if (adapterRegistry) adapterRegistry.delete('openai' as any);
      if (typeof getRegisteredProviders === 'function') {
        mockGetRegisteredProviders_1.mockReturnValueOnce([]);
      }
      expect(() => new ProviderManager('openai' as any)).
        toThrow(new ProviderNotFoundError('openai').message);
    });
  });
});