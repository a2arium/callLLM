import { OpenAI } from 'openai'; // Import OpenAI namespace
import { UniversalChatParams, UniversalChatResponse, UniversalMessage, FinishReason, Usage, ModelCapabilities, ReasoningEffort, ImageDataSource } from '../../interfaces/UniversalInterfaces';
import { OpenAIResponseValidationError } from './errors';
import { ToolDefinition, ToolParameters, ToolCall } from '../../types/tooling';
import { logger } from '../../utils/logger';
import { SchemaValidator } from '../../core/schema/SchemaValidator';
import { SchemaFormatter } from '../../core/schema/SchemaFormatter';
import { z } from 'zod';
import {
    ResponseCreateParams,
    FunctionTool,
    ResponseInputItem,
    ResponseTextConfig,
    ResponseOutputItem,
    ResponseOutputMessage,
    ResponseFunctionToolCall,
    Response,
    EasyInputMessage
} from './types';
import { ModelManager } from '../../core/models/ModelManager';
import { normalizeImageSource, estimateImageTokens } from '../../core/file-data/fileData';
import { TokenCalculator } from '../../core/models/TokenCalculator';

/**
 * Extract the file path from a file placeholder string
 * @param placeholder String that follows the format "<file:path/to/file>"
 * @returns The extracted file path
 */
export function extractPathFromPlaceholder(placeholder: string): string {
    // Remove the "<file:" prefix and the ">" suffix
    if (!placeholder.startsWith('<file:') || !placeholder.endsWith('>')) {
        throw new Error(`Invalid file placeholder format: ${placeholder}`);
    }

    return placeholder.substring(6, placeholder.length - 1);
}

export class Converter {
    private modelManager: ModelManager;

    constructor(modelManager: ModelManager) {
        this.modelManager = modelManager;
    }

    /**
     * Converts UniversalChatParams to OpenAI Response API parameters (native types)
     * @param model The model name to use
     * @param params Universal chat parameters
     * @param adapterOpts Additional adapter-specific options
     * @returns Parameters formatted for the OpenAI Response API (native type)
     */
    async convertToOpenAIResponseParams(
        model: string,
        params: UniversalChatParams,
        adapterOpts?: { imageDetail?: 'low' | 'high' | 'auto' }
    ): Promise<Partial<ResponseCreateParams>> { // Return partial native type
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.convertToOpenAIResponseParams' });
        log.debug('Converting universal params:', params);

        // Get model info to check for reasoning capability
        const modelInfo = this.modelManager.getModel(model);
        const hasReasoningCapability = modelInfo?.capabilities?.reasoning || false;

        log.debug(`Model ${model} has reasoning capability: ${hasReasoningCapability}`);

        const formattedTools = (params.tools || []).map((toolDef: ToolDefinition): FunctionTool => {
            if (!toolDef.name || !toolDef.parameters) {
                throw new OpenAIResponseValidationError(`Invalid tool definition: ${toolDef.name || 'Unnamed tool'}`);
            }

            log.debug(`Processing tool definition for OpenAI`, {
                name: toolDef.name,
                originalName: toolDef.metadata?.originalName,
                hasParameters: Boolean(toolDef.parameters),
                parametersType: toolDef.parameters?.type,
                requiredParams: toolDef.parameters?.required || [],
                propertiesCount: Object.keys(toolDef.parameters?.properties || {}).length
            });

            // Check for potential issues before conversion
            if (Object.keys(toolDef.parameters?.properties || {}).length === 0) {
                log.info(`Tool has empty properties object: ${toolDef.name}`, {
                    toolName: toolDef.name,
                    originalName: toolDef.metadata?.originalName
                });
            }

            if (toolDef.parameters?.required?.length) {
                const missingProps = toolDef.parameters.required.filter(
                    param => !(param in (toolDef.parameters?.properties || {}))
                );

                if (missingProps.length > 0) {
                    log.info(`Tool has required params not in properties: ${toolDef.name}`, {
                        toolName: toolDef.name,
                        originalName: toolDef.metadata?.originalName,
                        missingProperties: missingProps
                    });
                }
            }

            // Start with the parameters prepared by the core logic (includes correct required array)
            const baseParameters = this.prepareParametersForOpenAIResponse(toolDef.parameters);

            // --- OpenAI Workaround: Add ALL properties to the required array --- 
            const allPropertyKeys = baseParameters.properties ? Object.keys(baseParameters.properties) : [];

            // Conditionally create finalParameters with or without the required field
            let finalParameters: Record<string, unknown>;
            if (allPropertyKeys.length > 0) {
                finalParameters = {
                    ...baseParameters,
                    required: allPropertyKeys // Override required with all keys
                };
                log.debug(`[OpenAI WORKAROUND] Overriding required array for tool ${toolDef.name}. Original: ${JSON.stringify(baseParameters.required || [])}, Final: ${JSON.stringify(finalParameters.required)}`);
            } else {
                // If no properties, omit the required field entirely
                finalParameters = { ...baseParameters };
                delete finalParameters.required; // Still need to remove it if baseParameters had it
                log.info(`Tool has no properties, removing required field: ${toolDef.name}`);
            }
            // --- End OpenAI Workaround ---

            // Map to the native FunctionTool structure
            const openAITool: FunctionTool = {
                type: 'function',
                name: toolDef.name,
                parameters: finalParameters, // Use the modified parameters
                description: toolDef.description || undefined,
                strict: true
            };
            log.debug(`Formatted tool ${toolDef.name} for OpenAI native:`, {
                name: openAITool.name,
                parametersType: openAITool.parameters.type as string,
                propertiesCount: Object.keys((openAITool.parameters.properties as Record<string, unknown>) || {}).length,
                requiredParams: (openAITool.parameters.required as string[]) || 'none'
            });
            return openAITool;
        });

        // If model has reasoning capabilities, transform system messages into user messages
        let input: EasyInputMessage[] = [];
        let instructions: string | undefined = undefined;

        if (hasReasoningCapability) {
            // For reasoning models, transform messages and incorporate system message into user message
            input = this.transformMessagesForReasoningModel(params.messages, params.systemMessage);
            // Don't set instructions for reasoning models
            instructions = undefined;
        } else {
            // Process messages to handle file placeholders
            input = [];

            let hasProcessedImage = false;

            for (const message of params.messages) {
                // Handle file placeholder in message content
                if (typeof message.content === 'string' && message.content.startsWith('<file:') && message.content.endsWith('>')) {
                    try {
                        const filePath = extractPathFromPlaceholder(message.content);

                        // Different handling based on source type
                        let imageSource: any;

                        if (filePath.startsWith('data:')) {
                            // Already a data URL, use as is
                            imageSource = filePath;
                        } else if (filePath.startsWith('http')) {
                            // Remote URL, use as is
                            imageSource = filePath;
                        } else {
                            // Local file path - create a file source and convert to base64
                            const fileSource: ImageDataSource = { kind: 'filePath', value: filePath };
                            const normalized = await normalizeImageSource(fileSource);

                            // Use the base64 data URL for OpenAI
                            if (normalized.kind === 'base64') {
                                imageSource = `data:${normalized.mime};base64,${normalized.value}`;
                            } else {
                                // Fallback if normalization returned a URL instead
                                imageSource = normalized.value;
                            }
                        }

                        // Create a multi-part message with image
                        const content: any[] = [
                            {
                                type: 'input_image',
                                image_url: imageSource
                            }
                        ];

                        const newMessage: EasyInputMessage = {
                            role: this.transformRoleToOpenAIResponseRole(message.role),
                            content: content
                        };
                        input.push(newMessage);

                        // Remember we processed an image file to set metadata later
                        hasProcessedImage = true;
                    } catch (error) {
                        log.error('Failed to process file placeholder:', error);
                        // If there's an error, fall back to the original content
                        input.push({
                            role: this.transformRoleToOpenAIResponseRole(message.role),
                            content: message.content
                        });
                    }
                } else {
                    // Standard message without file placeholder
                    input.push({
                        role: this.transformRoleToOpenAIResponseRole(message.role),
                        content: message.content
                    });
                }
            }

            instructions = params.systemMessage || undefined;
        }

        // Build parameters using native type structure
        const openAIParams: Partial<ResponseCreateParams> = {
            model: model,
            input: input,
            instructions: instructions,
            tools: formattedTools.length > 0 ? formattedTools : undefined
        };

        // Set reasoning configuration if model supports it
        if (hasReasoningCapability && params.settings?.reasoning) {
            openAIParams.reasoning = {
                effort: params.settings.reasoning.effort || 'medium'
            };

            // Add summary option if requested
            if (params.settings.reasoning.summary) {
                // Use type assertion to extend the reasoning object with summary property
                (openAIParams.reasoning as any).summary = params.settings.reasoning.summary;
            }
        } else if (hasReasoningCapability) {
            // Default to medium effort if reasoning capability but no explicit setting
            openAIParams.reasoning = { effort: 'medium' };
        }

        // Map optional settings
        // Only set temperature for non-reasoning models
        if (params.settings?.temperature !== undefined && !hasReasoningCapability) {
            openAIParams.temperature = params.settings.temperature;
        }

        // Continue with rest of the conversion
        if (params.settings?.topP !== undefined) {
            openAIParams.top_p = params.settings.topP;
        }
        if (params.settings?.maxTokens !== undefined) {
            openAIParams.max_output_tokens = params.settings.maxTokens;
        }
        if (params.responseFormat === 'json' || (params.jsonSchema && params.jsonSchema.schema)) {
            // Set up text format configuration for the OpenAI Responses API
            if (params.jsonSchema && params.jsonSchema.schema) {
                // Handle schema-based JSON formatting with json_schema type
                const formatConfig: any = {
                    type: 'json_schema',
                    strict: true
                };

                if (params.jsonSchema.name) {
                    formatConfig.name = params.jsonSchema.name;
                }

                // Process the schema according to its type
                if (params.jsonSchema.schema instanceof z.ZodType) {
                    // Convert Zod schema to JSON Schema object
                    formatConfig.schema = SchemaValidator.getSchemaObject(params.jsonSchema.schema);
                } else if (typeof params.jsonSchema.schema === 'string') {
                    try {
                        // Parse JSON string and ensure additionalProperties: false is set at all levels
                        const parsedSchema = JSON.parse(params.jsonSchema.schema);
                        formatConfig.schema = SchemaFormatter.addAdditionalPropertiesFalse(parsedSchema);
                    } catch (error) {
                        log.info('Failed to parse JSON schema string');
                        // Fallback to simple JSON object format
                        formatConfig.type = 'json_object';
                        delete formatConfig.schema;
                    }
                } else {
                    // Handle object schema directly and ensure additionalProperties: false is set
                    formatConfig.schema = SchemaFormatter.addAdditionalPropertiesFalse(params.jsonSchema.schema);
                }

                openAIParams.text = {
                    format: formatConfig
                } as ResponseTextConfig;
            } else {
                // Simple JSON format without schema
                openAIParams.text = {
                    format: {
                        type: 'json_object'
                    }
                } as ResponseTextConfig;
            }
        }
        if (params.settings?.toolChoice) {
            openAIParams.tool_choice = params.settings.toolChoice as any;
        }
        if (params.settings?.user) {
            openAIParams.user = params.settings.user;
        }
        // Setup metadata
        openAIParams.metadata = {};

        // Add user-provided metadata if any
        if (params.settings?.providerOptions?.metadata) {
            openAIParams.metadata = {
                ...openAIParams.metadata,
                ...params.settings.providerOptions.metadata as Record<string, string>
            };
        }

        // Add image detail for usage calculation if provided
        if (adapterOpts?.imageDetail) {
            openAIParams.metadata.image_detail = adapterOpts.imageDetail;
        }

        log.debug('Converted to native params (partial):', openAIParams);
        return openAIParams;
    }

    /**
     * Transforms messages for reasoning models, incorporating system message into user messages
     * @private
     */
    private transformMessagesForReasoningModel(
        messages: UniversalMessage[],
        systemMessage?: string
    ): EasyInputMessage[] {
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.transformMessagesForReasoningModel' });

        // Deep clone messages to avoid mutating the original
        const transformedMessages = [...messages];

        // If there's a system message and at least one user message,
        // incorporate the system message into the first user message
        if (systemMessage && transformedMessages.some(m => m.role === 'user')) {
            // Find the first user message
            const firstUserIndex = transformedMessages.findIndex(m => m.role === 'user');
            if (firstUserIndex >= 0) {
                const userMsg = transformedMessages[firstUserIndex];
                // Combine system instruction with user message
                transformedMessages[firstUserIndex] = {
                    role: 'user',
                    content: `[System Instructions: ${systemMessage}]\n\n${userMsg.content}`
                };

                log.debug('Incorporated system message into user message:', transformedMessages[firstUserIndex]);
            }
        }

        return transformedMessages.map(message => ({
            role: this.transformRoleToOpenAIResponseRole(message.role),
            content: message.content
        }));
    }

    // Role mapping might need adjustment based on exact native roles allowed
    private transformRoleToOpenAIResponseRole(role: string): 'user' | 'assistant' | 'system' | 'developer' {
        switch (role) {
            case 'system':
                return 'system';
            case 'tool':
            case 'function':
                return 'system'; // Map tool/function roles to system
            case 'user':
                return 'user';
            case 'developer':
                return 'developer';
            case 'assistant':
                return 'assistant';
            default:
                logger.warn(`Unknown role encountered: ${role}, mapping to 'user'.`);
                return 'user';
        }
    }

    /**
     * Converts OpenAI Response API response (native type) to UniversalChatResponse
     * @param response OpenAI Response API response object (native type)
     * @returns Universal chat response
     */
    convertFromOpenAIResponse(response: Response): UniversalChatResponse {
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.convertFromOpenAIResponse' });
        log.debug('Converting native response:', response);

        // Enhanced debugging for reasoning tokens
        if (response.usage?.output_tokens_details?.reasoning_tokens) {
            log.debug(`Found reasoning tokens in native response: ${response.usage.output_tokens_details.reasoning_tokens}`);
        } else {
            log.debug('No reasoning tokens found in native response usage data');
            log.debug('Raw usage data:', response.usage);
        }

        // Initialize universal response
        const universalResponse: UniversalChatResponse = {
            content: '',
            role: 'assistant',
            metadata: {} // Initialize with empty object
        };

        // Extract metadata from native response structure
        if (response.model) {
            universalResponse.metadata = universalResponse.metadata || {};
            universalResponse.metadata.model = response.model;
        }
        if (response.created_at) {
            universalResponse.metadata = universalResponse.metadata || {};
            universalResponse.metadata.created = response.created_at;
        }

        // Map finish reason from native status/incomplete_details
        let finishReason: FinishReason = FinishReason.NULL;
        if (response.status === 'completed') {
            finishReason = FinishReason.STOP;
        } else if (response.status === 'incomplete') {
            if (response.incomplete_details?.reason === 'max_output_tokens') {
                finishReason = FinishReason.LENGTH;
            }
        } else if (response.status === 'failed') {
            finishReason = FinishReason.ERROR;
            if (response.error) {
                universalResponse.metadata = universalResponse.metadata || {};
                universalResponse.metadata.refusal = {
                    message: response.error.message,
                    code: response.error.code
                };
            }
        }

        // Set finish reason
        universalResponse.metadata = universalResponse.metadata || {};
        universalResponse.metadata.finishReason = finishReason;

        // Extract usage info from native usage structure
        if (response.usage) {
            universalResponse.metadata = universalResponse.metadata || {};

            // Extract raw token counts from API response
            const rawInputTokens = response.usage.input_tokens || 0;
            const rawOutputTokens = response.usage.output_tokens || 0;
            const rawTotalTokens = response.usage.total_tokens || 0;
            const cachedTokens = response.usage.input_tokens_details?.cached_tokens || 0;
            const reasoningTokens = response.usage.output_tokens_details?.reasoning_tokens || 0;

            log.debug('Raw usage data from API:', {
                input_tokens: rawInputTokens,
                output_tokens: rawOutputTokens,
                total_tokens: rawTotalTokens
            });

            // Calculate image tokens by subtracting estimated text tokens
            let imageTokens = 0;

            // If we have a very large number of input tokens, it's likely from an image
            if (rawInputTokens > 100) {
                // Simple estimate: text messages are typically small, so most tokens are from the image
                const estimatedTextTokens = 50; // Fixed approximation for text portion

                // Image tokens = total - estimated text tokens
                imageTokens = Math.max(0, rawInputTokens - estimatedTextTokens);

                log.debug(`Estimated image tokens: ${imageTokens} (raw: ${rawInputTokens}, text: ~${estimatedTextTokens})`);
            }

            // ALWAYS use exactly what the model returns for totals
            universalResponse.metadata.usage = {
                tokens: {
                    input: {
                        total: rawInputTokens,
                        cached: cachedTokens,
                        // Only include image tokens if we've detected them
                        image: imageTokens > 0 ? imageTokens : undefined
                    },
                    output: {
                        total: rawOutputTokens,
                        reasoning: reasoningTokens,
                    },
                    total: rawTotalTokens
                },
                costs: {
                    input: {
                        total: 0,
                        cached: 0,
                    },
                    output: {
                        total: 0,
                        reasoning: 0,
                    },
                    total: 0
                } // Costs calculated later
            };

            log.debug('Converted usage data:', universalResponse.metadata.usage.tokens);
        }

        // Process output items from native structure
        const toolCalls: ToolCall[] = [];
        let textContent = '';

        // Extract reasoning summary if available
        if (response.output && Array.isArray(response.output)) {
            // Look for reasoning items in the output
            for (const item of response.output) {
                if (item.type === 'reasoning' && Array.isArray(item.summary)) {
                    // Extract the reasoning summary text
                    const summary = item.summary
                        .map((summaryItem: any) => summaryItem.text || '')
                        .filter(Boolean)
                        .join('\n\n');

                    if (summary) {
                        universalResponse.reasoning = summary;
                        log.debug('Found reasoning summary:', summary.substring(0, 100) + '...');
                    }
                    break; // Found what we need
                }
            }
        }

        // NEW: First check for output_text at the top level (reasoning models)
        if (response.output_text) {
            log.debug(`Found output_text at top level: "${response.output_text}"`);
            textContent = response.output_text;
        }
        // Then check the traditional message structure as a fallback
        else if (response.output && Array.isArray(response.output)) {
            // Find the main assistant message item
            const messageItem = response.output.find(item =>
                item.type === 'message' &&
                item.role === 'assistant' &&
                (item.status === 'completed' || item.status === 'incomplete')
            ) as ResponseOutputMessage | undefined;

            if (messageItem && messageItem.content && Array.isArray(messageItem.content)) {
                for (const contentItem of messageItem.content) {
                    if (contentItem.type === 'output_text') {
                        textContent += contentItem.text || '';
                    }
                }
            }

            // Extract function/tool calls
            this.extractDirectFunctionCalls(response.output, toolCalls);
        }

        universalResponse.content = textContent;
        if (toolCalls.length > 0) {
            universalResponse.toolCalls = toolCalls;
        }

        return universalResponse;
    }

    private extractDirectFunctionCalls(outputItems: ResponseOutputItem[], toolCalls: ToolCall[]): void {
        // Look for function tool calls in the output items
        for (const item of outputItems) {
            if (item.type === 'function_call') {
                const functionCall = item as unknown as ResponseFunctionToolCall;
                try {
                    const args = functionCall.arguments;
                    const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args || {};
                    toolCalls.push({
                        id: functionCall.id || functionCall.call_id || `fc_${Date.now()}`,
                        name: functionCall.name || 'unknown',
                        arguments: parsedArgs
                    });
                } catch (e) {
                    logger.error('Failed to parse function call arguments from native response:', e);
                    toolCalls.push({
                        id: functionCall.id || functionCall.call_id || `fc_${Date.now()}`,
                        name: functionCall.name || 'unknown',
                        arguments: { rawArguments: functionCall.arguments }
                    });
                }
            }
        }
    }

    /**
     * Prepares parameter schemas for OpenAI Response API by adding additionalProperties: false
     * to the root schema and any nested object schemas
     */
    private prepareParametersForOpenAIResponse(parameters: Record<string, unknown>): Record<string, unknown> {
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.prepareParametersForOpenAIResponse' });

        // Log incoming parameters
        log.debug('Preparing parameters for OpenAI Response', {
            hasType: Boolean(parameters.type),
            type: parameters.type,
            hasProperties: Boolean(parameters.properties),
            propertiesCount: parameters.properties ? Object.keys(parameters.properties as Record<string, unknown>).length : 0,
            hasRequired: Boolean(parameters.required),
            requiredCount: parameters.required ? (parameters.required as string[]).length : 0
        });

        // Check for potential issues
        if (!parameters.properties || Object.keys(parameters.properties as Record<string, unknown>).length === 0) {
            log.info('Empty properties object in parameters', {
                type: parameters.type,
                hasRequired: Boolean(parameters.required)
            });
        }

        if (parameters.required && (parameters.required as string[]).length > 0) {
            // Check if any required properties are missing from the properties object
            if (parameters.properties) {
                const properties = parameters.properties as Record<string, unknown>;
                const missingProps = (parameters.required as string[]).filter(
                    prop => !(prop in properties)
                );
                if (missingProps.length > 0) {
                    log.info('Required properties not found in properties object', {
                        missingProps,
                        requiredProps: parameters.required,
                        availableProps: Object.keys(properties)
                    });
                }
            } else {
                log.info('Required properties specified but no properties object exists', {
                    requiredProps: parameters.required
                });
            }
        }

        // Clone the parameters to avoid modifying the original
        const preparedParams: Record<string, unknown> = {
            ...parameters,
            additionalProperties: false
        };

        // Process nested properties if they exist
        if (
            preparedParams.properties &&
            typeof preparedParams.properties === 'object'
        ) {
            const properties = preparedParams.properties as Record<string, unknown>;

            log.debug('Processing nested properties', {
                propertyCount: Object.keys(properties).length,
                propertyNames: Object.keys(properties)
            });

            // Process each property that might be an object schema
            for (const key in properties) {
                const prop = properties[key];
                // Remove 'default' property from each field (OpenAI doesn't support it)
                if (typeof prop === 'object' && prop !== null && 'default' in prop) {
                    log.debug(`Removing 'default' property from field '${key}'`);
                    delete (prop as any).default;
                }

                if (
                    typeof prop === 'object' &&
                    prop !== null &&
                    (prop as any).type === 'object'
                ) {
                    log.debug(`Processing nested object property '${key}'`, {
                        propertyType: (prop as any).type,
                        hasNestedProperties: Boolean((prop as any).properties),
                        nestedPropertiesCount: (prop as any).properties ? Object.keys((prop as any).properties).length : 0
                    });

                    // Recursively process nested object schemas
                    properties[key] = this.prepareParametersForOpenAIResponse(prop as Record<string, unknown>);
                }
            }
        }

        log.debug('Prepared parameters result', {
            type: preparedParams.type,
            propertiesCount: preparedParams.properties ? Object.keys(preparedParams.properties as Record<string, unknown>).length : 0,
            requiredCount: preparedParams.required ? (preparedParams.required as string[]).length : 0,
            hasAdditionalProperties: preparedParams.additionalProperties
        });

        return preparedParams;
    }
}