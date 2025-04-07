import { UniversalMessage, ModelInfo } from '../../interfaces/UniversalInterfaces';
import { TokenCalculator } from '../models/TokenCalculator';
import { logger } from '../../utils/logger';

/**
 * A utility class for intelligently truncating conversation history
 * to fit within a model's token limits.
 */
export class HistoryTruncator {
    // A small buffer to account for token count estimation inaccuracies
    private static readonly TOKEN_BUFFER = 50;

    // Truncation notice message to inform the user that history has been truncated
    private static readonly TRUNCATION_NOTICE: UniversalMessage = {
        role: 'assistant',
        content: '[History truncated due to context limit]'
    };

    private tokenCalculator: TokenCalculator;

    /**
     * Creates a new instance of HistoryTruncator
     * 
     * @param tokenCalculator - The token calculator to use for token counting
     */
    constructor(tokenCalculator: TokenCalculator) {
        this.tokenCalculator = tokenCalculator;
    }

    /**
     * Truncates the message history to fit within the model's token limits.
     * 
     * The truncation algorithm preserves:
     * 1. The system message (if present)
     * 2. The first user message
     * 3. The most recent messages that fit within the token limit
     * 4. Always includes the last user message (current query)
     * 
     * @param messages - The array of messages to truncate
     * @param modelInfo - Information about the model being used
     * @param maxResponseTokens - The maximum number of tokens to reserve for the response
     * @returns The truncated array of messages
     */
    public truncate(
        messages: UniversalMessage[],
        modelInfo: ModelInfo,
        maxResponseTokens?: number
    ): UniversalMessage[] {
        const log = logger.createLogger({ prefix: 'HistoryTruncator.truncate' });

        if (!messages.length) {
            return [];
        }

        // Use model's maxResponseTokens if not provided
        const responseTokens = maxResponseTokens || modelInfo.maxResponseTokens;

        // Define key messages
        const systemMessage = messages.find(msg => msg.role === 'system');
        log.debug('System message: ', systemMessage);
        // Find the first user message (or first message if no user message)
        const firstUserIndex = messages.findIndex(msg => msg.role === 'user');
        const firstUserMessage = firstUserIndex >= 0
            ? messages[firstUserIndex]
            : (messages.length > 0 && messages[0].role !== 'system' ? messages[0] : null);

        // Find the latest user message (current query)
        const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');

        // If we have only a single message, return it immediately
        if (messages.length === 1) {
            return [...messages];
        }

        // Calculate tokens for essential messages
        const systemTokens = systemMessage
            ? this.tokenCalculator.calculateTokens(systemMessage.content)
            : 0;

        const firstUserTokens = firstUserMessage
            ? this.tokenCalculator.calculateTokens(firstUserMessage.content)
            : 0;

        const lastUserTokens = lastUserMessage && lastUserMessage !== firstUserMessage
            ? this.tokenCalculator.calculateTokens(lastUserMessage.content)
            : 0;

        const truncationNoticeTokens = this.tokenCalculator.calculateTokens(
            HistoryTruncator.TRUNCATION_NOTICE.content
        );

        // Calculate base tokens (required messages + response + buffer)
        const baseTokens = systemTokens + firstUserTokens + lastUserTokens + truncationNoticeTokens +
            responseTokens + HistoryTruncator.TOKEN_BUFFER;

        // Calculate available tokens for the rest of the conversation
        const availableTokens = modelInfo.maxRequestTokens - baseTokens;
        log.debug('Available tokens: ', availableTokens);

        // If we don't have enough tokens even for the base messages, return minimal context
        if (availableTokens <= 0) {
            log.debug('Not enough tokens, returning minimal context');
            const result: UniversalMessage[] = [];

            if (systemMessage) {
                result.push(systemMessage);
            }

            result.push(HistoryTruncator.TRUNCATION_NOTICE);

            if (firstUserMessage && firstUserMessage !== systemMessage) {
                result.push(firstUserMessage);
            }

            if (lastUserMessage && lastUserMessage !== firstUserMessage && lastUserMessage !== systemMessage) {
                result.push(lastUserMessage);
            }

            return result;
        }

        // Build a message list without the essential messages
        // as we'll add them separately
        const messagesToConsider = messages.filter(msg =>
            msg !== systemMessage &&
            msg !== firstUserMessage &&
            msg !== lastUserMessage
        );

        // Start from the most recent messages and work backwards
        const reversedMessages = [...messagesToConsider].reverse();
        const fittingMessages: UniversalMessage[] = [];
        let remainingTokens = availableTokens;

        for (const message of reversedMessages) {
            const messageTokens = this.tokenCalculator.calculateTokens(message.content);

            if (messageTokens <= remainingTokens) {
                fittingMessages.push(message);
                remainingTokens -= messageTokens;
            } else {
                // No more messages will fit
                break;
            }
        }

        // Build the final result
        const result: UniversalMessage[] = [];

        // Add system message if present
        if (systemMessage) {
            result.push(systemMessage);
        }

        log.debug('Fitting messages length: ', fittingMessages.length);
        log.debug('Messages to consider length: ', messagesToConsider.length);

        // Add truncation notice if any messages were truncated
        if (fittingMessages.length < messagesToConsider.length) {
            result.push(HistoryTruncator.TRUNCATION_NOTICE);
        }

        // Add first user message if not already included
        if (firstUserMessage && firstUserMessage !== systemMessage) {
            result.push(firstUserMessage);
        }

        // Add the remaining messages in the correct order
        result.push(...fittingMessages.reverse());

        // Always add the last user message (if it's not already included)
        if (lastUserMessage &&
            lastUserMessage !== firstUserMessage &&
            !result.includes(lastUserMessage)) {
            result.push(lastUserMessage);
        }

        return result;
    }
} 