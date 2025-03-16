import { UniversalChatParams } from '../../interfaces/UniversalInterfaces';
import { AdapterError } from '../base/baseAdapter';

export class Validator {
    validateParams(params: UniversalChatParams): void {
        if (!params.messages || !Array.isArray(params.messages) || params.messages.length === 0) {
            throw new AdapterError('Messages array is required and cannot be empty');
        }

        for (const message of params.messages) {
            if (!message.role) {
                throw new AdapterError('Each message must have a role');
            }

            // Allow empty content only if message has tool calls
            if (!message.content && !message.toolCalls) {
                throw new AdapterError('Each message must have either content or tool calls');
            }

            if (!['system', 'user', 'assistant', 'function', 'tool'].includes(message.role)) {
                throw new AdapterError('Invalid message role. Must be one of: system, user, assistant, function, tool');
            }
            if (message.role === 'function' && !message.name) {
                throw new AdapterError('Function messages must have a name');
            }
        }

        // Validate settings if present
        if (params.settings) {
            const { temperature, maxTokens, topP, frequencyPenalty, presencePenalty } = params.settings;

            if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
                throw new AdapterError('Temperature must be between 0 and 2');
            }

            if (maxTokens !== undefined && maxTokens <= 0) {
                throw new AdapterError('Max tokens must be greater than 0');
            }

            if (topP !== undefined && (topP < 0 || topP > 1)) {
                throw new AdapterError('Top P must be between 0 and 1');
            }

            if (frequencyPenalty !== undefined && (frequencyPenalty < -2 || frequencyPenalty > 2)) {
                throw new AdapterError('Frequency penalty must be between -2 and 2');
            }

            if (presencePenalty !== undefined && (presencePenalty < -2 || presencePenalty > 2)) {
                throw new AdapterError('Presence penalty must be between -2 and 2');
            }
        }
    }
} 