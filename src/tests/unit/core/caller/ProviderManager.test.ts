import { ProviderManager } from '../../../../core/caller/ProviderManager.js';
import { OpenAIResponseAdapter } from '../../../../adapters/openai/adapter.js';
import { adapterRegistry } from '../../../../adapters/index.js';
import { ProviderNotFoundError } from '../../../../adapters/types.js';
import type { AdapterConstructor } from '../../../../adapters/types.js';
import type { RegisteredProviders } from '../../../../adapters/index.js';

// Mock the adapter registry
jest.mock('../../../../adapters/index', () => {
    const mockMap = new Map<string, AdapterConstructor>();
    return {
        adapterRegistry: mockMap,
        RegisteredProviders: ['openai'],
        __esModule: true
    };
});

// Mock OpenAIResponseAdapter
jest.mock('../../../../adapters/openai/adapter');

describe('ProviderManager', () => {
    const mockApiKey = 'test-api-key';

    beforeEach(() => {
        jest.clearAllMocks();
        (OpenAIResponseAdapter as jest.Mock).mockClear();

        // Reset registry mocks
        adapterRegistry.clear();
        adapterRegistry.set('openai' as RegisteredProviders, OpenAIResponseAdapter as unknown as AdapterConstructor);
    });

    describe('constructor', () => {
        it('should initialize with OpenAI provider', () => {
            const manager = new ProviderManager('openai' as RegisteredProviders, mockApiKey);
            expect(OpenAIResponseAdapter).toHaveBeenCalledWith({ apiKey: mockApiKey });
            expect(manager.getCurrentProviderName()).toBe('openai');
        });

        it('should initialize without API key', () => {
            const manager = new ProviderManager('openai' as RegisteredProviders);
            expect(OpenAIResponseAdapter).toHaveBeenCalledWith({});
            expect(manager.getCurrentProviderName()).toBe('openai');
        });

        it('should throw error for unregistered provider', () => {
            expect(() => new ProviderManager('unsupported' as RegisteredProviders))
                .toThrow(new ProviderNotFoundError('unsupported').message);
        });
    });

    describe('getProvider', () => {
        it('should return the current provider', () => {
            const manager = new ProviderManager('openai' as RegisteredProviders, mockApiKey);
            const provider = manager.getProvider();
            expect(provider).toBeInstanceOf(OpenAIResponseAdapter);
        });
    });

    describe('switchProvider', () => {
        it('should throw error when switching to unregistered provider', () => {
            const manager = new ProviderManager('openai' as RegisteredProviders, mockApiKey);
            expect(() => manager.switchProvider('unsupported' as RegisteredProviders))
                .toThrow(new ProviderNotFoundError('unsupported').message);
        });
    });

    describe('getCurrentProviderName', () => {
        it('should return current provider name', () => {
            const manager = new ProviderManager('openai' as RegisteredProviders, mockApiKey);
            expect(manager.getCurrentProviderName()).toBe('openai');
        });
    });

    describe('error handling', () => {
        it('should handle adapter initialization errors', () => {
            (OpenAIResponseAdapter as jest.Mock).mockImplementationOnce(() => {
                throw new Error('API key required');
            });

            expect(() => new ProviderManager('openai' as RegisteredProviders))
                .toThrow('API key required');
        });

        it('should handle registry lookup errors', () => {
            // Simulate missing adapter in registry
            adapterRegistry.delete('openai' as RegisteredProviders);
            expect(() => new ProviderManager('openai' as RegisteredProviders))
                .toThrow(new ProviderNotFoundError('openai').message);
        });
    });
}); 