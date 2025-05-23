import type { UniversalChatResponse, UniversalChatParams, JSONSchemaDefinition, ModelInfo } from '../../interfaces/UniversalInterfaces.ts';
import { FinishReason } from '../../interfaces/UniversalInterfaces.ts';
import { SchemaValidator, SchemaValidationError } from '../schema/SchemaValidator.ts';
import { z } from 'zod';
import { jsonrepair } from 'jsonrepair';
import { logger } from '../../utils/logger.ts';

export class ResponseProcessor {
    constructor() { }

    /**
     * Validates a response based on the provided parameters.
     * This handles schema validation, JSON parsing, and content filtering.
     */
    public async validateResponse<T extends z.ZodType | undefined = undefined>(
        response: UniversalChatResponse,
        params: UniversalChatParams,
        model: ModelInfo,
        options?: { usePromptInjection?: boolean }
    ): Promise<UniversalChatResponse<T extends z.ZodType ? z.infer<T> : unknown>> {
        const log = logger.createLogger({ prefix: 'ResponseProcessor.validateResponse' });

        // If no JSON processing is needed, return the original response
        if (!params.jsonSchema && params.responseFormat !== 'json' &&
            !(params.responseFormat && typeof params.responseFormat === 'object' && params.responseFormat.type === 'json_object')) {
            return response as UniversalChatResponse<T extends z.ZodType ? z.infer<T> : unknown>;
        }

        // For JSON responses, parse and validate
        try {
            const parsedResponse = await this.parseJson(response);

            // If schema validation is needed
            if (params.jsonSchema) {
                const schemaName = params.jsonSchema.name;
                let contentToValidate = parsedResponse.contentObject;

                // Check if content is wrapped in a named object
                if (schemaName && typeof contentToValidate === 'object' && contentToValidate !== null) {
                    const matchingKey = Object.keys(contentToValidate).find(
                        key => key.toLowerCase() === schemaName.toLowerCase()
                    );
                    if (matchingKey) {
                        contentToValidate = (contentToValidate as Record<string, unknown>)[matchingKey];
                        // For tests that expect the contentObject to be unwrapped
                        parsedResponse.contentObject = contentToValidate;
                    }
                }

                // Validate against schema
                try {
                    SchemaValidator.validate(contentToValidate, params.jsonSchema.schema);
                } catch (validationError) {
                    if (validationError instanceof SchemaValidationError) {
                        return {
                            ...parsedResponse,
                            metadata: {
                                ...parsedResponse.metadata,
                                validationErrors: validationError.validationErrors.map(err => ({
                                    path: Array.isArray(err.path) ? err.path : [err.path],
                                    message: err.message
                                })),
                                finishReason: FinishReason.CONTENT_FILTER
                            }
                        } as UniversalChatResponse<T extends z.ZodType ? z.infer<T> : unknown>;
                    }

                    // For non-SchemaValidationError, throw with the expected message format
                    if (validationError instanceof Error) {
                        throw new Error(`Failed to validate response: ${validationError.message}`);
                    } else {
                        throw new Error('Failed to validate response: Unknown error');
                    }
                }
            }

            return parsedResponse as UniversalChatResponse<T extends z.ZodType ? z.infer<T> : unknown>;
        } catch (error: unknown) {
            if (error instanceof SyntaxError || (error instanceof Error && error.message === 'Failed to parse JSON response')) {
                throw error;
            }
            if (error instanceof Error) {
                throw error; // Preserve the original error message
            }
            throw new Error('Failed to validate response');
        }
    }

    /**
     * Checks if a JSON string is likely to be repairable.
     * This is a heuristic check to avoid trying to repair completely malformed JSON.
     */
    private isLikelyRepairable(jsonString: string): boolean {
        // Must start with { or [ and end with } or ]
        if (!/^\s*[{\[](.*[\]}])?\s*$/.test(jsonString)) {
            return false;
        }

        // Must have balanced braces and brackets
        let braceCount = 0;
        let bracketCount = 0;
        let inString = false;
        let escaped = false;

        for (let i = 0; i < jsonString.length; i++) {
            const char = jsonString[i];
            if (!inString) {
                if (char === '{') braceCount++;
                if (char === '}') braceCount--;
                if (char === '[') bracketCount++;
                if (char === ']') bracketCount--;
                if (char === '"') inString = true;
            } else {
                if (char === '\\' && !escaped) {
                    escaped = true;
                    continue;
                }
                if (char === '"' && !escaped) inString = false;
                escaped = false;
            }

            // If at any point we have negative counts, the JSON is malformed
            if (braceCount < 0 || bracketCount < 0) {
                return false;
            }
        }

        // Check final balance
        return braceCount === 0 && bracketCount === 0;
    }

    private repairJson(content: string | null): string | undefined {
        if (!content) return undefined;
        try {
            return jsonrepair(content);
        } catch {
            return undefined;
        }
    }

    private async parseJson<T>(
        response: UniversalChatResponse & { contentText?: string }
    ): Promise<UniversalChatResponse<T>> {
        let sourceContent = response.content; // Keep original response.content for originalContent metadata
        let contentToParse = response.content?.trim() || '';

        // Prioritize contentText if it's a streaming response and contentText is available
        if (response.metadata?.stream && typeof response.contentText === 'string') {
            // Use contentText as the primary content to parse
            // but keep the original response.content (if any) for the originalContent metadata field
            sourceContent = response.contentText; // The "original" source becomes contentText
            contentToParse = response.contentText.trim();
        }

        let parsedContent: T;
        let jsonRepaired = false;
        // originalContent should reflect what was initially attempted for parsing, before repair
        const initialContentForParsing = contentToParse;

        try {
            parsedContent = JSON.parse(contentToParse) as T;
        } catch (parseError) {
            if (!(parseError instanceof Error)) {
                throw new Error('Failed to parse JSON response: Unknown error');
            }

            if (!this.isLikelyRepairable(contentToParse)) {
                throw new Error('Failed to parse JSON response: Invalid JSON structure');
            }

            const repairedJson = this.repairJson(contentToParse);
            if (!repairedJson) {
                // If repairJson returns undefined, and the contentToParse was not empty and looked like JSON
                if (contentToParse && (contentToParse.includes('{') || contentToParse.includes('['))) {
                    throw new Error('Failed to parse JSON response: Unable to repair JSON');
                } else {
                    // If it was empty or didn't look like JSON, the original parseError is more relevant
                    throw parseError;
                }
            }

            try {
                parsedContent = JSON.parse(repairedJson) as T;
                jsonRepaired = true;
                // sourceContent here will be the original string (either response.content or response.contentText)
                // that led to the successful (repaired) parsing.
            } catch (repairError) {
                // If repair fails, use the original parseError's message if it's more specific, or a generic repair failure.
                const originalParseMessage = (parseError as Error).message || 'Invalid JSON';
                throw new Error(`Failed to parse JSON response: Invalid JSON after repair (original error: ${originalParseMessage})`);
            }
        }

        return {
            ...response,
            // content field in response should be the stringified version of the final contentObject
            content: JSON.stringify(parsedContent),
            contentObject: parsedContent,
            metadata: {
                ...response.metadata,
                jsonRepaired,
                // originalContent should be what was initially fed to the parser before any repair attempt
                // which is sourceContent (the chosen one between response.content and response.contentText)
                originalContent: sourceContent === null ? undefined : sourceContent,
                finishReason: response.metadata?.finishReason || FinishReason.STOP // Preserve existing finishReason if any
            }
        };
    }

    private async validateWithSchema<T extends z.ZodType | undefined = undefined>(
        response: UniversalChatResponse,
        schemaDefinition: { schema: JSONSchemaDefinition },
        params: UniversalChatParams
    ): Promise<UniversalChatResponse<T extends z.ZodType ? z.infer<T> : unknown>> {
        // Use contentText if available (for StreamResponse), otherwise use content
        const contentToUse = 'contentText' in response ?
            (response as UniversalChatResponse & { contentText?: string }).contentText || response.content :
            response.content;

        if (contentToUse === null || contentToUse === undefined) {
            throw new Error('Failed to parse JSON response: Content is null or undefined');
        }

        let contentToParse: Record<string, unknown>;
        let wasRepaired = false;
        let originalContent: string | undefined;

        try {
            // First try normal JSON parse
            contentToParse = JSON.parse(contentToUse);
        } catch (parseError) {
            // If normal parse fails, check if it's likely repairable
            if (!this.isLikelyRepairable(contentToUse)) {
                throw new Error('Failed to parse JSON response: Invalid JSON structure');
            }

            // Try to repair
            let repairedContent: string | undefined;
            try {
                repairedContent = this.repairJson(contentToUse);
                if (!repairedContent) {
                    throw new Error('Failed to parse JSON response: Unable to repair JSON');
                }
                contentToParse = JSON.parse(repairedContent);
                wasRepaired = true;
                originalContent = contentToUse === null ? undefined : contentToUse;
            } catch (repairError) {
                throw new Error('Failed to parse JSON response: Invalid JSON after repair');
            }
        }

        // Check if content is wrapped in a named object matching schema name
        if (typeof contentToParse === 'object' &&
            contentToParse !== null &&
            !Array.isArray(contentToParse) &&
            params.jsonSchema?.name) {

            const schemaName = params.jsonSchema.name.toLowerCase();
            const keys = Object.keys(contentToParse);

            // Find a matching key (case insensitive)
            const matchingKey = keys.find(key => key.toLowerCase() === schemaName);

            if (matchingKey && typeof contentToParse[matchingKey] === 'object') {
                contentToParse = contentToParse[matchingKey] as Record<string, unknown>;
            }
        }

        try {
            const validatedContent = SchemaValidator.validate(contentToParse, schemaDefinition.schema);
            return {
                ...response,
                content: JSON.stringify(validatedContent),
                contentObject: validatedContent as T extends z.ZodType ? z.infer<T> : unknown,
                metadata: {
                    ...response.metadata,
                    jsonRepaired: wasRepaired,
                    originalContent,
                    finishReason: FinishReason.STOP
                }
            };
        } catch (error) {
            if (error instanceof SchemaValidationError) {
                return {
                    ...response,
                    content: JSON.stringify(contentToParse),
                    contentObject: contentToParse as T extends z.ZodType ? z.infer<T> : unknown,
                    metadata: {
                        ...response.metadata,
                        jsonRepaired: wasRepaired,
                        originalContent,
                        validationErrors: error.validationErrors.map(err => ({
                            message: err.message,
                            path: Array.isArray(err.path) ? err.path : [err.path]
                        })),
                        finishReason: FinishReason.CONTENT_FILTER
                    }
                };
            }
            throw new Error(`Failed to validate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Validates that the model supports JSON mode if it's requested.
     * Handles different JSON mode types:
     * - 'native-only': Only use native JSON mode, error if not supported
     * - 'fallback': Use native if supported, fallback to prompt if not (default)
     * - 'force-prompt': Always use prompt enhancement, even if native JSON mode is supported
     */
    public validateJsonMode(
        modelInfo: ModelInfo,
        params: UniversalChatParams
    ): { usePromptInjection: boolean } {
        const isJsonRequested = params.responseFormat === 'json' || params.jsonSchema ||
            (params.responseFormat && typeof params.responseFormat === 'object' && params.responseFormat.type === 'json_object');

        // Check if model supports JSON output format with the new structure
        const hasNativeJsonSupport = typeof modelInfo.capabilities?.output?.text === 'object' &&
            modelInfo.capabilities.output.text.textOutputFormats?.includes('json');

        const jsonMode = params.settings?.jsonMode ?? 'fallback';

        if (!isJsonRequested) {
            return { usePromptInjection: false };
        }

        if (jsonMode === 'native-only' && !hasNativeJsonSupport) {
            throw new Error('Selected model does not support native JSON mode and native-only mode is required');
        }

        const usePromptInjection = jsonMode === 'force-prompt' || (jsonMode === 'fallback' && !hasNativeJsonSupport);
        return { usePromptInjection };
    }
} 