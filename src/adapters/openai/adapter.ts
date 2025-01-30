import { OpenAI } from 'openai';
import { BaseAdapter, AdapterConfig } from '../base/baseAdapter';
import { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse, ModelInfo } from '../../interfaces/UniversalInterfaces';
import { LLMProvider } from '../../interfaces/LLMProvider';
import { Converter } from './converter';
import { StreamHandler } from './stream';
import { Validator } from './validator';
import { OpenAIResponse, OpenAIStreamResponse, OpenAIModelParams } from './types';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { defaultModels } from './models';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export class OpenAIAdapter extends BaseAdapter implements LLMProvider {
    private client: OpenAI;
    private converter: Converter;
    private streamHandler: StreamHandler;
    private validator: Validator;
    private models: Map<string, ModelInfo>;

    constructor(config?: Partial<AdapterConfig>) {
        const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OpenAI API key is required. Please provide it in the config or set OPENAI_API_KEY environment variable.');
        }

        super({
            apiKey,
            organization: config?.organization || process.env.OPENAI_ORGANIZATION,
            baseUrl: config?.baseUrl || process.env.OPENAI_API_BASE
        });

        this.client = new OpenAI({
            apiKey: this.config.apiKey,
            organization: this.config.organization,
            baseURL: this.config.baseUrl,
        });
        this.converter = new Converter();
        this.streamHandler = new StreamHandler(this.converter);
        this.validator = new Validator();
        this.models = new Map(defaultModels.map(model => [model.name, model]));
    }

    async chatCall(model: string, params: UniversalChatParams): Promise<UniversalChatResponse> {
        this.validator.validateParams(params);
        const modelInfo = this.models.get(model);
        if (modelInfo) {
            this.converter.setModel(modelInfo);
        }
        this.converter.setParams(params);
        const openAIParams = this.convertToProviderParams(model, params) as OpenAIModelParams;
        const response = await this.client.chat.completions.create(openAIParams);
        return this.convertFromProviderResponse(response);
    }

    async streamCall(model: string, params: UniversalChatParams): Promise<AsyncIterable<UniversalStreamResponse>> {
        this.validator.validateParams(params);
        const modelInfo = this.models.get(model);
        if (modelInfo) {
            this.converter.setModel(modelInfo);
        }
        this.converter.setParams(params);
        const openAIParams = this.convertToProviderParams(model, params) as OpenAIModelParams;
        const stream = await this.client.chat.completions.create({ ...openAIParams, stream: true });
        return this.streamHandler.handleStream(stream as AsyncIterable<OpenAIStreamResponse>, params);
    }

    convertToProviderParams(model: string, params: UniversalChatParams): OpenAIModelParams {
        const openAIParams = this.converter.convertToProviderParams(params);
        return { ...openAIParams, model } as OpenAIModelParams;
    }

    convertFromProviderResponse(response: unknown): UniversalChatResponse {
        return this.converter.convertFromProviderResponse(response as OpenAIResponse);
    }

    convertFromProviderStreamResponse(chunk: unknown): UniversalStreamResponse {
        return this.converter.convertStreamResponse(chunk as OpenAIStreamResponse, this.converter.getCurrentParams());
    }
} 