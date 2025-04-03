import { ProviderManager } from '../../../../core/caller/ProviderManager';
import { OpenAIResponseAdapter } from '../../../../adapters/openai/adapter';
import { OpenAIAdapter } from '../../../../adapters/openai-completion/adapter';
import { adapterRegistry } from '../../../../adapters/index';
import { ProviderNotFoundError } from '../../../../adapters/types';
import type { AdapterConstructor } from '../../../../adapters/types';
import type { RegisteredProviders } from '../../../../adapters/index';

// Mock the adapter registry
jest.mock('../../../../adapters/index', () => {
    const mockMap = new Map<string, AdapterConstructor>();
    return {
        adapterRegistry: mockMap,
        RegisteredProviders: ['openai', 'openai-completion'],
        __esModule: true
    };
});

// Mock OpenAIResponseAdapter
jest.mock('../../../../adapters/openai/adapter');
jest.mock('../../../../adapters/openai-completion/adapter');

describe('ProviderManager', () => {
    const mockApiKey = 'test-api-key';

    beforeEach(() => {
        jest.clearAllMocks();
        (OpenAIResponseAdapter as jest.Mock).mockClear();
        (OpenAIAdapter as jest.Mock).mockClear();

        // Reset registry mocks
        adapterRegistry.clear();
        adapterRegistry.set('openai' as RegisteredProviders, OpenAIResponseAdapter as unknown as AdapterConstructor);
        adapterRegistry.set('openai-completion' as RegisteredProviders, OpenAIAdapter as unknown as AdapterConstructor);
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
        it('should switch to a new provider', () => {
            const manager = new ProviderManager('openai' as RegisteredProviders, mockApiKey);
            (OpenAIResponseAdapter as jest.Mock).mockClear();

            manager.switchProvider('openai-completion' as RegisteredProviders, 'new-api-key');
            expect(OpenAIAdapter).toHaveBeenCalledWith({ apiKey: 'new-api-key' });
            expect(manager.getCurrentProviderName()).toBe('openai-completion');
        });

        it('should switch provider without API key', () => {
            const manager = new ProviderManager('openai' as RegisteredProviders, mockApiKey);
            (OpenAIResponseAdapter as jest.Mock).mockClear();

            manager.switchProvider('openai-completion' as RegisteredProviders);
            expect(OpenAIAdapter).toHaveBeenCalledWith({});
            expect(manager.getCurrentProviderName()).toBe('openai-completion');
        });

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

            manager.switchProvider('openai-completion' as RegisteredProviders);
            expect(manager.getCurrentProviderName()).toBe('openai-completion');
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

        it('should handle provider switch errors', () => {
            const manager = new ProviderManager('openai' as RegisteredProviders, mockApiKey);
            (OpenAIAdapter as jest.Mock).mockImplementationOnce(() => {
                throw new Error('Invalid API key');
            });

            expect(() => manager.switchProvider('openai-completion' as RegisteredProviders, 'invalid-key'))
                .toThrow('Invalid API key');
        });

        it('should handle registry lookup errors', () => {
            // Simulate missing adapter in registry
            adapterRegistry.delete('openai' as RegisteredProviders);
            expect(() => new ProviderManager('openai' as RegisteredProviders))
                .toThrow(new ProviderNotFoundError('openai').message);
        });
    });
}); 