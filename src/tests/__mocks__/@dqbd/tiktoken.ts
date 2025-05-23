import { jest } from '@jest/globals';

// Mock encoding object with all necessary methods
const mockEncoding = {
    encode: jest.fn().mockImplementation(((text: string): number[] => {
        if (!text) return [];
        const words = text.split(/[\s\p{P}]+/u).filter(Boolean);
        const cjkCount = (text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
        const baseCount = words.length + cjkCount;
        return Array(baseCount).fill(0);
    }) as any),
    decode: jest.fn().mockReturnValue([] as number[]),
    free: jest.fn(),
};

// Mock constructor functions that return the encoding
export const encoding_for_model = jest.fn().mockReturnValue(mockEncoding);
export const get_encoding = jest.fn().mockReturnValue(mockEncoding);

// Mock proper WebAssembly module with required functions
export const tiktoken_bg = {
    // Add any functions that might be called from the WebAssembly module
    __wbindgen_placeholder__: jest.fn(),
    __wbg_getcurrentexception_90400d68473d7330: jest.fn(),
    __wbindgen_add_to_stack_pointer: jest.fn(),
    __wbindgen_malloc: jest.fn(),
    __wbindgen_realloc: jest.fn(),
    __wbindgen_free: jest.fn(),
    encodeBpe: jest.fn().mockImplementation(() => []),
    // ... other WebAssembly exports that might be used
};

// Mock the WebAssembly imports
export const __wbg_init = jest.fn().mockResolvedValue(tiktoken_bg);

// ESM compatibility
export const __esModule = true;

// Default export
export default {
    encoding_for_model,
    get_encoding,
    tiktoken_bg,
    __wbg_init,
}; 