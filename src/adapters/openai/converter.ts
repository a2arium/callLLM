import { OpenAI } from 'openai'; // Import OpenAI namespace
import { UniversalChatParams, UniversalChatResponse, UniversalMessage, FinishReason, Usage, ModelCapabilities, ReasoningEffort } from '../../interfaces/UniversalInterfaces';
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

export class Converter {
    private modelManager: ModelManager;

    constructor(modelManager: ModelManager) {
        this.modelManager = modelManager;
    }

    /**
     * Converts UniversalChatParams to OpenAI Response API parameters (native types)
     * @param model The model name to use
     * @param params Universal chat parameters
     * @returns Parameters formatted for the OpenAI Response API (native type)
     */
    convertToOpenAIResponseParams(model: string, params: UniversalChatParams): Partial<ResponseCreateParams> { // Return partial native type
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

            // Add additionalProperties: false to the parameters and any nested object schemas
            const parameters = this.prepareParametersForOpenAIResponse(toolDef.parameters);

            // Map to the native FunctionTool structure
            const openAITool: FunctionTool = {
                type: 'function',
                name: toolDef.name,
                parameters,
                description: toolDef.description || undefined,
                strict: true
            };
            log.debug(`Formatted tool ${toolDef.name} for OpenAI native:`, openAITool);
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
            // Standard behavior for non-reasoning models
            input = params.messages.map(message => ({
                role: this.transformRoleToOpenAIResponseRole(message.role),
                content: message.content
            }));
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
                effort: params.settings.reasoning.effort || 'medium',

            };
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
                        log.warn('Failed to parse JSON schema string');
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
        if (params.settings?.providerOptions?.metadata) {
            openAIParams.metadata = params.settings.providerOptions.metadata as Record<string, string>;
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
            universalResponse.metadata.usage = {
                tokens: {
                    input: {
                        total: response.usage.input_tokens || 0,
                        cached: response.usage.input_tokens_details?.cached_tokens || 0,
                    },
                    output: {
                        total: response.usage.output_tokens || 0,
                        reasoning: response.usage.output_tokens_details?.reasoning_tokens || 0,
                    },
                    total: response.usage.total_tokens || 0
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
        }

        // Process output items from native structure
        const toolCalls: ToolCall[] = [];
        let textContent = '';

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

            // Process each property that might be an object schema
            for (const key in properties) {
                const prop = properties[key];
                if (
                    typeof prop === 'object' &&
                    prop !== null &&
                    (prop as any).type === 'object'
                ) {
                    // Recursively process nested object schemas
                    properties[key] = this.prepareParametersForOpenAIResponse(prop as Record<string, unknown>);
                }
            }
        }

        return preparedParams;
    }
} 