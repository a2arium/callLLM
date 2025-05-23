import { z } from 'zod';
import { logger } from '../../utils/logger.ts';
import type { ToolDefinition } from '../../types/tooling.ts';
import type {
    Usage,
    ImageCallParams,
    GeneratedImage,
    ImageGenerationResult,
    ImageSource
} from '../../interfaces/UniversalInterfaces.ts';

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

    /**
     * Estimate image tokens for usage tracking based on resolution
     * @param size Image size/resolution
     * @param isInput Whether this is for input (true) or output (false)
     * @returns Estimated token count
     */
    estimateImageTokens(size: string, count: number = 1, isInput: boolean = true): number {
        // Based on OpenAI's pricing structure for DALL-E model:
        // https://openai.com/pricing
        const sizeTokens: Record<string, number> = {
            '256x256': 500,
            '512x512': 700,
            '1024x1024': 1000,
            '1024x1792': 1300,
            '1792x1024': 1300,
        };

        // Use the specified size or default to 1024x1024
        const tokensPerImage = sizeTokens[size] || 1000;

        // Input images generally cost less than output, adjust accordingly
        const multiplier = isInput ? 0.8 : 1.0;

        return Math.round(tokensPerImage * count * multiplier);
    }

    /**
     * Format usage data from image generation/editing operations
     * @param size Image size
     * @param count Number of images
     * @param operationType Type of operation ('generation', 'edit', or 'variation')
     * @returns Formatted usage data
     */
    formatImageUsage(size: string, count: number = 1, operationType: 'generation' | 'edit' | 'variation'): Usage {
        const inputTokens = operationType !== 'generation' ? this.estimateImageTokens(size, count, true) : 0;
        const outputTokens = this.estimateImageTokens(size, count, false);

        return {
            tokens: {
                input: {
                    total: inputTokens,
                    cached: 0,
                    ...(inputTokens > 0 ? { image: inputTokens } : {})
                },
                output: {
                    total: outputTokens,
                    reasoning: 0,
                    image: outputTokens
                },
                total: inputTokens + outputTokens
            },
            costs: {
                input: {
                    total: 0, // Would need pricing info to calculate accurately
                    cached: 0
                },
                output: {
                    total: 0, // Would need pricing info to calculate accurately
                    reasoning: 0,
                    image: 0  // Would need pricing info to calculate accurately
                },
                total: 0 // Would need pricing info to calculate accurately
            }
        };
    }
} 