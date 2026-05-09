import type {
    GenerateContentConfig,
    GenerateContentResponse,
    GenerateContentParameters,
    FunctionDeclaration,
    Content,
    Part,
} from '@google/genai';

export type {
    GenerateContentConfig,
    GenerateContentResponse,
    GenerateContentParameters,
    FunctionDeclaration,
    Content as GeminiContentType,
    Part as GeminiPartType,
};

/**
 * Gemini content role type
 */
export type GeminiRole = 'user' | 'model';

/**
 * Gemini content type matching the SDK Content interface
 */
export type GeminiContent = Content;

/**
 * Gemini part type matching the SDK Part interface
 */
export type GeminiPart = Part;

/**
 * Parameters for Gemini generateContent call
 */
export type GeminiGenerateParams = GenerateContentParameters;

/**
 * Gemini function declaration for tool calling
 */
export type GeminiFunctionDeclaration = FunctionDeclaration;

/**
 * Gemini response type (from SDK)
 */
export type GeminiResponse = GenerateContentResponse;

/**
 * Gemini stream chunk type
 */
export type GeminiStreamChunk = GenerateContentResponse;
