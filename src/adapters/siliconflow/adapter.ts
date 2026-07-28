import OpenAI from 'openai';
import type {
    ChatCompletionCreateParamsNonStreaming,
    ChatCompletionCreateParamsStreaming
} from 'openai/resources/chat/completions';
import { BaseAdapter, type AdapterConfig } from '../base/baseAdapter.ts';
import type { LLMProvider } from '../../interfaces/LLMProvider.ts';
import type {
    UniversalChatParams,
    UniversalChatResponse,
    UniversalStreamResponse,
    RerankParams,
    RerankResponse
} from '../../interfaces/UniversalInterfaces.ts';
import type { LLMExecutionControl } from '../../interfaces/ExecutionInterfaces.ts';
import { resolveLLMCancellationError } from '../../core/execution/errors.ts';
import { ModelManager } from '../../core/models/ModelManager.ts';
import { TokenCalculator } from '../../core/models/TokenCalculator.ts';
import type { RegisteredProviders } from '../index.ts';
import { logger } from '../../utils/logger.ts';
import { SiliconFlowConverter } from './converter.ts';
import { SiliconFlowStreamHandler } from './stream.ts';
import {
    mapSiliconFlowError,
    SiliconFlowAdapterError
} from './errors.ts';
import type {
    SiliconFlowChatCompletion,
    SiliconFlowCreateParams
} from './types.ts';

const DEFAULT_BASE_URL = 'https://api.siliconflow.com/v1';

export class SiliconFlowAdapter extends BaseAdapter implements LLMProvider {
    private readonly client: OpenAI;
    private readonly converter: SiliconFlowConverter;
    private readonly modelManager: ModelManager;
    private readonly tokenCalculator: TokenCalculator;
    private streamHandler?: SiliconFlowStreamHandler;

    constructor(config: Partial<AdapterConfig> | string = {}) {
        const configObject = typeof config === 'string' ? { apiKey: config } : config;
        const apiKey = configObject.apiKey || process.env.SILICONFLOW_API_KEY;
        if (!apiKey) {
            throw new SiliconFlowAdapterError(
                'SiliconFlow API key is required. Provide it in config or set SILICONFLOW_API_KEY.'
            );
        }

        super({
            apiKey,
            baseUrl: configObject.baseUrl || DEFAULT_BASE_URL,
            organization: configObject.organization
        });

        this.client = new OpenAI({
            apiKey: this.config.apiKey,
            baseURL: this.config.baseUrl
        });
        this.modelManager = new ModelManager('siliconflow' as RegisteredProviders);
        this.tokenCalculator = new TokenCalculator();
        this.converter = new SiliconFlowConverter(this.modelManager);
    }

    async chatCall(
        model: string,
        params: UniversalChatParams,
        control?: LLMExecutionControl
    ): Promise<UniversalChatResponse> {
        const log = logger.createLogger({ prefix: 'SiliconFlowAdapter.chatCall' });
        const providerParams = await this.converter.convertToProviderParams(model, params);
        providerParams.stream = false;
        log.debug('Calling SiliconFlow chat completions:', providerParams);

        try {
            const request = providerParams as unknown as ChatCompletionCreateParamsNonStreaming;
            const response = control?.signal
                ? await this.client.chat.completions.create(request, { signal: control.signal })
                : await this.client.chat.completions.create(request);
            return this.converter.convertFromProviderResponse(
                response as unknown as SiliconFlowChatCompletion
            );
        } catch (error: unknown) {
            const cancellation = resolveLLMCancellationError(error, control?.signal);
            if (cancellation) throw cancellation;
            const mapped = mapSiliconFlowError(error);
            log.error('API call failed:', mapped);
            throw mapped;
        }
    }

    async streamCall(
        model: string,
        params: UniversalChatParams,
        control?: LLMExecutionControl
    ): Promise<AsyncIterable<UniversalStreamResponse>> {
        const log = logger.createLogger({ prefix: 'SiliconFlowAdapter.streamCall' });
        const providerParams = await this.converter.convertToProviderParams(
            model,
            params,
            { stream: true }
        );
        log.debug('Calling SiliconFlow streaming chat completions:', providerParams);

        try {
            const request = providerParams as unknown as ChatCompletionCreateParamsStreaming;
            const stream = control?.signal
                ? await this.client.chat.completions.create(request, { signal: control.signal })
                : await this.client.chat.completions.create(request);
            this.streamHandler = new SiliconFlowStreamHandler(
                this.converter,
                this.tokenCalculator,
                model
            );
            return this.streamHandler.handleStream(stream as unknown as AsyncIterable<unknown>);
        } catch (error: unknown) {
            const cancellation = resolveLLMCancellationError(error, control?.signal);
            if (cancellation) throw cancellation;
            const mapped = mapSiliconFlowError(error);
            log.error('Streaming API call failed:', mapped);
            throw mapped;
        }
    }

    async rerankCall(
        model: string,
        params: RerankParams,
        control?: LLMExecutionControl
    ): Promise<RerankResponse> {
        const log = logger.createLogger({ prefix: 'SiliconFlowAdapter.rerankCall' });
        const request = this.converter.convertToProviderRerankParams(model, params);
        try {
            const response = await fetch(`${this.config.baseUrl}/rerank`, {
                method: 'POST',
                headers: {
                    authorization: `Bearer ${this.config.apiKey}`,
                    'content-type': 'application/json'
                },
                body: JSON.stringify(request),
                signal: control?.signal
            });
            const payload: unknown = await response.json().catch(() => undefined);
            if (!response.ok) {
                const record = payload !== null && typeof payload === 'object'
                    ? payload as Record<string, unknown>
                    : undefined;
                const message = typeof record?.message === 'string'
                    ? record.message
                    : typeof payload === 'string' ? payload : `HTTP ${response.status}`;
                throw Object.assign(new Error(message), {
                    status: response.status,
                    headers: {
                        'retry-after': response.headers.get('retry-after') ?? undefined
                    }
                });
            }
            return this.converter.convertFromProviderRerankResponse(
                payload,
                model
            );
        } catch (error: unknown) {
            const cancellation = resolveLLMCancellationError(error, control?.signal);
            if (cancellation) throw cancellation;
            const mapped = mapSiliconFlowError(error);
            log.error('Rerank API call failed:', mapped);
            throw mapped;
        }
    }

    async convertToProviderParams(
        model: string,
        params: UniversalChatParams
    ): Promise<SiliconFlowCreateParams> {
        return this.converter.convertToProviderParams(model, params);
    }

    convertFromProviderResponse(response: unknown): UniversalChatResponse {
        return this.converter.convertFromProviderResponse(response);
    }

    convertFromProviderStreamResponse(response: unknown): UniversalStreamResponse {
        return this.streamHandler?.minimalConvert(response) ?? {
            content: '',
            role: 'assistant',
            isComplete: false
        };
    }
}

export default SiliconFlowAdapter;
