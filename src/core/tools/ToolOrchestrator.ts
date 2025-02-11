import { ToolController } from './ToolController';
import { ChatController } from '../chat/ChatController';
import type { UniversalChatResponse, UniversalMessage } from '../../interfaces/UniversalInterfaces';

export class ToolOrchestrator {
    constructor(
        private toolController: ToolController,
        private chatController: ChatController
    ) { }

    async processResponse(
        response: UniversalChatResponse,
        params: {
            model: string;
            systemMessage: string;
            historicalMessages?: UniversalMessage[];
            settings?: Record<string, unknown>;
        }
    ): Promise<UniversalChatResponse> {
        const content = response.content as string;
        const toolResult = await this.toolController.processToolCalls(content);

        // If no tool calls were found or processed, return the original response
        if (!toolResult.requiresResubmission) {
            return response;
        }

        // Add tool messages to historical messages
        const updatedHistoricalMessages = [
            ...(params.historicalMessages || []),
            { role: 'assistant' as const, content },
            ...toolResult.messages
        ];

        // Make a new chat call with the updated context
        const newResponse = await this.chatController.execute({
            model: params.model,
            systemMessage: params.systemMessage,
            message: 'Please continue based on the tool execution results above.',
            settings: params.settings,
            historicalMessages: updatedHistoricalMessages
        });

        // Reset tool iteration count after successful processing
        this.toolController.resetIterationCount();

        return newResponse;
    }
} 