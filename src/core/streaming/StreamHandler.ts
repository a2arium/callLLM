import { UniversalStreamResponse, UniversalChatParams, FinishReason } from '../../interfaces/UniversalInterfaces';
import { SchemaValidator, SchemaValidationError } from '../schema/SchemaValidator';
import { TokenCalculator } from '../models/TokenCalculator';
import { z } from 'zod';

export class StreamHandler {
    constructor(
        private tokenCalculator: TokenCalculator
    ) { }

    public async *processStream<T extends z.ZodType | undefined = undefined>(
        stream: AsyncIterable<UniversalStreamResponse>,
        params: UniversalChatParams,
        inputTokens: number
    ): AsyncGenerator<UniversalStreamResponse & { content: T extends z.ZodType ? z.infer<T> : string }> {
        let accumulatedOutput = '';
        const schema = params.settings?.jsonSchema;

        for await (const chunk of stream) {
            accumulatedOutput += chunk.content;
            const outputTokens = this.tokenCalculator.calculateTokens(accumulatedOutput);

            if (chunk.metadata?.responseFormat === 'json') {
                if (chunk.isComplete) {
                    try {
                        const parsedContent = typeof chunk.content === 'string'
                            ? JSON.parse(accumulatedOutput)
                            : accumulatedOutput;

                        if (schema) {
                            try {
                                const validatedContent = SchemaValidator.validate(
                                    parsedContent,
                                    schema.schema
                                );
                                yield {
                                    ...chunk,
                                    content: validatedContent,
                                    metadata: {
                                        ...chunk.metadata,
                                        usage: {
                                            inputTokens,
                                            outputTokens,
                                            totalTokens: inputTokens + outputTokens
                                        }
                                    }
                                } as any;
                            } catch (error) {
                                if (error instanceof SchemaValidationError) {
                                    yield {
                                        ...chunk,
                                        metadata: {
                                            ...chunk.metadata,
                                            validationErrors: error.validationErrors,
                                            finishReason: FinishReason.CONTENT_FILTER,
                                            usage: {
                                                inputTokens,
                                                outputTokens,
                                                totalTokens: inputTokens + outputTokens
                                            }
                                        }
                                    } as any;
                                } else {
                                    throw error;
                                }
                            }
                        } else {
                            yield {
                                ...chunk,
                                content: parsedContent,
                                metadata: {
                                    ...chunk.metadata,
                                    usage: {
                                        inputTokens,
                                        outputTokens,
                                        totalTokens: inputTokens + outputTokens
                                    }
                                }
                            } as any;
                        }
                    } catch (error) {
                        if (error instanceof Error) {
                            throw new Error(`Failed to parse JSON response: ${error.message}`);
                        }
                        throw new Error('Failed to parse JSON response: Unknown error');
                    }
                } else {
                    yield {
                        ...chunk,
                        metadata: {
                            ...chunk.metadata,
                            usage: {
                                inputTokens,
                                outputTokens,
                                totalTokens: inputTokens + outputTokens
                            }
                        }
                    } as any;
                }
            } else {
                if (schema) {
                    try {
                        const validatedContent = SchemaValidator.validate(
                            chunk.content,
                            schema.schema
                        );

                        yield {
                            ...chunk,
                            content: validatedContent,
                            metadata: {
                                ...chunk.metadata,
                                usage: {
                                    inputTokens,
                                    outputTokens,
                                    totalTokens: inputTokens + outputTokens
                                }
                            }
                        } as any;
                    } catch (error) {
                        if (error instanceof SchemaValidationError) {
                            yield {
                                ...chunk,
                                metadata: {
                                    ...chunk.metadata,
                                    validationErrors: error.validationErrors,
                                    finishReason: FinishReason.CONTENT_FILTER,
                                    usage: {
                                        inputTokens,
                                        outputTokens,
                                        totalTokens: inputTokens + outputTokens
                                    }
                                }
                            } as any;
                        } else {
                            throw error;
                        }
                    }
                } else {
                    yield {
                        ...chunk,
                        metadata: {
                            ...chunk.metadata,
                            usage: {
                                inputTokens,
                                outputTokens,
                                totalTokens: inputTokens + outputTokens
                            }
                        }
                    } as any;
                }
            }
        }
    }
} 