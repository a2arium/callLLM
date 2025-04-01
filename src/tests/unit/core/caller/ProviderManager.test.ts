import { ProviderManager } from '../../../../core/caller/ProviderManager';
import { OpenAIResponseAdapter } from '../../../../adapters/openai/adapter';
import { SupportedProviders } from '../../../../core/types';

// Mock OpenAIResponseAdapter
jest.mock('../../../../adapters/openai/adapter');

describe('ProviderManager', () => {
    const mockApiKey = 'test-api-key';

    beforeEach(() => {
        jest.clearAllMocks();
        (OpenAIResponseAdapter as jest.Mock).mockClear();
    });

    describe('constructor', () => {
        it('should initialize with OpenAI provider', () => {
            const manager = new ProviderManager('openai', mockApiKey);
            expect(OpenAIResponseAdapter).toHaveBeenCalledWith({ apiKey: mockApiKey });
            expect(manager.getCurrentProviderName()).toBe('openai');
        });

        it('should initialize without API key', () => {
            const manager = new ProviderManager('openai');
            expect(OpenAIResponseAdapter).toHaveBeenCalledWith({});
            expect(manager.getCurrentProviderName()).toBe('openai');
        });

        it('should throw error for unsupported provider', () => {
            expect(() => new ProviderManager('unsupported' as SupportedProviders))
                .toThrow('Provider unsupported is not supported yet');
        });
    });

    describe('getProvider', () => {
        it('should return the current provider', () => {
            const manager = new ProviderManager('openai', mockApiKey);
            const provider = manager.getProvider();
            expect(provider).toBeInstanceOf(OpenAIResponseAdapter);
        });
    });

    describe('switchProvider', () => {
        it('should switch to a new provider', () => {
            const manager = new ProviderManager('openai', mockApiKey);
            (OpenAIResponseAdapter as jest.Mock).mockClear();

            manager.switchProvider('openai', 'new-api-key');
            expect(OpenAIResponseAdapter).toHaveBeenCalledWith({ apiKey: 'new-api-key' });
            expect(manager.getCurrentProviderName()).toBe('openai');
        });

        it('should switch provider without API key', () => {
            const manager = new ProviderManager('openai', mockApiKey);
            (OpenAIResponseAdapter as jest.Mock).mockClear();

            manager.switchProvider('openai');
            expect(OpenAIResponseAdapter).toHaveBeenCalledWith({});
            expect(manager.getCurrentProviderName()).toBe('openai');
        });

        it('should throw error when switching to unsupported provider', () => {
            const manager = new ProviderManager('openai', mockApiKey);
            expect(() => manager.switchProvider('unsupported' as SupportedProviders))
                .toThrow('Provider unsupported is not supported yet');
        });
    });

    describe('getCurrentProviderName', () => {
        it('should return openai for OpenAI provider', () => {
            const manager = new ProviderManager('openai', mockApiKey);
            expect(manager.getCurrentProviderName()).toBe('openai');
        });

        it('should throw error for unknown provider type', () => {
            const manager = new ProviderManager('openai', mockApiKey);
            // Simulate an unknown provider type by replacing the provider
            (manager as any).provider = {};
            expect(() => manager.getCurrentProviderName()).toThrow('Unknown provider type');
        });
    });

    describe('error handling', () => {
        it('should handle OpenAIAdapter initialization errors', () => {
            (OpenAIResponseAdapter as jest.Mock).mockImplementationOnce(() => {
                throw new Error('API key required');
            });

            expect(() => new ProviderManager('openai'))
                .toThrow('API key required');
        });

        it('should handle provider switch errors', () => {
            const manager = new ProviderManager('openai', mockApiKey);
            (OpenAIResponseAdapter as jest.Mock).mockImplementationOnce(() => {
                throw new Error('Invalid API key');
            });

            expect(() => manager.switchProvider('openai', 'invalid-key'))
                .toThrow('Invalid API key');
        });
    });
}); 