import { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse, UrlSource, Base64Source, ImageInputOpts, ImageOutputOpts, FilePathSource } from './UniversalInterfaces';

export interface LLMProvider {
    // Basic chat methods
    chatCall(model: string, params: UniversalChatParams): Promise<UniversalChatResponse>;
    streamCall(model: string, params: UniversalChatParams): Promise<AsyncIterable<UniversalStreamResponse>>;

    // Conversion methods that each provider must implement
    convertToProviderParams(model: string, params: UniversalChatParams): unknown;
    convertFromProviderResponse(response: unknown): UniversalChatResponse;
    convertFromProviderStreamResponse(response: unknown): UniversalStreamResponse;
}

/**
 * Operations that can be performed with images
 */
export type ImageOp = 'generate' | 'edit' | 'edit-masked' | 'composite';

/**
 * Parameters for image generation/editing operations
 */
export type ImageCallParams = {
    prompt: string;
    files?: (UrlSource | Base64Source | FilePathSource)[];     // Accept multiple source types
    mask?: UrlSource | Base64Source | FilePathSource;
    options: ImageInputOpts & ImageOutputOpts;
    outputPath?: string;
};

/**
 * Interface for providers that support image generation/editing
 */
export interface LLMProviderImage {
    imageCall(model: string, op: ImageOp, params: ImageCallParams): Promise<UniversalChatResponse>;
}
