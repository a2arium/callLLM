import { UniversalChatResponse, UniversalChatParams, FinishReason, JSONSchemaDefinition } from '../../interfaces/UniversalInterfaces';
import { SchemaValidator, SchemaValidationError } from '../schema/SchemaValidator';
import { z } from 'zod';

export class ResponseProcessor {
    constructor() { }

    public async validateResponse<T extends z.ZodType | undefined = undefined>(
        response: UniversalChatResponse,
        settings: UniversalChatParams['settings']
    ): Promise<UniversalChatResponse & { content: T extends z.ZodType ? z.infer<T> : string }> {

        // Case 1: No special handling needed - return as is
        if (!settings?.jsonSchema && response.metadata?.responseFormat !== 'json') {
            return response as UniversalChatResponse & { content: T extends z.ZodType ? z.infer<T> : string };
        }

        // Case 2: Schema validation (either Zod or JSON Schema)
        if (settings?.jsonSchema) {
            return this.validateWithSchema<T>(response, settings.jsonSchema.schema, settings);
        }

        // Case 3: JSON parsing without schema
        return this.parseJson<T>(response);
    }

    private async parseJson<T>(
        response: UniversalChatResponse
    ): Promise<UniversalChatResponse & { content: T extends z.ZodType ? z.infer<T> : string }> {
        try {
            const parsedResponse = {
                ...response,
                content: JSON.parse(response.content)
            };
            return parsedResponse as UniversalChatResponse & { content: T extends z.ZodType ? z.infer<T> : string };
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Unknown error';
            console.error('[parseJson] Failed to parse JSON:', errorMessage);
            throw new Error(`Failed to parse JSON response: ${errorMessage}`);
        }
    }

    private async validateWithSchema<T>(
        response: UniversalChatResponse,
        schema: JSONSchemaDefinition,
        settings: UniversalChatParams['settings']
    ): Promise<UniversalChatResponse & { content: T extends z.ZodType ? z.infer<T> : string }> {
        let contentToParse = typeof response.content === 'string'
            ? JSON.parse(response.content)
            : response.content;

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

            const validatedResponse = {
                ...response,
                content: validatedContent
            };
            return validatedResponse as UniversalChatResponse & { content: T extends z.ZodType ? z.infer<T> : string };
        } catch (error) {
            if (error instanceof SchemaValidationError) {
                console.warn('[validateWithSchema] Schema validation failed:', {
                    errors: error.validationErrors
                });
                return {
                    ...response,
                    content: contentToParse,
                    metadata: {
                        ...response.metadata,
                        validationErrors: error.validationErrors,
                        finishReason: FinishReason.CONTENT_FILTER
                    }
                } as UniversalChatResponse & { content: T extends z.ZodType ? z.infer<T> : string };
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