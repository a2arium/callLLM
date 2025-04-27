import { z } from 'zod';
import { logger } from '../../utils/logger';
import { ToolDefinition } from '../../types/tooling';

export class OpenAIResponseAdapter {
    formatToolsForNative(tools: ToolDefinition[]): any[] {
        const log = logger.createLogger({ prefix: 'OpenAIResponseAdapter.formatToolsForNative' });
        log.debug(`Formatting ${tools.length} tools for OpenAI native format`);

        return tools.map(tool => {
            // Log the incoming tool definition
            log.debug(`Formatting tool for OpenAI`, {
                name: tool.name,
                originalName: tool.metadata?.originalName,
                hasParameters: Boolean(tool.parameters),
                requiredParams: tool.parameters?.required || []
            });

            // Format the tool for OpenAI
            const formattedTool = {
                type: 'function',
                name: tool.name,
                parameters: {
                    type: 'object',
                    properties: tool.parameters?.properties || {},
                    ...(tool.parameters?.required && { required: tool.parameters.required }),
                    additionalProperties: false
                },
                description: tool.description,
                strict: true
            };

            // Check for potential issues with the parameters
            if (Object.keys(formattedTool.parameters.properties).length === 0) {
                log.warn(`Tool has empty properties object: ${tool.name}`, {
                    originalParameters: tool.parameters
                });
            }

            if (tool.parameters?.required?.length &&
                !tool.parameters.required.every(param => param in (tool.parameters.properties || {}))) {
                const missingProps = tool.parameters.required.filter(
                    param => !(param in (tool.parameters.properties || {}))
                );
                log.warn(`Tool has required params not in properties: ${tool.name}`, {
                    missingProperties: missingProps
                });
            }

            log.debug(`Formatted tool ${tool.name}`, {
                formattedName: formattedTool.name,
                parametersType: formattedTool.parameters.type,
                propertiesCount: Object.keys(formattedTool.parameters.properties).length,
                requiredParams: formattedTool.parameters.required || 'none'
            });

            return formattedTool;
        });
    }
} 