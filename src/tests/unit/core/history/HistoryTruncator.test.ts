import { jest } from '@jest/globals';
import { HistoryTruncator } from '../../../../core/history/HistoryTruncator';
import { TokenCalculator } from '../../../../core/models/TokenCalculator';
import { ModelInfo, UniversalMessage } from '../../../../interfaces/UniversalInterfaces';

describe('HistoryTruncator', () => {
    let mockTokenCalculator: TokenCalculator;
    let historyTruncator: HistoryTruncator;

    // Sample model info for testing
    const testModelInfo: ModelInfo = {
        name: 'test-model',
        inputPricePerMillion: 1000,
        outputPricePerMillion: 2000,
        maxRequestTokens: 4000,
        maxResponseTokens: 2000,
        characteristics: {
            qualityIndex: 80,
            outputSpeed: 100,
            firstTokenLatency: 0.5
        }
    };

    beforeEach(() => {
        // Create a mock token calculator
        mockTokenCalculator = {
            calculateTokens: jest.fn().mockReturnValue(10),
            calculateTotalTokens: jest.fn().mockReturnValue(50),
            calculateUsage: jest.fn()
        } as unknown as TokenCalculator;

        // Create the history truncator instance
        historyTruncator = new HistoryTruncator(mockTokenCalculator);
    });

    // Helper function to create a message
    function createMessage(role: 'system' | 'user' | 'assistant', content: string): UniversalMessage {
        return { role, content };
    }

    it('should return empty array when input is empty', () => {
        const result = historyTruncator.truncate([], testModelInfo);
        expect(result).toEqual([]);
    });

    it('should return the original message when there is only one message', () => {
        const message = createMessage('user', 'Hello');
        const result = historyTruncator.truncate([message], testModelInfo);
        expect(result).toEqual([message]);
    });

    it('should not truncate history if all messages fit within token limit', () => {
        // Arrange
        const systemMessage = createMessage('system', 'You are a helpful assistant');
        const userMessage1 = createMessage('user', 'Hello');
        const assistantMessage1 = createMessage('assistant', 'Hi there!');
        const userMessage2 = createMessage('user', 'How are you?');

        const messages = [systemMessage, userMessage1, assistantMessage1, userMessage2];

        // Mock token calculations - all messages fit within limit
        // System message: 10 tokens
        // User message 1: 5 tokens
        // Assistant message 1: 8 tokens
        // User message 2: 7 tokens
        // Truncation notice: 10 tokens
        // Total: 40 tokens (well below limit)
        (mockTokenCalculator.calculateTokens as jest.Mock).mockImplementation((text: unknown) => {
            const content = text as string;
            if (content === systemMessage.content) return 10;
            if (content === userMessage1.content) return 5;
            if (content === assistantMessage1.content) return 8;
            if (content === userMessage2.content) return 7;
            if (content === '[History truncated due to context limit]') return 10;
            return 5; // Default
        });

        // Act
        const result = historyTruncator.truncate(messages, testModelInfo);

        // Assert
        expect(result).toEqual(messages);
        // No truncation notice should be added
        expect(result.some(msg => msg.content === '[History truncated due to context limit]')).toBe(false);
    });

    it('should truncate middle messages when history exceeds token limit', () => {
        // Arrange
        const systemMessage = createMessage('system', 'You are a helpful assistant');
        const userMessage1 = createMessage('user', 'Hello');

        // Create a large conversation history
        const messages: UniversalMessage[] = [systemMessage, userMessage1];

        // Add 10 pairs of user/assistant messages
        for (let i = 0; i < 10; i++) {
            messages.push(createMessage('user', `Question ${i}`));
            messages.push(createMessage('assistant', `Answer ${i}`));
        }

        // Add final user message
        const finalUserMessage = createMessage('user', 'Final question');
        messages.push(finalUserMessage);

        // Mock token calculations
        // System message: 10 tokens
        // First user message: 5 tokens
        // Each additional message: 50 tokens
        // Truncation notice: 10 tokens
        // This will make the total exceed the limit and require truncation
        (mockTokenCalculator.calculateTokens as jest.Mock).mockImplementation((text: unknown) => {
            const content = text as string;
            if (content === systemMessage.content) return 10;
            if (content === userMessage1.content) return 5;
            if (content === '[History truncated due to context limit]') return 10;
            return 50; // Make other messages large to force truncation
        });

        // Set a smaller max tokens to force truncation
        const smallModelInfo = {
            ...testModelInfo,
            maxRequestTokens: 200 // Small enough to force truncation
        };

        // Act
        const result = historyTruncator.truncate(messages, smallModelInfo);

        // Assert
        // Should include:
        // 1. System message
        // 2. Truncation notice
        // 3. First user message
        // 4. Some of the most recent messages
        expect(result).toContainEqual(systemMessage);
        expect(result).toContainEqual(userMessage1);
        expect(result).toContainEqual(finalUserMessage);

        // Should include truncation notice
        expect(result.some(msg => msg.content === '[History truncated due to context limit]')).toBe(true);

        // Should have fewer messages than original
        expect(result.length).toBeLessThan(messages.length);
    });

    it('should handle case where only system and first user message fit', () => {
        // Arrange
        const systemMessage = createMessage('system', 'You are a helpful assistant');
        const userMessage1 = createMessage('user', 'Hello');
        const assistantMessage1 = createMessage('assistant', 'Hi there!');
        const userMessage2 = createMessage('user', 'How are you?');

        const messages = [systemMessage, userMessage1, assistantMessage1, userMessage2];

        // Mock token calculations - make messages so large only system and first user fit
        (mockTokenCalculator.calculateTokens as jest.Mock).mockImplementation((text: unknown) => {
            const content = text as string;
            if (content === systemMessage.content) return 10;
            if (content === userMessage1.content) return 10;
            if (content === userMessage2.content) return 10;
            if (content === '[History truncated due to context limit]') return 10;
            return 2000; // Make other messages huge
        });

        // Set a smaller max tokens to force extreme truncation
        const tightModelInfo = {
            ...testModelInfo,
            maxRequestTokens: 100 // Very restrictive
        };

        // Act
        const result = historyTruncator.truncate(messages, tightModelInfo);

        // Assert
        // Should contain system message, truncation notice, first user message, and last user message
        expect(result.length).toBe(4);
        expect(result[0]).toEqual(systemMessage);
        expect(result[1].content).toEqual('[History truncated due to context limit]');
        expect(result[2]).toEqual(userMessage1);
        expect(result[3]).toEqual(userMessage2);
    });

    it('should handle minimal context when even basic messages exceed limit', () => {
        // Arrange
        const systemMessage = createMessage('system', 'You are a helpful assistant with a very long system prompt that exceeds the token limit');
        const userMessage = createMessage('user', 'Hello with a very long message that also exceeds the token limit');

        const messages = [systemMessage, userMessage];

        // Mock token calculations - make both messages extremely large
        (mockTokenCalculator.calculateTokens as jest.Mock).mockImplementation((text: unknown) => {
            return 2000; // Make all messages huge
        });

        // Set a small max tokens to force minimal context
        const tinyModelInfo = {
            ...testModelInfo,
            maxRequestTokens: 100 // Smaller than even the essential messages
        };

        // Act
        const result = historyTruncator.truncate(messages, tinyModelInfo);

        // Assert
        // Should still include the crucial messages
        expect(result).toContainEqual(systemMessage);
        expect(result.some(msg => msg.content === '[History truncated due to context limit]')).toBe(true);
        expect(result).toContainEqual(userMessage);
    });

    it('should handle history without a system message', () => {
        // Arrange
        const userMessage1 = createMessage('user', 'First message');
        const assistantMessage1 = createMessage('assistant', 'First response');
        const userMessage2 = createMessage('user', 'Second message');

        const messages = [userMessage1, assistantMessage1, userMessage2];

        // Mock token calculations
        (mockTokenCalculator.calculateTokens as jest.Mock).mockImplementation((text: unknown) => {
            const content = text as string;
            if (content === userMessage1.content) return 10;
            if (content === assistantMessage1.content) return 500;
            if (content === userMessage2.content) return 10;
            if (content === '[History truncated due to context limit]') return 10;
            return 10; // Default
        });

        // Set a small max tokens to force truncation
        const smallModelInfo = {
            ...testModelInfo,
            maxRequestTokens: 200 // Small enough to force some truncation
        };

        // Act
        const result = historyTruncator.truncate(messages, smallModelInfo);

        // Assert
        // Should include first user message and newest message
        expect(result).toContainEqual(userMessage1);
        expect(result).toContainEqual(userMessage2);

        // Should include truncation notice
        expect(result.some(msg => msg.content === '[History truncated due to context limit]')).toBe(true);

        // Should not include assistant message (too large)
        expect(result).not.toContainEqual(assistantMessage1);
    });

    it('should handle history with only one user message (no truncation needed)', () => {
        // Arrange
        const userMessage = createMessage('user', 'Single message');

        // Mock token calculations
        (mockTokenCalculator.calculateTokens as jest.Mock).mockImplementation((text: unknown) => {
            return 10; // Small enough to fit
        });

        // Act
        const result = historyTruncator.truncate([userMessage], testModelInfo);

        // Assert
        expect(result).toEqual([userMessage]);
    });
}); 