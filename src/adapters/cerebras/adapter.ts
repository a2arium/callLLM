import Cerebras from '@cerebras/cerebras_cloud_sdk';
import { BaseAdapter, type AdapterConfig } from '../base/baseAdapter.ts';
import type { LLMProvider } from '../../interfaces/LLMProvider.ts';
import type { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse } from '../../interfaces/UniversalInterfaces.ts';
import { logger } from '../../utils/logger.ts';
import { ModelManager } from '../../core/models/ModelManager.ts';
import type { RegisteredProviders } from '../index.ts';
import { TokenCalculator } from '../../core/models/TokenCalculator.ts';
import { RetryManager } from '../../core/retry/RetryManager.ts';
import { CerebrasConverter } from './converter.ts';
import { CerebrasStreamHandler } from './stream.ts';
import { mapCerebrasError, CerebrasAdapterError } from './errors.ts';

/**
 * Adapter for Cerebras Cloud SDK chat/completions
 */
export class CerebrasAdapter extends BaseAdapter implements LLMProvider {
    private client: Cerebras;
    private converter: CerebrasConverter;
    private streamHandler: CerebrasStreamHandler | undefined;
    private modelManager: ModelManager;
    private tokenCalculator: TokenCalculator;
    private retryManager: RetryManager;

    constructor(config: Partial<AdapterConfig> | string) {
        const configObj = typeof config === 'string' ? { apiKey: config } : config;

        const apiKey = configObj?.apiKey || process.env.CEREBRAS_API_KEY;
        if (!apiKey) {
            throw new CerebrasAdapterError('Cerebras API key is required. Please provide it in the config or set CEREBRAS_API_KEY environment variable.');
        }

        super({
            apiKey,
            baseUrl: configObj?.baseUrl,
            organization: configObj?.organization
        });

        // Initialize SDK client
        this.client = new Cerebras({
            apiKey: this.config.apiKey,
            // base URL is auto-configured by SDK; forward baseUrl if provided by user
            // If unsupported by SDK, it will be ignored harmlessly
            // @ts-ignore
            baseURL: this.config.baseUrl,
        } as Record<string, unknown> as any);

        this.modelManager = new ModelManager('cerebras' as RegisteredProviders);
        this.tokenCalculator = new TokenCalculator();
        this.retryManager = new RetryManager({ baseDelay: 1000, maxRetries: 3 });
        this.converter = new CerebrasConverter(this.modelManager);
        this.streamHandler = undefined;
    }

    async chatCall(model: string, params: UniversalChatParams): Promise<UniversalChatResponse> {
        const log = logger.createLogger({ prefix: 'CerebrasAdapter.chatCall' });
        log.debug('Validating and converting params:', params);

        // Convert to Cerebras params
        const cerebrasParams = await this.converter.convertToProviderParams(model, params);
        log.debug('Converted Cerebras params:', cerebrasParams);

        try {
            // Use chat.completions.create per SDK
            const response = await this.client.chat.completions.create(cerebrasParams as unknown as Parameters<typeof this.client.chat.completions.create>[0]);

            // Convert back to universal response
            const universalResponse = this.converter.convertFromProviderResponse(response);
            log.debug('Converted universal response:', universalResponse);
            return universalResponse;
        } catch (error: unknown) {
            const mapped = mapCerebrasError(error);
            logger.createLogger({ prefix: 'CerebrasAdapter.chatCall' }).error('API call failed:', mapped);
            throw mapped;
        }
    }

    async streamCall(model: string, params: UniversalChatParams): Promise<AsyncIterable<UniversalStreamResponse>> {
        const log = logger.createLogger({ prefix: 'CerebrasAdapter.streamCall' });
        log.debug('Validating and converting params for streaming:', params);

        // Convert to Cerebras params with stream flag true
        const cerebrasParams = await this.converter.convertToProviderParams(model, params, { stream: true });
        log.debug('Converted Cerebras streaming params:', cerebrasParams);

        try {
            // Create stream from SDK
            const stream = await this.client.chat.completions.create(
                cerebrasParams as unknown as Parameters<typeof this.client.chat.completions.create>[0]
            );

            // Initialize stream handler
            this.streamHandler = new CerebrasStreamHandler(this.tokenCalculator);
            return this.streamHandler.handleStream(stream as AsyncIterable<unknown>);
        } catch (error: unknown) {
            const mapped = mapCerebrasError(error);
            logger.createLogger({ prefix: 'CerebrasAdapter.streamCall' }).error('Streaming call failed:', mapped);
            throw mapped;
        }
    }

    async convertToProviderParams(model: string, params: UniversalChatParams): Promise<unknown> {
        return this.converter.convertToProviderParams(model, params);
    }

    convertFromProviderResponse(response: unknown): UniversalChatResponse {
        return this.converter.convertFromProviderResponse(response);
    }

    convertFromProviderStreamResponse(response: unknown): UniversalStreamResponse {
        // Minimal mapping – not used in main path since we handle via stream handler
        return this.streamHandler?.minimalConvert(response) || { content: '', role: 'assistant', isComplete: false };
    }
}

export default CerebrasAdapter;


