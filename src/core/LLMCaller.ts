import { ModelManager } from './models/ModelManager';
import { ChatController } from './chat/ChatController';
import { StreamingService } from './streaming/StreamingService';
import { ResponseProcessor } from './processors/ResponseProcessor';
import { UniversalMessage, UniversalChatResponse, UniversalStreamResponse, UniversalChatParams, JSONSchemaDefinition } from '../interfaces/UniversalInterfaces';
import { z } from 'zod';

export type CallOptions = {
    responseFormat?: 'json' | 'text';
    jsonSchema?: {
        name?: string;
        schema: JSONSchemaDefinition;
    };
    useNativeJsonMode?: boolean;
};

export type LLMCallerConfig = {
    model: string;
    modelManager: ModelManager;
    chatController: ChatController;
    streamingService: StreamingService;
    responseProcessor: ResponseProcessor;
};

export class LLMCaller {
    private readonly model: string;
    private readonly modelManager: ModelManager;
    private readonly chatController: ChatController;
    private readonly streamingService: StreamingService;
    private readonly responseProcessor: ResponseProcessor;

    constructor(config: LLMCallerConfig) {
        this.model = config.model;
        this.modelManager = config.modelManager;
        this.chatController = config.chatController;
        this.streamingService = config.streamingService;
        this.responseProcessor = config.responseProcessor;
    }

    /**
     * Makes a single call to the LLM and returns the response
     */
    public async call<T extends z.ZodType | undefined = undefined>(
        messages: UniversalMessage[],
        options: CallOptions = {}
    ): Promise<UniversalChatResponse<T extends z.ZodType ? z.infer<T> : unknown>> {
        // Get model info to check capabilities
        const modelInfo = await this.modelManager.getModel(this.model);
        if (!modelInfo) {
            throw new Error(`Model ${this.model} not found`);
        }

        // Determine if we should use native JSON mode
        const useNativeJsonMode = this.shouldUseNativeJsonMode(
            modelInfo.capabilities?.jsonMode ?? false,
            options
        );

        // Create chat params
        const chatParams: UniversalChatParams = {
            model: this.model,
            messages,
            jsonSchema: options.jsonSchema,
            responseFormat: useNativeJsonMode ? 'json' : (options.jsonSchema ? 'text' : options.responseFormat)
        };

        // Execute the chat request
        const response = await this.chatController.execute<T>(chatParams);

        // Validate and process the response
        return this.responseProcessor.validateResponse<T>(
            response,
            chatParams,
            modelInfo,
            { usePromptInjection: !useNativeJsonMode }
        );
    }

    /**
     * Creates a stream of responses from the LLM
     */
    public async stream(
        messages: UniversalMessage[],
        options: CallOptions = {}
    ): Promise<AsyncIterable<UniversalStreamResponse>> {
        // Get model info to check capabilities
        const modelInfo = await this.modelManager.getModel(this.model);
        if (!modelInfo) {
            throw new Error(`Model ${this.model} not found`);
        }

        // Determine if we should use native JSON mode
        const useNativeJsonMode = this.shouldUseNativeJsonMode(
            modelInfo.capabilities?.jsonMode ?? false,
            options
        );

        // Create chat params
        const chatParams: UniversalChatParams = {
            model: this.model,
            messages,
            jsonSchema: options.jsonSchema,
            responseFormat: useNativeJsonMode ? 'json' : (options.jsonSchema ? 'text' : options.responseFormat)
        };

        // Create and return the stream
        return this.streamingService.createStream(chatParams, this.model);
    }

    /**
     * Determines whether to use native JSON mode based on model capabilities and request options
     */
    private shouldUseNativeJsonMode(modelSupportsJsonMode: boolean, options: CallOptions): boolean {
        // Check if JSON output is requested (either through responseFormat or jsonSchema)
        const jsonRequested = options.responseFormat === 'json' || options.jsonSchema !== undefined;

        // Use native JSON mode only if both conditions are met:
        // 1. The model supports it
        // 2. JSON output is requested
        // 3. useNativeJsonMode is not explicitly set to false
        return modelSupportsJsonMode && jsonRequested && options.useNativeJsonMode !== false;
    }
} 