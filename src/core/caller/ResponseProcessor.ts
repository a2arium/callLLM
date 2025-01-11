import { UniversalChatResponse, UniversalChatParams, FinishReason } from '../../interfaces/UniversalInterfaces';
import { SchemaValidator, SchemaValidationError } from '../schema/SchemaValidator';
import { z } from 'zod';

export class ResponseProcessor {
    constructor() { }

    public async validateResponse<T extends z.ZodType | undefined = undefined>(
        response: UniversalChatResponse,
        settings: UniversalChatParams['settings']
    ): Promise<UniversalChatResponse & { content: T extends z.ZodType ? z.infer<T> : string }> {
        if (!settings?.jsonSchema || response.metadata?.finishReason === FinishReason.NULL) {
            // Parse JSON if JSON mode is requested
            if (response.metadata?.responseFormat === 'json') {
                try {
                    return {
                        ...response,
                        content: JSON.parse(response.content)
                    } as any;
                } catch (error) {
                    if (error instanceof Error) {
                        throw new Error(`Failed to parse JSON response: ${error.message}`);
                    }
                    throw new Error('Failed to parse JSON response: Unknown error');
                }
            }
            return response as any;
        }

        try {
            const contentToParse = typeof response.content === 'string'
                ? JSON.parse(response.content)
                : response.content;

            const validatedContent = SchemaValidator.validate(
                contentToParse,
                settings.jsonSchema.schema
            );

            return {
                ...response,
                content: validatedContent
            } as any;
        } catch (error) {
            if (error instanceof SchemaValidationError) {
                return {
                    ...response,
                    metadata: {
                        ...response.metadata,
                        validationErrors: error.validationErrors,
                        finishReason: FinishReason.CONTENT_FILTER
                    }
                } as any;
            }
            if (error instanceof Error) {
                throw new Error(`Failed to validate response: ${error.message}`);
            }
            throw new Error('Failed to validate response: Unknown error');
        }
    }

    public validateJsonMode(model: { jsonMode?: boolean }, params: UniversalChatParams): void {
        if (params.settings?.jsonSchema || params.settings?.responseFormat === 'json') {
            if (!model?.jsonMode) {
                throw new Error('Selected model does not support JSON mode');
            }
        }
    }
} 