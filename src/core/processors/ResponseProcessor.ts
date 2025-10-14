import type { UniversalChatResponse, UniversalChatParams, JSONSchemaDefinition, ModelInfo } from '../../interfaces/UniversalInterfaces.ts';
import { FinishReason } from '../../interfaces/UniversalInterfaces.ts';
import { SchemaValidator, SchemaValidationError } from '../schema/SchemaValidator.ts';
import { coerceDataToZodSchema } from '../schema/ZodCoercion.ts';
import { coerceDataToJsonSchema } from '../schema/JsonSchemaCoercion.ts';
import { enforceZodLiterals, enforceJsonLiterals } from '../schema/SchemaEnforcer.ts';
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
            let parsedResponse = await this.parseJson(response);

            // If schema validation is needed
            if (params.jsonSchema) {
                const isRecord = (v: unknown): v is Record<string, unknown> => (
                    typeof v === 'object' && v !== null && !Array.isArray(v)
                );
                let contentToValidate: unknown = parsedResponse.contentObject;
                // Unflatten union options back into original structure using mapping derived from original schema
                try {
                    const { unflattenData, flattenUnions } = await import('../schema/UnionTransformer.js');
                    if (isRecord(contentToValidate)) {
                        const originalSchemaObject = SchemaValidator.getSchemaObject(params.jsonSchema.schema) as unknown;
                        const originalObj: Record<string, unknown> = typeof originalSchemaObject === 'object' && originalSchemaObject !== null ? (originalSchemaObject as Record<string, unknown>) : {};
                        const { mapping } = flattenUnions(originalObj);
                        if (mapping.length > 0) {
                            const restored = unflattenData(contentToValidate, mapping as any);
                            parsedResponse = {
                                ...parsedResponse,
                                contentObject: restored,
                                content: JSON.stringify(restored)
                            } as typeof parsedResponse;
                            contentToValidate = restored;
                        }
                    }
                } catch { }
                const schemaName = params.jsonSchema.name;

                // Check if content is wrapped in a named object
                if (schemaName && isRecord(contentToValidate)) {
                    const obj = contentToValidate;
                    const matchingKey = Object.keys(obj).find(
                        key => key.toLowerCase() === schemaName.toLowerCase()
                    );
                    if (matchingKey) {
                        contentToValidate = obj[matchingKey];
                        // For tests that expect the contentObject to be unwrapped
                        parsedResponse = { ...parsedResponse, contentObject: contentToValidate } as typeof parsedResponse;
                    }
                }

                // Coerce content to better match Zod/JSON Schema expectations
                try {
                    // Check if schema is Zod by looking for Zod-specific methods
                    const hasZodMethods = params.jsonSchema.schema && typeof (params.jsonSchema.schema as any).parse === 'function';

                    // Always work with JSON Schema for enforcement
                    let jsonSchemaForEnforcement: Record<string, unknown>;

                    if (hasZodMethods) {
                        const zodSchema = params.jsonSchema.schema as unknown as z.ZodType;
                        // First apply Zod-specific coercion
                        contentToValidate = coerceDataToZodSchema(contentToValidate, zodSchema);
                        // Then convert to JSON Schema for enforcement
                        jsonSchemaForEnforcement = SchemaValidator.getSchemaObject(zodSchema) as unknown as Record<string, unknown>;
                    } else if (typeof (params.jsonSchema.schema as unknown) === 'object') {
                        jsonSchemaForEnforcement = params.jsonSchema.schema as unknown as Record<string, unknown>;
                        contentToValidate = coerceDataToJsonSchema(contentToValidate, jsonSchemaForEnforcement);
                    } else {
                        // No valid schema, skip enforcement
                        jsonSchemaForEnforcement = {} as Record<string, unknown>;
                    }

                    // Prune nulls for optional fields to avoid invalid types when omitted
                    contentToValidate = this.pruneNullOptionals(contentToValidate, jsonSchemaForEnforcement);

                    contentToValidate = enforceJsonLiterals(contentToValidate, jsonSchemaForEnforcement);
                    try {
                        SchemaValidator.validate(contentToValidate, params.jsonSchema.schema as JSONSchemaDefinition);
                        // Persist coerced/enforced content back to parsedResponse so callers see the fixed object
                        parsedResponse = {
                            ...parsedResponse,
                            content: JSON.stringify(contentToValidate),
                            contentObject: contentToValidate
                        } as typeof parsedResponse;
                    } catch (e) {
                        // If strict literal-only fields are missing, enforce and validate again
                        contentToValidate = enforceJsonLiterals(contentToValidate, jsonSchemaForEnforcement);
                        SchemaValidator.validate(contentToValidate, params.jsonSchema.schema as JSONSchemaDefinition);
                        // Persist enforced content after second pass
                        parsedResponse = {
                            ...parsedResponse,
                            content: JSON.stringify(contentToValidate),
                            contentObject: contentToValidate
                        } as typeof parsedResponse;
                    }
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
        // If provider already supplied a parsed object, prefer it
        if (response.contentObject && typeof response.contentObject === 'object') {
            return {
                ...response,
                content: JSON.stringify(response.contentObject),
                contentObject: response.contentObject as T,
                metadata: {
                    ...response.metadata,
                    jsonRepaired: false,
                    originalContent: response.content === null ? undefined : response.content,
                    finishReason: response.metadata?.finishReason || FinishReason.STOP
                }
            };
        }

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

    private pruneNullOptionals(data: unknown, schema: Record<string, unknown>): unknown {
        if (!schema || typeof schema !== 'object') return data;
        const type = (schema as any).type as string | undefined;
        if (type === 'object' && data && typeof data === 'object' && !Array.isArray(data)) {
            const result: Record<string, unknown> = { ...(data as Record<string, unknown>) };
            const props = (schema as any).properties as Record<string, unknown> | undefined;
            const required = Array.isArray((schema as any).required) ? ((schema as any).required as string[]) : [];
            if (props && typeof props === 'object') {
                for (const [k, sub] of Object.entries(props)) {
                    // If field is null and not required, drop it
                    if (result[k] === null && !required.includes(k)) {
                        delete result[k];
                        continue;
                    }
                    result[k] = this.pruneNullOptionals(result[k], sub as Record<string, unknown>);
                }
            }
            return result;
        }
        if (type === 'array' && Array.isArray(data)) {
            const itemSchema = (schema as any).items as Record<string, unknown> | undefined;
            if (itemSchema) return (data as unknown[]).map(v => this.pruneNullOptionals(v, itemSchema));
            return data;
        }
        return data;
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