import { TokenCalculator } from '../../../../core/models/TokenCalculator';
import { Usage } from '../../../../interfaces/UniversalInterfaces';
import { encoding_for_model } from '@dqbd/tiktoken';

jest.mock('@dqbd/tiktoken', () => ({
    encoding_for_model: jest.fn()
}));

describe('TokenCalculator', () => {
    let calculator: TokenCalculator;

    beforeEach(() => {
        calculator = new TokenCalculator();
        jest.clearAllMocks();
    });

    describe('calculateUsage', () => {
        it('should calculate costs correctly', () => {
            const result = calculator.calculateUsage(100, 200, 1000, 2000);

            expect(result.input).toBe(0.1);    // 100 * 1000 / 1_000_000
            expect(result.output).toBe(0.4);   // 200 * 2000 / 1_000_000
            expect(result.total).toBe(0.5);    // 0.1 + 0.4
        });

        it('should calculate costs with cached tokens', () => {
            const result = calculator.calculateUsage(
                100,    // total input tokens
                200,    // output tokens
                1000,   // input price per million
                2000,   // output price per million
                20,     // cached tokens
                500     // cached price per million
            );

            // Regular input cost: (100-20) * 1000 / 1_000_000 = 0.08
            // Cached input cost: 20 * 500 / 1_000_000 = 0.01
            // Output cost: 200 * 2000 / 1_000_000 = 0.4
            expect(result.input).toBe(0.08);
            expect(result.inputCached).toBe(0.01);
            expect(result.output).toBe(0.4);
            expect(result.total).toBe(0.49);  // 0.08 + 0.01 + 0.4
        });

        it('should handle cached tokens without cached price', () => {
            const result = calculator.calculateUsage(
                100,    // total input tokens
                200,    // output tokens
                1000,   // input price per million
                2000,   // output price per million
                20      // cached tokens, but no cached price
            );

            // All input tokens use regular price
            expect(result.input).toBe(0.1);    // 100 * 1000 / 1_000_000
            expect(result.inputCached).toBe(0);
            expect(result.output).toBe(0.4);   // 200 * 2000 / 1_000_000
            expect(result.total).toBe(0.5);    // 0.1 + 0.4
        });

        it('should handle cached price without cached tokens', () => {
            const result = calculator.calculateUsage(
                100,    // total input tokens
                200,    // output tokens
                1000,   // input price per million
                2000,   // output price per million
                undefined,  // no cached tokens
                500        // cached price (should be ignored)
            );

            // All input tokens use regular price
            expect(result.input).toBe(0.1);    // 100 * 1000 / 1_000_000
            expect(result.inputCached).toBe(0);
            expect(result.output).toBe(0.4);   // 200 * 2000 / 1_000_000
            expect(result.total).toBe(0.5);    // 0.1 + 0.4
        });

        it('should handle zero tokens', () => {
            const result = calculator.calculateUsage(0, 0, 1000, 2000);

            expect(result.input).toBe(0);
            expect(result.output).toBe(0);
            expect(result.total).toBe(0);
        });

        it('should handle large token counts', () => {
            const result = calculator.calculateUsage(1_000_000, 2_000_000, 1000, 2000);

            expect(result.input).toBe(1000);
            expect(result.output).toBe(4000);
            expect(result.total).toBe(5000);
        });

        it('should handle all cached tokens', () => {
            const result = calculator.calculateUsage(
                100,    // total input tokens
                200,    // output tokens
                1000,   // input price per million
                2000,   // output price per million
                100,    // all tokens are cached
                500     // cached price per million
            );

            // All input tokens use cached price
            expect(result.input).toBe(0);      // no regular tokens
            expect(result.inputCached).toBe(0.05);  // 100 * 500 / 1_000_000
            expect(result.output).toBe(0.4);   // 200 * 2000 / 1_000_000
            expect(result.total).toBe(0.45);   // 0.05 + 0.4
        });
    });

    describe('calculateTokens', () => {
        it('should calculate tokens for simple text', () => {
            const mockEncode = jest.fn().mockReturnValue(new Array(3));
            const mockFree = jest.fn();
            (encoding_for_model as jest.Mock).mockReturnValue({ encode: mockEncode, free: mockFree });

            const text = 'Hello, world!';
            const tokens = calculator.calculateTokens(text);

            expect(tokens).toBe(3);
            expect(mockEncode).toHaveBeenCalledWith(text);
            expect(mockFree).toHaveBeenCalled();
        });

        it('should handle empty string', () => {
            const mockEncode = jest.fn().mockReturnValue([]);
            const mockFree = jest.fn();
            (encoding_for_model as jest.Mock).mockReturnValue({ encode: mockEncode, free: mockFree });

            const tokens = calculator.calculateTokens('');
            expect(tokens).toBe(0);
        });

        it('should handle special characters', () => {
            const mockEncode = jest.fn().mockReturnValue(new Array(5));
            const mockFree = jest.fn();
            (encoding_for_model as jest.Mock).mockReturnValue({ encode: mockEncode, free: mockFree });

            const text = '!@#$%^&*()_+';
            const tokens = calculator.calculateTokens(text);
            expect(tokens).toBe(5);
        });

        it('should handle multi-line text', () => {
            const mockEncode = jest.fn().mockReturnValue(new Array(6));
            const mockFree = jest.fn();
            (encoding_for_model as jest.Mock).mockReturnValue({ encode: mockEncode, free: mockFree });

            const text = 'Line 1\nLine 2\nLine 3';
            const tokens = calculator.calculateTokens(text);
            expect(tokens).toBe(6);
        });

        it('should handle unicode characters', () => {
            const mockEncode = jest.fn().mockReturnValue(new Array(4));
            const mockFree = jest.fn();
            (encoding_for_model as jest.Mock).mockReturnValue({ encode: mockEncode, free: mockFree });

            const text = '你好，世界！';
            const tokens = calculator.calculateTokens(text);
            expect(tokens).toBe(4);
        });

        it('should handle tiktoken errors', () => {
            (encoding_for_model as jest.Mock).mockImplementation(() => {
                throw new Error('Tiktoken error');
            });

            const text = 'Test text';
            const tokens = calculator.calculateTokens(text);

            // The fallback calculation includes:
            // - character count (8)
            // - whitespace count (1)
            // - special char count (0)
            // - no JSON structure
            expect(tokens).toBe(6);
        });
    });

    describe('calculateTotalTokens', () => {
        it('should calculate total tokens for multiple messages', () => {
            const mockEncode = jest.fn()
                .mockReturnValueOnce(new Array(2))  // For "Hello"
                .mockReturnValueOnce(new Array(3)); // For "Hi there!"
            const mockFree = jest.fn();
            (encoding_for_model as jest.Mock).mockReturnValue({ encode: mockEncode, free: mockFree });

            const messages = [
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi there!' }
            ];

            const totalTokens = calculator.calculateTotalTokens(messages);
            expect(totalTokens).toBe(5); // 2 + 3 = 5
        });

        it('should handle empty messages array', () => {
            const messages: { role: string; content: string }[] = [];
            const totalTokens = calculator.calculateTotalTokens(messages);
            expect(totalTokens).toBe(0);
        });

        it('should handle messages with empty content', () => {
            const mockEncode = jest.fn().mockReturnValue([]);
            const mockFree = jest.fn();
            (encoding_for_model as jest.Mock).mockReturnValue({ encode: mockEncode, free: mockFree });

            const messages = [
                { role: 'user', content: '' },
                { role: 'assistant', content: '' }
            ];

            const totalTokens = calculator.calculateTotalTokens(messages);
            expect(totalTokens).toBe(0);
        });

        it('should sum tokens from all messages', () => {
            const mockEncode = jest.fn()
                .mockReturnValueOnce(new Array(1))  // For "Hello"
                .mockReturnValueOnce(new Array(1))  // For "Hi"
                .mockReturnValueOnce(new Array(3)); // For "How are you?"
            const mockFree = jest.fn();
            (encoding_for_model as jest.Mock).mockReturnValue({ encode: mockEncode, free: mockFree });

            const messages = [
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi' },
                { role: 'user', content: 'How are you?' }
            ];

            const totalTokens = calculator.calculateTotalTokens(messages);
            expect(totalTokens).toBe(5); // 1 + 1 + 3 = 5
        });
    });
}); 