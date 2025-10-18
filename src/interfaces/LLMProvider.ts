import type { UniversalChatParams, UniversalChatResponse, UniversalStreamResponse, UrlSource, Base64Source, ImageInputOpts, ImageOutputOpts, FilePathSource, ImageSource, EmbeddingParams, EmbeddingResponse, VideoOutputOpts } from './UniversalInterfaces.ts';
import type { UsageCallback } from './UsageInterfaces.ts';

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

// Parameters for video operations
export type VideoCallParams = {
    prompt: string;
    /** Optional image file path, URL, or base64 data to seed the video */
    image?: string;
    size?: '1280x720' | '720x1280';
    seconds?: number;
    wait?: 'none' | 'poll';
    variant?: 'video' | 'thumbnail' | 'spritesheet';
    outputPath?: string;
};

/**
 * Interface for providers that support video generation (e.g., OpenAI Sora)
 */
export interface LLMProviderVideo {
    /** Create a video job (optionally poll until complete based on params.wait) */
    videoCall(model: string, params: VideoCallParams): Promise<UniversalChatResponse>;
    /** Retrieve video job status */
    retrieveVideo(videoId: string): Promise<{ id: string; status: 'queued' | 'in_progress' | 'completed' | 'failed'; progress?: number; model?: string; seconds?: number; size?: string }>;
    /** Download video content (or thumbnail/spritesheet) */
    downloadVideo(videoId: string, variant?: 'video' | 'thumbnail' | 'spritesheet'): Promise<ArrayBuffer>;
}

/**
 * Interface for providers that support embedding generation
 */
export interface LLMProviderEmbedding {
    embeddingCall(model: string, params: EmbeddingParams): Promise<EmbeddingResponse>;
}
