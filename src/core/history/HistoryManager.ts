import { UniversalMessage } from '../../interfaces/UniversalInterfaces';
import { logger } from '../../utils/logger';

/**
 * Manages conversation history for LLM interactions
 */
export class HistoryManager {
    private historicalMessages: UniversalMessage[] = [];
    private systemMessage: string;

    /**
     * Creates a new HistoryManager
     * @param systemMessage Optional system message to initialize the history with
     */
    constructor(systemMessage?: string) {
        const log = logger.createLogger({ prefix: 'HistoryManager.constructor' });
        log.debug('Initializing HistoryManager with system message:', systemMessage);

        this.systemMessage = systemMessage || '';

        logger.setConfig({
            level: process.env.LOG_LEVEL as any || 'info',
            prefix: 'HistoryManager'
        });

        // Initialize with system message if provided
        if (this.systemMessage) {
            this.initializeWithSystemMessage();
        }
    }

    /**
     * Initializes the history with the system message
     */
    public initializeWithSystemMessage(): void {
        const log = logger.createLogger({ prefix: 'HistoryManager.initializeWithSystemMessage' });
        log.debug('Initializing history with system message:', this.systemMessage);
        // Clear any existing history first to avoid duplication
        this.clearHistory();
        if (this.systemMessage) {
            // Add the system message as the first message
            this.addMessage('system', this.systemMessage);
        }
    }

    /**
     * Gets the current historical messages
     * @returns Array of validated historical messages
     */
    public getHistoricalMessages(): UniversalMessage[] {
        // Return a copy of messages array with validation applied
        return this.historicalMessages.map(msg => this.validateMessage(msg)).filter(msg => msg !== null);
    }

    /**
     * Validates a message to ensure it meets LLM API requirements
     * @param msg The message to validate
     * @returns A validated, normalized message object
     */
    private validateMessage(msg: UniversalMessage): UniversalMessage | null {

        // If message has neither content nor tool calls, provide default content
        const hasValidContent = msg.content && msg.content.trim().length > 0;
        const hasToolCalls = msg.toolCalls && msg.toolCalls.length > 0;

        if (!hasValidContent && !hasToolCalls) return null;

        const base = {
            role: msg.role || 'user',
            content: hasValidContent || hasToolCalls ? (msg.content || '') : ''
        };

        if (msg.toolCalls) {
            return { ...base, toolCalls: msg.toolCalls };
        }
        if (msg.toolCallId) {
            return { ...base, toolCallId: msg.toolCallId };
        }
        return base;
    }

    /**
     * Adds a message to the historical messages
     * @param role The role of the message sender (user, assistant, system, tool)
     * @param content The content of the message
     * @param additionalFields Additional fields to include in the message
     */
    public addMessage(
        role: 'user' | 'assistant' | 'system' | 'tool' | 'function' | 'developer',
        content: string,
        additionalFields?: Partial<UniversalMessage>
    ): void {
        const message = {
            role,
            content,
            ...additionalFields
        };

        const validatedMessage = this.validateMessage(message);
        logger.debug('Adding message to history: ', validatedMessage);
        if (validatedMessage) this.historicalMessages.push(validatedMessage);
    }

    /**
     * Clears all historical messages
     */
    public clearHistory(): void {
        this.historicalMessages = [];
    }

    /**
     * Sets the historical messages
     * @param messages The messages to set
     */
    public setHistoricalMessages(messages: UniversalMessage[]): void {
        // Validate all messages as they're being set
        this.historicalMessages = messages.map(msg => this.validateMessage(msg)).filter(msg => msg !== null);
    }

    /**
     * Gets the last message of a specific role
     * @param role The role to filter by
     * @returns The last message with the specified role, or undefined if none exists
     */
    public getLastMessageByRole(
        role: 'user' | 'assistant' | 'system' | 'tool' | 'function' | 'developer'
    ): UniversalMessage | undefined {
        for (let i = this.historicalMessages.length - 1; i >= 0; i--) {
            if (this.historicalMessages[i].role === role) {
                const validatedMessage = this.validateMessage(this.historicalMessages[i]);
                if (validatedMessage) return validatedMessage;
            }
        }
        return undefined;
    }

    /**
     * Gets the last n messages from the history
     * @param count The number of messages to return
     * @returns The last n messages
     */
    public getLastMessages(count: number): UniversalMessage[] {
        return this.historicalMessages.slice(-count);
    }

    /**
     * Serializes the message history to a JSON string
     * @returns A JSON string representation of the message history
     */
    public serializeHistory(): string {
        return JSON.stringify(this.historicalMessages);
    }

    /**
     * Deserializes a JSON string into message history and replaces the current history
     * @param serialized JSON string containing serialized message history
     */
    public deserializeHistory(serialized: string): void {
        try {
            const messages = JSON.parse(serialized) as UniversalMessage[];
            this.setHistoricalMessages(messages);
        } catch (e) {
            throw new Error(`Failed to deserialize history: ${e}`);
        }
    }

    /**
     * Updates the system message and reinitializes history if requested
     * @param systemMessage The new system message
     * @param preserveHistory Whether to preserve the existing history (default: true)
     */
    public updateSystemMessage(systemMessage: string, preserveHistory = true): void {
        this.systemMessage = systemMessage;

        if (preserveHistory) {
            // If we have history and the first message is a system message, update it
            if (this.historicalMessages.length > 0 && this.historicalMessages[0].role === 'system') {
                const validatedMessage = this.validateMessage({
                    role: 'system',
                    content: systemMessage
                });
                if (validatedMessage) this.historicalMessages[0] = validatedMessage;
            } else {
                const validatedMessage = this.validateMessage({
                    role: 'system',
                    content: systemMessage
                });

                // Insert system message at the beginning
                if (validatedMessage) this.historicalMessages.unshift(validatedMessage);
            }
        } else {
            // Reinitialize with just the system message
            this.initializeWithSystemMessage();
        }
    }

    /**
     * Adds a tool call to the historical messages
     * @param toolName Name of the tool
     * @param args Arguments passed to the tool
     * @param result Result returned by the tool
     * @param error Error from tool execution, if any
     */
    public addToolCallToHistory(
        toolName: string,
        args: Record<string, unknown>,
        result?: string,
        error?: string
    ): void {
        // Generate a tool call ID
        const toolCallId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        // Add assistant message with tool call
        const assistantMessage: UniversalMessage = {
            role: 'assistant',
            content: '', // Empty content is valid for tool calls
            toolCalls: [{
                id: toolCallId,
                name: toolName,
                arguments: args
            }]
        };
        const validatedMessage = this.validateMessage(assistantMessage);
        if (validatedMessage) this.historicalMessages.push(validatedMessage);

        // Add tool result message if we have a result
        if (result) {
            const toolMessage: UniversalMessage = {
                role: 'tool',
                content: result,
                toolCallId
            };
            const validatedMessage = this.validateMessage(toolMessage);
            if (validatedMessage) this.historicalMessages.push(validatedMessage);
        }

        // If there was an error, add a system message with the error
        if (error) {
            const errorMessage: UniversalMessage = {
                role: 'system',
                content: `Error executing tool ${toolName}: ${error}`
            };
            const validatedMessage = this.validateMessage(errorMessage);
            if (validatedMessage) this.historicalMessages.push(validatedMessage);
        }
    }

    /**
     * Gets a condensed summary of the conversation history
     * @param options Options for customizing the summary
     * @returns A summary of the conversation history
     */
    public getHistorySummary(options: {
        includeSystemMessages?: boolean;
        maxContentLength?: number;
        includeToolCalls?: boolean;
    } = {}): Array<{
        role: string;
        contentPreview: string;
        hasToolCalls: boolean;
        timestamp?: number;
    }> {
        const {
            includeSystemMessages = false,
            maxContentLength = 50,
            includeToolCalls = true
        } = options;

        return this.historicalMessages
            .filter(msg => includeSystemMessages || msg.role !== 'system')
            .map(msg => {
                // Create content preview with limited length
                let contentPreview = msg.content || '';
                if (contentPreview.length > maxContentLength) {
                    contentPreview = contentPreview.substring(0, maxContentLength) + '...';
                }

                // Check if the message has tool calls
                const hasToolCalls = Boolean(msg.toolCalls && msg.toolCalls.length > 0);

                // Extract timestamp from metadata if available
                const timestamp = msg.metadata?.timestamp as number | undefined;

                // Add tool call information if requested
                let result: {
                    role: string;
                    contentPreview: string;
                    hasToolCalls: boolean;
                    timestamp?: number;
                    toolCalls?: Array<{
                        name: string;
                        args: Record<string, unknown>;
                    }>;
                } = {
                    role: msg.role,
                    contentPreview,
                    hasToolCalls,
                    timestamp
                };

                // Include tool calls if requested and available
                if (includeToolCalls && hasToolCalls && msg.toolCalls) {
                    result.toolCalls = msg.toolCalls.map(tc => {
                        // Check whether we have a ToolCall object or OpenAI format
                        if ('name' in tc && 'arguments' in tc) {
                            // Our ToolCall format
                            return {
                                name: tc.name,
                                args: tc.arguments
                            };
                        } else if (tc.function) {
                            // OpenAI format with function property
                            return {
                                name: tc.function.name,
                                args: this.safeJsonParse(tc.function.arguments)
                            };
                        }
                        // Fallback
                        return {
                            name: 'unknown',
                            args: {}
                        };
                    });
                }

                return result;
            });
    }

    /**
     * Gets all messages including the system message
     * @returns Array of all messages including the initial system message
     */
    public getMessages(): UniversalMessage[] {
        // Return all messages including the system message
        // The system message should already be included in historicalMessages
        // if it was added during initialization or updateSystemMessage
        return this.getHistoricalMessages();
    }

    /**
     * Captures content from a stream response and stores the final response in history
     * @param content The content from the stream response
     * @param isComplete Whether this is the final chunk
     * @param contentText The complete text content if available
     */
    public captureStreamResponse(
        content: string,
        isComplete: boolean,
        contentText?: string
    ): void {
        // If this is the last chunk, add the complete response to history
        if (isComplete && (content || contentText)) {
            this.addMessage('assistant', contentText || content);
        }
    }

    private safeJsonParse(jsonString: string): Record<string, unknown> {
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.error(`Error parsing JSON: ${e}`);
            return {};
        }
    }

    /**
     * Removes any assistant messages with tool calls that don't have matching tool responses
     * This helps prevent issues with historical tool calls that OpenAI expects responses for
     * @returns The number of assistant messages with unmatched tool calls that were removed
     */
    public removeToolCallsWithoutResponses(): number {
        // First, collect all tool call IDs that have responses
        const respondedToolCallIds = new Set<string>();

        // Find all tool responses
        this.historicalMessages.forEach(msg => {
            if (msg.role === 'tool' && msg.toolCallId) {
                respondedToolCallIds.add(msg.toolCallId);
            }
        });

        // Identify and remove assistant messages with unmatched tool calls
        const messagesToRemove: number[] = [];

        this.historicalMessages.forEach((msg, index) => {
            if (
                msg.role === 'assistant' &&
                msg.toolCalls &&
                msg.toolCalls.length > 0
            ) {
                // Check if any tool calls in this message are missing responses
                const hasUnmatchedCalls = msg.toolCalls.some(toolCall => {
                    const id = 'id' in toolCall ? toolCall.id : undefined;
                    // If ID exists and isn't in the responded set, it's unmatched
                    return id && !respondedToolCallIds.has(id);
                });

                if (hasUnmatchedCalls) {
                    messagesToRemove.push(index);
                }
            }
        });

        // Remove the problematic messages (from highest index to lowest to avoid shifting issues)
        for (let i = messagesToRemove.length - 1; i >= 0; i--) {
            this.historicalMessages.splice(messagesToRemove[i], 1);
        }

        logger.debug(`Removed ${messagesToRemove.length} assistant messages with unmatched tool calls`);
        return messagesToRemove.length;
    }
} 