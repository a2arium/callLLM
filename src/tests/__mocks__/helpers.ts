import { MessagePart, toMessageParts, UniversalMessage } from "../../interfaces/UniversalInterfaces.js";

/**
 * Helper function to work with UniversalMessage content
 * This maintains the original string content, as required by the interface
 */
export function fixMessageContent(message: UniversalMessage): UniversalMessage {
    return {
        ...message,
        // Keep content as string to satisfy the interface
        content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
    };
}

/**
 * Helper function to convert an array of messages with string content to MessagePart[]
 */
export function fixMessagesContent(messages: UniversalMessage[]): UniversalMessage[] {
    return messages.map(fixMessageContent);
} 