import type { ToolDefinition, ToolsManager } from '../types';
import type { UniversalMessage } from '../../interfaces/UniversalInterfaces';

export class ToolController {
    private toolsManager: ToolsManager;
    private iterationCount: number = 0;
    private maxIterations: number;

    constructor(toolsManager: ToolsManager, maxIterations: number = 5) {
        this.toolsManager = toolsManager;
        this.maxIterations = maxIterations;
    }

    async processToolCalls(content: string) {
        if (this.iterationCount >= this.maxIterations) {
            throw new Error(`Tool call iteration limit (${this.maxIterations}) exceeded`);
        }
        this.iterationCount++;

        const toolCalls: { name: string; parameters: Record<string, unknown>; error?: string }[] = [];
        const messages: UniversalMessage[] = [];
        const toolCallRegex = /<tool>([^:]+):([^<]+)<\/tool>/g;
        let requiresResubmission = false;

        let match;
        while ((match = toolCallRegex.exec(content)) !== null) {
            const toolCall = {
                name: match[1],
                parameters: {}
            };

            try {
                toolCall.parameters = JSON.parse(match[2]);
            } catch {
                // If JSON parsing fails, use empty object as parameters
            }

            const tool = this.toolsManager.getTool(toolCall.name);
            if (!tool) {
                const error = `Tool '${toolCall.name}' not found`;
                messages.push({
                    role: 'system',
                    content: `Error: ${error}`
                });
                toolCalls.push({ ...toolCall, error });
                continue;
            }

            try {
                const result = await tool.callFunction(toolCall.parameters);
                let processedMessages: string[];

                if (tool.postCallLogic) {
                    processedMessages = await tool.postCallLogic(result);
                } else {
                    processedMessages = [typeof result === 'string' ? result : JSON.stringify(result)];
                }

                messages.push(...processedMessages.map(content => ({
                    role: 'function' as const,
                    content,
                    name: toolCall.name
                })));

                toolCalls.push(toolCall);
                requiresResubmission = true;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                messages.push({
                    role: 'system',
                    content: `Error executing tool '${toolCall.name}': ${errorMessage}`
                });
                toolCalls.push({ ...toolCall, error: errorMessage });
            }
        }

        return {
            messages,
            toolCalls,
            requiresResubmission
        };
    }

    resetIterationCount() {
        this.iterationCount = 0;
    }
} 