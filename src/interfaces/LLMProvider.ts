import { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse, UrlSource, Base64Source, ImageInputOpts, ImageOutputOpts, FilePathSource, ImageSource } from './UniversalInterfaces.js';
import { UsageCallback } from './UsageInterfaces.js';

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
 * 
 * @deprecated Use the ImageCallParams from UniversalInterfaces.ts instead
 */
export type ImageCallParams = {
    prompt: string;
    files?: ImageSource[];     // Accept multiple source types
    mask?: ImageSource;
    options?: {
        size?: '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
        quality?: 'standard' | 'hd';
        style?: 'vivid' | 'natural';
        background?: string;
        [key: string]: any;
    };
    outputPath?: string;
    // Add usage tracking parameters
    callerId?: string;
    usageCallback?: UsageCallback;
};

/**
 * Interface for providers that support image generation/editing
 */
export interface LLMProviderImage {
    imageCall(model: string, op: ImageOp, params: ImageCallParams): Promise<UniversalChatResponse>;
}
