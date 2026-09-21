import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import type {
    ChatCompletionCreateParamsNonStreaming,
    ChatCompletionCreateParamsStreaming
} from 'openai/resources/chat/completions';
import { BaseAdapter, type AdapterConfig } from '../base/baseAdapter.ts';
import type {
    ImageOp,
    LLMProvider,
    LLMProviderEmbedding,
    LLMProviderEvaluate,
    LLMProviderImage,
    LLMProviderRerank
} from '../../interfaces/LLMProvider.ts';
import type {
    UniversalChatParams,
    UniversalChatResponse,
    UniversalStreamResponse,
    EmbeddingParams,
    EmbeddingResponse,
    ImageCallParams,
    ImageSource,
    RerankParams,
    RerankResponse,
    EvaluateParams,
    EvaluateResponse
} from '../../interfaces/UniversalInterfaces.ts';
import type { LLMExecutionControl } from '../../interfaces/ExecutionInterfaces.ts';
import { resolveLLMCancellationError } from '../../core/execution/errors.ts';
import { ModelManager } from '../../core/models/ModelManager.ts';
import { TokenCalculator } from '../../core/models/TokenCalculator.ts';
import { saveBase64ToFile } from '../../core/file-data/fileData.ts';
import type { RegisteredProviders } from '../index.ts';
import { logger } from '../../utils/logger.ts';
import { VercelConverter } from './converter.ts';
import { VercelStreamHandler } from './stream.ts';
import {
    mapVercelError,
    VercelAdapterError,
    VercelValidationError
} from './errors.ts';
import type {
    VercelChatCompletion,
    VercelCreateParams
} from './types.ts';

const DEFAULT_BASE_URL = 'https://ai-gateway.vercel.sh/v1';
const DEFAULT_RERANK_URL = 'https://ai-gateway.vercel.sh/v2/rerank';
const DEFAULT_EVALUATE_URL = 'https://ai-gateway.vercel.sh/v1/evaluate';

export class VercelAdapter extends BaseAdapter
    implements LLMProvider, LLMProviderEmbedding, LLMProviderImage, LLMProviderRerank, LLMProviderEvaluate {
    private readonly client: OpenAI;
    private readonly converter: VercelConverter;
    private readonly modelManager: ModelManager;
    private readonly tokenCalculator: TokenCalculator;
    private streamHandler?: VercelStreamHandler;

    constructor(config: Partial<AdapterConfig> | string = {}) {
        const configObject = typeof config === 'string' ? { apiKey: config } : config;
        const apiKey = configObject.apiKey
            || process.env.AI_GATEWAY_API_KEY
            || process.env.VERCEL_OIDC_TOKEN;
        if (!apiKey) {
            throw new VercelAdapterError(
                'Vercel AI Gateway API key is required. Provide it in config or set AI_GATEWAY_API_KEY (or VERCEL_OIDC_TOKEN).'
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
        this.modelManager = new ModelManager('vercel' as RegisteredProviders);
        this.tokenCalculator = new TokenCalculator();
        this.converter = new VercelConverter(this.modelManager);
    }

    async chatCall(
        model: string,
        params: UniversalChatParams,
        control?: LLMExecutionControl
    ): Promise<UniversalChatResponse> {
        const log = logger.createLogger({ prefix: 'VercelAdapter.chatCall' });
        const providerParams = await this.converter.convertToProviderParams(model, params);
        providerParams.stream = false;
        log.debug('Calling Vercel AI Gateway chat completions:', providerParams);

        try {
            const request = providerParams as unknown as ChatCompletionCreateParamsNonStreaming;
            const response = control?.signal
                ? await this.client.chat.completions.create(request, { signal: control.signal })
                : await this.client.chat.completions.create(request);
            return this.converter.convertFromProviderResponse(
                response as unknown as VercelChatCompletion
            );
        } catch (error: unknown) {
            const cancellation = resolveLLMCancellationError(error, control?.signal);
            if (cancellation) throw cancellation;
            const mapped = mapVercelError(error);
            log.error('API call failed:', mapped);
            throw mapped;
        }
    }

    async streamCall(
        model: string,
        params: UniversalChatParams,
        control?: LLMExecutionControl
    ): Promise<AsyncIterable<UniversalStreamResponse>> {
        const log = logger.createLogger({ prefix: 'VercelAdapter.streamCall' });
        const providerParams = await this.converter.convertToProviderParams(
            model,
            params,
            { stream: true }
        );
        log.debug('Calling Vercel AI Gateway streaming chat completions:', providerParams);

        try {
            const request = providerParams as unknown as ChatCompletionCreateParamsStreaming;
            const stream = control?.signal
                ? await this.client.chat.completions.create(request, { signal: control.signal })
                : await this.client.chat.completions.create(request);
            this.streamHandler = new VercelStreamHandler(
                this.converter,
                this.tokenCalculator,
                model
            );
            return this.streamHandler.handleStream(stream as unknown as AsyncIterable<unknown>);
        } catch (error: unknown) {
            const cancellation = resolveLLMCancellationError(error, control?.signal);
            if (cancellation) throw cancellation;
            const mapped = mapVercelError(error);
            log.error('Streaming API call failed:', mapped);
            throw mapped;
        }
    }

    async embeddingCall(
        model: string,
        params: EmbeddingParams,
        control?: LLMExecutionControl
    ): Promise<EmbeddingResponse> {
        const log = logger.createLogger({ prefix: 'VercelAdapter.embeddingCall' });
        try {
            const response = control?.signal
                ? await this.client.embeddings.create({
                    model,
                    input: params.input,
                    dimensions: params.dimensions,
                    encoding_format: params.encodingFormat,
                    user: params.user
                }, { signal: control.signal })
                : await this.client.embeddings.create({
                    model,
                    input: params.input,
                    dimensions: params.dimensions,
                    encoding_format: params.encodingFormat,
                    user: params.user
                });

            const modelInfo = this.modelManager.getModel(model);
            const inputTokens = response.usage.prompt_tokens;
            const inputCost = modelInfo
                ? inputTokens * modelInfo.inputPricePerMillion / 1_000_000
                : 0;

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
                            total: inputTokens,
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
                            total: inputCost,
                            cached: 0
                        },
                        output: {
                            total: 0,
                            reasoning: 0
                        },
                        total: inputCost,
                        unit: 'USD'
                    }
                }
            };
        } catch (error: unknown) {
            const cancellation = resolveLLMCancellationError(error, control?.signal);
            if (cancellation) throw cancellation;
            const mapped = mapVercelError(error);
            log.error('Embedding call failed:', mapped);
            throw mapped;
        }
    }

    async imageCall(
        model: string,
        op: ImageOp,
        params: ImageCallParams,
        control?: LLMExecutionControl
    ): Promise<UniversalChatResponse> {
        const log = logger.createLogger({ prefix: 'VercelAdapter.imageCall' });
        try {
            switch (op) {
                case 'generate':
                    return await this.generateImage(model, params, control?.signal);
                case 'edit':
                    return await this.editImage(model, params, control?.signal, false);
                case 'edit-masked':
                    return await this.editImage(model, params, control?.signal, true);
                case 'composite':
                    throw new VercelValidationError(
                        'Vercel AI Gateway adapter does not support composite image operations'
                    );
                default:
                    throw new VercelValidationError(`Unsupported image operation: ${op}`);
            }
        } catch (error: unknown) {
            const cancellation = resolveLLMCancellationError(error, control?.signal);
            if (cancellation) throw cancellation;
            if (error instanceof VercelAdapterError) throw error;
            const mapped = mapVercelError(error);
            log.error('Image call failed:', mapped);
            throw mapped;
        }
    }

    async rerankCall(
        model: string,
        params: RerankParams,
        control?: LLMExecutionControl
    ): Promise<RerankResponse> {
        const log = logger.createLogger({ prefix: 'VercelAdapter.rerankCall' });
        const request = this.converter.convertToProviderRerankParams(model, params);
        try {
            const response = await fetch(this.resolveRerankUrl(), {
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
                const nested = record?.error !== null && typeof record?.error === 'object'
                    ? record.error as Record<string, unknown>
                    : undefined;
                const message = typeof nested?.message === 'string'
                    ? nested.message
                    : typeof record?.message === 'string'
                        ? record.message
                        : typeof payload === 'string' ? payload : `HTTP ${response.status}`;
                throw Object.assign(new Error(message), {
                    status: response.status,
                    headers: {
                        'retry-after': response.headers.get('retry-after') ?? undefined
                    }
                });
            }
            return this.converter.convertFromProviderRerankResponse(payload, model);
        } catch (error: unknown) {
            const cancellation = resolveLLMCancellationError(error, control?.signal);
            if (cancellation) throw cancellation;
            const mapped = mapVercelError(error);
            log.error('Rerank API call failed:', mapped);
            throw mapped;
        }
    }

    async evaluateCall(
        model: string,
        params: EvaluateParams,
        control?: LLMExecutionControl
    ): Promise<EvaluateResponse> {
        const log = logger.createLogger({ prefix: 'VercelAdapter.evaluateCall' });
        const request = this.converter.convertToProviderEvaluateParams(model, params);
        try {
            const response = await fetch(this.resolveEvaluateUrl(), {
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
                const nested = record?.error !== null && typeof record?.error === 'object'
                    ? record.error as Record<string, unknown>
                    : undefined;
                const message = typeof nested?.message === 'string'
                    ? nested.message
                    : typeof record?.message === 'string'
                        ? record.message
                        : typeof payload === 'string' ? payload : `HTTP ${response.status}`;
                throw Object.assign(new Error(message), {
                    status: response.status,
                    headers: {
                        'retry-after': response.headers.get('retry-after') ?? undefined
                    }
                });
            }
            return this.converter.convertFromProviderEvaluateResponse(
                payload,
                model,
                params.questions
            );
        } catch (error: unknown) {
            const cancellation = resolveLLMCancellationError(error, control?.signal);
            if (cancellation) throw cancellation;
            const mapped = mapVercelError(error);
            log.error('Evaluate API call failed:', mapped);
            throw mapped;
        }
    }

    async convertToProviderParams(
        model: string,
        params: UniversalChatParams
    ): Promise<VercelCreateParams> {
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

    private resolveRerankUrl(): string {
        const base = this.config.baseUrl || DEFAULT_BASE_URL;
        if (base.includes('ai-gateway.vercel.sh')) {
            return DEFAULT_RERANK_URL;
        }
        return `${base.replace(/\/v1\/?$/, '')}/v2/rerank`;
    }

    private resolveEvaluateUrl(): string {
        const base = this.config.baseUrl || DEFAULT_BASE_URL;
        if (base.includes('ai-gateway.vercel.sh')) {
            return DEFAULT_EVALUATE_URL;
        }
        return `${base.replace(/\/v1\/?$/, '')}/v1/evaluate`;
    }

    private async generateImage(
        model: string,
        params: ImageCallParams,
        signal?: AbortSignal
    ): Promise<UniversalChatResponse> {
        const size = params.size || params.options?.size || '1024x1024';
        const request = {
            model,
            prompt: params.prompt || '',
            n: params.n || 1,
            size,
            ...(params.quality || params.options?.quality
                ? { quality: params.quality || params.options?.quality }
                : {}),
            response_format: (params.response_format || 'b64_json') as 'b64_json' | 'url'
        };

        const response = signal
            ? await this.client.images.generate(request, { signal })
            : await this.client.images.generate(request);

        return this.mapImageResponse(model, params, response, 'generate', size);
    }

    private async editImage(
        model: string,
        params: ImageCallParams,
        signal: AbortSignal | undefined,
        withMask: boolean
    ): Promise<UniversalChatResponse> {
        if (!params.files?.length) {
            throw new VercelValidationError('Image edit requires at least one input file');
        }
        if (withMask && !params.mask) {
            throw new VercelValidationError('Masked image edit requires a mask');
        }

        const size = params.size || params.options?.size || '1024x1024';
        const request: Record<string, unknown> = {
            model,
            prompt: params.prompt || '',
            image: await this.toUploadable(params.files[0]),
            n: params.n || 1,
            size,
            response_format: (params.response_format || 'b64_json') as 'b64_json' | 'url'
        };
        if (withMask && params.mask) {
            request.mask = await this.toUploadable(params.mask);
        }

        const response = signal
            ? await this.client.images.edit(request as Parameters<OpenAI['images']['edit']>[0], { signal })
            : await this.client.images.edit(request as Parameters<OpenAI['images']['edit']>[0]);

        return this.mapImageResponse(
            model,
            params,
            response,
            withMask ? 'edit-masked' : 'edit',
            size
        );
    }

    private async mapImageResponse(
        model: string,
        params: ImageCallParams,
        response: { data?: Array<{ b64_json?: string | null; url?: string | null }> },
        operation: 'generate' | 'edit' | 'edit-masked',
        size: string
    ): Promise<UniversalChatResponse> {
        const first = response.data?.[0];
        if (!first) {
            throw new VercelAdapterError('No image data received from Vercel AI Gateway');
        }

        let imageData = '';
        let dataSource: 'base64' | 'url' = 'base64';
        if (typeof first.b64_json === 'string' && first.b64_json) {
            imageData = first.b64_json;
            dataSource = 'base64';
        } else if (typeof first.url === 'string' && first.url) {
            imageData = first.url;
            dataSource = 'url';
        } else {
            throw new VercelAdapterError('No image data or URL received from Vercel AI Gateway');
        }

        let imageSavedPath: string | undefined;
        if (params.outputPath) {
            if (dataSource === 'base64') {
                imageSavedPath = await saveBase64ToFile(imageData, params.outputPath, 'image/png');
            } else {
                const downloaded = await fetch(imageData);
                if (!downloaded.ok) {
                    throw new VercelAdapterError(
                        `Failed to download generated image: HTTP ${downloaded.status}`
                    );
                }
                const buffer = Buffer.from(await downloaded.arrayBuffer());
                await fs.promises.mkdir(path.dirname(params.outputPath), { recursive: true });
                await fs.promises.writeFile(params.outputPath, buffer);
                imageSavedPath = params.outputPath;
            }
        }

        const dims = this.converter.parseSize(size);
        const modelInfo = this.modelManager.getModel(model);
        const imageCost = modelInfo?.imagePricePerImage ?? 0;

        return {
            content: '',
            role: 'assistant',
            image: {
                data: dataSource === 'base64' ? imageData : '',
                dataSource,
                mime: 'image/png',
                width: dims.width,
                height: dims.height,
                operation
            },
            metadata: {
                model,
                provider: 'vercel',
                imageUrl: dataSource === 'url' ? imageData : undefined,
                imageSavedPath,
                usage: {
                    tokens: {
                        input: { total: 0, cached: 0 },
                        output: { total: 0, reasoning: 0, image: 1 },
                        total: 0
                    },
                    costs: {
                        input: { total: 0, cached: 0 },
                        output: { total: imageCost, reasoning: 0, image: imageCost },
                        total: imageCost,
                        unit: 'USD'
                    }
                }
            }
        };
    }

    private async toUploadable(source: ImageSource): Promise<Awaited<ReturnType<typeof toFile>>> {
        if (source.type === 'url') {
            const response = await fetch(source.url);
            if (!response.ok) {
                throw new VercelAdapterError(`Failed to download image URL: HTTP ${response.status}`);
            }
            const buffer = Buffer.from(await response.arrayBuffer());
            return toFile(buffer, 'image.png', { type: 'image/png' });
        }
        if (source.type === 'base64') {
            return toFile(
                Buffer.from(source.data, 'base64'),
                'image.png',
                { type: source.mime || 'image/png' }
            );
        }
        if (source.type === 'file_path') {
            const fileData = await fs.promises.readFile(source.path);
            const mimeType = source.path.toLowerCase().endsWith('.png')
                ? 'image/png'
                : source.path.toLowerCase().endsWith('.jpeg') || source.path.toLowerCase().endsWith('.jpg')
                    ? 'image/jpeg'
                    : 'application/octet-stream';
            return toFile(fileData, path.basename(source.path), { type: mimeType });
        }
        throw new VercelValidationError('Unsupported image source type');
    }
}

export default VercelAdapter;
