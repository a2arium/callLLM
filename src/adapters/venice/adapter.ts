import OpenAI from 'openai';
import { BaseAdapter, type AdapterConfig } from '../base/baseAdapter.ts';
import type { LLMProvider, LLMProviderEmbedding } from '../../interfaces/LLMProvider.ts';
import type { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse, EmbeddingParams, EmbeddingResponse } from '../../interfaces/UniversalInterfaces.ts';
import { logger } from '../../utils/logger.ts';
import { ModelManager } from '../../core/models/ModelManager.ts';
import type { RegisteredProviders } from '../index.ts';
import { TokenCalculator } from '../../core/models/TokenCalculator.ts';
import { RetryManager } from '../../core/retry/RetryManager.ts';
import { VeniceConverter } from './converter.ts';
import { VeniceStreamHandler } from './stream.ts';
import { mapVeniceError, VeniceAdapterError } from './errors.ts';

/**
 * Adapter for Venice.ai using standard OpenAI Chat Completions API
 */
export class VeniceAdapter extends BaseAdapter implements LLMProvider, LLMProviderEmbedding {
    private client: OpenAI;
    private converter: VeniceConverter;
    private streamHandler: VeniceStreamHandler | undefined;
    private modelManager: ModelManager;
    private tokenCalculator: TokenCalculator;
    private retryManager: RetryManager;

    constructor(config: Partial<AdapterConfig> | string) {
        const configObj = typeof config === 'string' ? { apiKey: config } : config;

        const apiKey = configObj?.apiKey || process.env.VENICE_API_KEY;
        if (!apiKey) {
            throw new VeniceAdapterError('Venice API key is required. Please provide it in the config or set VENICE_API_KEY environment variable.');
        }

        super({
            apiKey,
            baseUrl: configObj?.baseUrl || 'https://api.venice.ai/api/v1',
            organization: configObj?.organization
        });

        // Initialize OpenAI SDK client with Venice base URL
        this.client = new OpenAI({
            apiKey: this.config.apiKey,
            baseURL: this.config.baseUrl,
        });

        this.modelManager = new ModelManager('venice' as RegisteredProviders);
        this.tokenCalculator = new TokenCalculator();
        this.retryManager = new RetryManager({ baseDelay: 1000, maxRetries: 3 });
        this.converter = new VeniceConverter(this.modelManager);
        this.streamHandler = undefined;
    }

    async chatCall(model: string, params: UniversalChatParams): Promise<UniversalChatResponse> {
        const providerParams = await (this.converter as VeniceConverter).convertToProviderParams(model, params);
        try {
            const response = await this.client.chat.completions.create(providerParams as any);
            return (this.converter as VeniceConverter).convertFromProviderResponse(response);
        } catch (err) {
            const mapped = mapVeniceError(err);
            logger.error('API call failed:', mapped);
            throw mapped;
        }
    }

    async streamCall(model: string, params: UniversalChatParams): Promise<AsyncIterable<UniversalStreamResponse>> {
        const log = logger.createLogger({ prefix: 'VeniceAdapter.streamCall' });
        log.debug('Validating and converting params for streaming:', params);

        const veniceParams = await this.converter.convertToProviderParams(model, params, { stream: true });
        log.debug('Converted Venice streaming params:', veniceParams);

        try {
            const stream = await this.client.chat.completions.create(veniceParams as any);
            this.streamHandler = new VeniceStreamHandler(this.tokenCalculator);
            return this.streamHandler.handleStream(stream as any);
        } catch (error: unknown) {
            const mapped = mapVeniceError(error);
            log.error('Streaming call failed:', mapped);
            throw mapped;
        }
    }

    async embeddingCall(model: string, params: EmbeddingParams): Promise<EmbeddingResponse> {
        try {
            const response = await this.client.embeddings.create({
                model,
                input: params.input,
                dimensions: params.dimensions,
                encoding_format: params.encodingFormat,
                user: params.user,
            });

            return {
                embeddings: response.data.map(d => ({
                    index: d.index,
                    embedding: d.embedding,
                    object: 'embedding'
                })),
                model: response.model,
                usage: {
                    tokens: {
                        input: {
                            total: response.usage.prompt_tokens,
                            cached: 0
                        },
                        output: {
                            total: 0,
                            reasoning: 0
                        },
                        total: response.usage.total_tokens
                    },
                    costs: {
                        input: {
                            total: 0,
                            cached: 0
                        },
                        output: {
                            total: 0,
                            reasoning: 0
                        },
                        total: 0
                    }
                }
            };
        } catch (err) {
            const mapped = mapVeniceError(err);
            logger.error('Embedding call failed:', mapped);
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
        return this.streamHandler?.minimalConvert(response) || { content: '', role: 'assistant', isComplete: false };
    }
}

export default VeniceAdapter;
