import { OpenAI } from 'openai';
import type { UniversalChatParams, ReasoningEffort } from '../../interfaces/UniversalInterfaces.ts';
import { OpenAIResponseValidationError } from './errors.ts';
import { logger } from '../../utils/logger.ts';
import type { ToolDefinition } from '../../types/tooling.ts';
import { ModelManager } from '../../core/models/ModelManager.ts';

// Import necessary native types from the Responses namespace
type Tool = OpenAI.Responses.Tool;

export class Validator {
    private modelManager?: ModelManager;

    constructor(modelManager?: ModelManager) {
        this.modelManager = modelManager;
    }

    /**
     * Validates the parameters passed to the adapter (Universal Format)
     * @param params Universal chat parameters to validate
     * @throws OpenAIResponseValidationError if validation fails
     */
    validateParams(params: UniversalChatParams): void {
        // Basic validation for universal required fields
        if (!params.messages || params.messages.length === 0) {
            throw new OpenAIResponseValidationError('At least one message is required');
        }

        // Model validation remains the same as it's part of UniversalChatParams
        if (!params.model || params.model.trim() === '') {
            throw new OpenAIResponseValidationError('Model name is required');
        }

        // Check if model has reasoning capability
        const hasReasoningCapability = this.modelManager?.getModel(params.model)?.capabilities?.reasoning || false;

        // Validate reasoning settings if present
        if (params.settings?.reasoning) {
            // Validate reasoning is only used with reasoning-capable models
            if (!hasReasoningCapability) {
                throw new OpenAIResponseValidationError('Reasoning settings can only be used with reasoning-capable models');
            }

            // Validate reasoning effort values
            if (params.settings.reasoning.effort !== undefined) {
                const validEfforts: ReasoningEffort[] = ['minimal', 'low', 'medium', 'high'];
                if (!validEfforts.includes(params.settings.reasoning.effort)) {
                    throw new OpenAIResponseValidationError(
                        `Reasoning effort must be one of: ${validEfforts.join(', ')}`
                    );
                }
            }
        }

        // For reasoning-capable models, ignore temperature and warn instead of throwing
        if (hasReasoningCapability && params.settings?.temperature !== undefined) {
            const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.Validator' });
            log.warn('Temperature provided for reasoning-capable model; ignoring.', {
                model: params.model,
                temperature: params.settings.temperature
            });
            // Remove temperature so it is not sent to the provider
            if (params.settings) {
                delete (params.settings as { temperature?: number }).temperature;
            }
        }

        // Settings validation for non-reasoning models
        if (!hasReasoningCapability) {
            if (
                params.settings?.temperature !== undefined &&
                (params.settings.temperature < 0 || params.settings.temperature > 2)
            ) {
                throw new OpenAIResponseValidationError('Temperature must be between 0 and 2');
            }
        }

        if (
            params.settings?.topP !== undefined &&
            (params.settings.topP < 0 || params.settings.topP > 1)
        ) {
            throw new OpenAIResponseValidationError('Top P must be between 0 and 1');
        }
        if (
            params.settings?.maxTokens !== undefined &&
            params.settings.maxTokens <= 0
        ) {
            throw new OpenAIResponseValidationError('Max tokens must be greater than 0');
        }

        // Validate tools if provided (using Universal format - ToolDefinition)
        if (params.tools) {
            this.validateUniversalTools(params.tools);
        }

        // Add specific validations related to the OpenAI /v1/responses structure if needed,
        // although most are handled by the SDK itself or during conversion.
        // Example: Check for conflicting settings if any are specific to this endpoint.
    }

    /**
     * Validates tools configuration in the Universal (ToolDefinition) format.
     * @param tools Array of tool definitions (Universal format) to validate
     * @throws OpenAIResponseValidationError if validation fails
     */
    private validateUniversalTools(tools: Array<ToolDefinition>): void {
        if (!Array.isArray(tools)) {
            throw new OpenAIResponseValidationError('Tools must be an array');
        }

        for (const tool of tools) {
            // Validate basic properties of ToolDefinition
            if (!tool.name) {
                throw new OpenAIResponseValidationError('Tool must have a name');
            }
            if (!tool.parameters) {
                throw new OpenAIResponseValidationError('Tool must have parameters');
            }
            // Check parameters structure (simple check, more complex schema validation is possible)
            if (tool.parameters.type !== 'object') {
                // Allow missing type if properties exist, default to object
                if (!tool.parameters.properties) {
                    throw new OpenAIResponseValidationError(`Tool ${tool.name} parameters must be of type 'object' or have properties defined`);
                }
            }
            if (!tool.parameters.properties) {
                // Allow empty properties if type is object, but log warning
                if (tool.parameters.type === 'object') {
                    // console.warn(`Tool ${tool.name} has type 'object' but no properties defined.`);
                } else {
                    throw new OpenAIResponseValidationError(`Tool ${tool.name} must have parameters.properties`);
                }
            }
            // Validate required parameters exist in properties
            if (tool.parameters.required && tool.parameters.properties) {
                for (const requiredParam of tool.parameters.required) {
                    if (!tool.parameters.properties[requiredParam]) {
                        throw new OpenAIResponseValidationError(`Required parameter ${requiredParam} not found in properties for tool ${tool.name}`);
                    }
                }
            }
            // Add more checks if needed (e.g., description presence, specific property types)
        }
    }

    /**
     * Validates that the tools are properly configured for OpenAI Response API
     */
    validateTools(tools?: ToolDefinition[]): void {
        if (!tools || !Array.isArray(tools) || tools.length === 0) {
            return;
        }

        tools.forEach((tool, index) => {
            if (!tool.name) {
                throw new OpenAIResponseValidationError(`Tool at index ${index} is missing 'name' property`);
            }

            if (!tool.parameters) {
                throw new OpenAIResponseValidationError(`Tool ${tool.name} is missing 'parameters' property`);
            }

            if (tool.parameters.type !== 'object') {
                throw new OpenAIResponseValidationError(`Tool ${tool.name} parameters must have type 'object'`);
            }

            if (!tool.parameters.properties) {
                throw new OpenAIResponseValidationError(`Tool ${tool.name} parameters must have 'properties' defined`);
            }

            // Validate each parameter has the required fields
            for (const paramName in tool.parameters.properties) {
                const param = tool.parameters.properties[paramName] as Record<string, unknown>;
                if (!param.type) {
                    throw new OpenAIResponseValidationError(`Parameter ${paramName} in tool ${tool.name} is missing 'type' property`);
                }
            }

            // Check for required parameters that don't exist in properties
            if (tool.parameters.required && Array.isArray(tool.parameters.required)) {
                for (const requiredParam of tool.parameters.required) {
                    if (!tool.parameters.properties[requiredParam]) {
                        throw new OpenAIResponseValidationError(`Tool ${tool.name} lists '${requiredParam}' as required but it's not defined in properties`);
                    }
                }
            }
        });
    }

    // Note: A validateNativeTools method could be added if needed to validate
    // the structure *after* conversion to OpenAI.Responses.Tool,
    // but often the SDK handles this. Example:
    /*
    private validateNativeTools(tools: Array<Tool>): void {
        for (const tool of tools) {
            if (tool.type === 'function') {
                const functionTool = tool as OpenAI.Responses.FunctionTool;
                if (!functionTool.name || !functionTool.parameters) {
                    throw new OpenAIResponseValidationError('Invalid native function tool structure');
                }
                // Add more native structure checks...
            }
        }
    }
    */
} 