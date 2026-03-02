import { OpenRouter } from '@openrouter/sdk';
import { BaseAdapter, type AdapterConfig } from '../base/baseAdapter.ts';
import type { LLMProvider } from '../../interfaces/LLMProvider.ts';
import type { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse } from '../../interfaces/UniversalInterfaces.ts';
import { logger } from '../../utils/logger.ts';
import { ModelManager } from '../../core/models/ModelManager.ts';
import type { RegisteredProviders } from '../index.ts';
import { TokenCalculator } from '../../core/models/TokenCalculator.ts';
import { RetryManager } from '../../core/retry/RetryManager.ts';
import { OpenRouterConverter } from './converter.ts';
import { OpenRouterStreamHandler } from './stream.ts';
import { mapOpenRouterError, OpenRouterAdapterError } from './errors.ts';

/**
 * Adapter for OpenRouter using the native @openrouter/sdk.
 * Provides access to 300+ LLM models through a unified API.
 */
export class OpenRouterAdapter extends BaseAdapter implements LLMProvider {
    private client: OpenRouter;
    private converter: OpenRouterConverter;
    private streamHandler: OpenRouterStreamHandler | undefined;
    private modelManager: ModelManager;
    private tokenCalculator: TokenCalculator;
    private retryManager: RetryManager;

    constructor(config: Partial<AdapterConfig> | string) {
        const configObj = typeof config === 'string' ? { apiKey: config } : config;

        const apiKey = configObj?.apiKey || process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            throw new OpenRouterAdapterError(
                'OpenRouter API key is required. Please provide it in the config or set OPENROUTER_API_KEY environment variable.'
            );
        }

        super({
            apiKey,
            baseUrl: configObj?.baseUrl,
            organization: configObj?.organization,
        });

        this.client = new OpenRouter({
            apiKey: this.config.apiKey,
        });

        this.modelManager = new ModelManager('openrouter' as RegisteredProviders);
        this.tokenCalculator = new TokenCalculator();
        this.retryManager = new RetryManager({ baseDelay: 1000, maxRetries: 3 });
        this.converter = new OpenRouterConverter(this.modelManager);
        this.streamHandler = undefined;
    }

    async chatCall(model: string, params: UniversalChatParams): Promise<UniversalChatResponse> {
        const log = logger.createLogger({ prefix: 'OpenRouterAdapter.chatCall' });
        const callModelInput = this.converter.convertToCallModelInput(model, params);

        try {
            const result = this.client.callModel(callModelInput);
            const response = await result.getResponse();
            return this.converter.convertFromProviderResponse(response);
        } catch (err) {
            const mapped = mapOpenRouterError(err);
            log.error('API call failed:', mapped);
            throw mapped;
        }
    }

    async streamCall(model: string, params: UniversalChatParams): Promise<AsyncIterable<UniversalStreamResponse>> {
        const log = logger.createLogger({ prefix: 'OpenRouterAdapter.streamCall' });
        log.debug('Validating and converting params for streaming:', params);

        const callModelInput = this.converter.convertToCallModelInput(model, params);
        log.debug('Converted OpenRouter callModel input:', callModelInput);

        try {
            const result = this.client.callModel(callModelInput);
            this.streamHandler = new OpenRouterStreamHandler(this.converter, this.tokenCalculator);
            return this.streamHandler.handleStream(result);
        } catch (error: unknown) {
            const mapped = mapOpenRouterError(error);
            log.error('Streaming call failed:', mapped);
            throw mapped;
        }
    }

    async convertToProviderParams(model: string, params: UniversalChatParams): Promise<unknown> {
        return this.converter.convertToCallModelInput(model, params);
    }

    convertFromProviderResponse(response: unknown): UniversalChatResponse {
        return this.converter.convertFromProviderResponse(response);
    }

    convertFromProviderStreamResponse(response: unknown): UniversalStreamResponse {
        return this.streamHandler?.minimalConvert(response) || { content: '', role: 'assistant', isComplete: false };
    }
}

export default OpenRouterAdapter;
