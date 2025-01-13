export const encoding_for_model = jest.fn().mockImplementation(() => ({
    encode: jest.fn().mockImplementation((text: string) => {
        // Simple mock implementation that roughly approximates token count
        // This is not accurate but good enough for testing
        if (!text) return [];

        // Split on spaces and punctuation
        const words = text.split(/[\s\p{P}]+/u).filter(Boolean);

        // Handle CJK characters (count each character as a token)
        const cjkCount = (text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g) || []).length;

        // Base count on words + CJK characters
        const baseCount = words.length + cjkCount;

        // Generate an array of that length
        return Array(baseCount).fill(0);
    }),
    free: jest.fn()
})); 