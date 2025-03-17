import { UniversalChatResponse, UniversalChatParams, FinishReason, JSONSchemaDefinition } from '../../interfaces/UniversalInterfaces';
import { SchemaValidator, SchemaValidationError } from '../schema/SchemaValidator';
import { z } from 'zod';

export class ResponseProcessor {
    constructor() { }

    public async validateResponse<T extends z.ZodType | undefined = undefined>(
        response: UniversalChatResponse,
        settings: UniversalChatParams['settings']
    ): Promise<UniversalChatResponse<T extends z.ZodType ? z.infer<T> : unknown>> {
        // Case 1: No special handling needed - return as is
        if (!settings?.jsonSchema && settings?.responseFormat !== 'json') {
            return response as UniversalChatResponse<T extends z.ZodType ? z.infer<T> : unknown>;
        }

        // Case 2: Schema validation (either Zod or JSON Schema)
        if (settings?.jsonSchema) {
            return this.validateWithSchema<T>(response, settings.jsonSchema.schema, settings);
        }

        // Case 3: JSON parsing without schema
        return this.parseJson<T extends z.ZodType ? z.infer<T> : unknown>(response);
    }

    private async parseJson<T>(
        response: UniversalChatResponse
    ): Promise<UniversalChatResponse<T>> {
        try {
            // Use contentText if available (for StreamResponse), otherwise use content
            const contentToUse = 'contentText' in response ?
                (response as any).contentText || response.content :
                response.content;

            const parsedContent = JSON.parse(contentToUse);
            return {
                ...response,
                content: response.content, // Keep original string
                contentObject: parsedContent // Add parsed object
            };
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Unknown error';
            console.error('[parseJson] Failed to parse JSON:', errorMessage);
            throw new Error(`Failed to parse JSON response: ${errorMessage}`);
        }
    }

    private async validateWithSchema<T extends z.ZodType | undefined = undefined>(
        response: UniversalChatResponse,
        schema: JSONSchemaDefinition,
        settings: UniversalChatParams['settings']
    ): Promise<UniversalChatResponse<T extends z.ZodType ? z.infer<T> : unknown>> {
        // Use contentText if available (for StreamResponse), otherwise use content
        const contentToUse = 'contentText' in response ?
            (response as any).contentText || response.content :
            response.content;

        let contentToParse = typeof contentToUse === 'string'
            ? JSON.parse(contentToUse)
            : contentToUse;

        try {
            // Check if content is wrapped in a named object matching schema name
            if (typeof contentToParse === 'object' &&
                contentToParse !== null &&
                !Array.isArray(contentToParse) &&
                settings?.jsonSchema?.name) {

                const schemaName = settings.jsonSchema.name.toLowerCase();
                const keys = Object.keys(contentToParse);

                // Find a matching key (case insensitive)
                const matchingKey = keys.find(key => key.toLowerCase() === schemaName);

                if (matchingKey && typeof contentToParse[matchingKey] === 'object') {
                    contentToParse = contentToParse[matchingKey];
                }
            }

            const validatedContent = SchemaValidator.validate(contentToParse, schema);

            const typedResponse: UniversalChatResponse<T extends z.ZodType ? z.infer<T> : unknown> = {
                ...response,
                content: response.content, // Keep original string
                contentObject: validatedContent as T extends z.ZodType ? z.infer<T> : unknown
            };

            return typedResponse;
        } catch (error) {
            if (error instanceof SchemaValidationError) {
                console.warn('[validateWithSchema] Schema validation failed:', {
                    errors: error.validationErrors
                });
                return {
                    ...response,
                    content: response.content,
                    contentObject: contentToParse as T extends z.ZodType ? z.infer<T> : unknown,
                    metadata: {
                        ...response.metadata,
                        validationErrors: error.validationErrors,
                        finishReason: FinishReason.CONTENT_FILTER
                    }
                };
            }

            const errorMessage = error instanceof Error
                ? error.message
                : 'Unknown error';
            console.error('[validateWithSchema] Validation error:', errorMessage);
            throw new Error(`Failed to validate response: ${errorMessage}`);
        }
    }

    public validateJsonMode(model: { capabilities?: { jsonMode?: boolean } }, params: UniversalChatParams): void {
        if (params.settings?.jsonSchema || params.settings?.responseFormat === 'json') {
            if (!model?.capabilities?.jsonMode) {
                throw new Error('Selected model does not support JSON mode');
            }
        }
    }
} 