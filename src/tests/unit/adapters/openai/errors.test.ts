import { AdapterError } from '../../../../adapters/base';
import { OpenAIAdapterError, OpenAIValidationError, OpenAIStreamError } from '../../../../adapters/openai-completion/errors';

describe('OpenAI Errors', () => {
    describe('OpenAIAdapterError', () => {
        it('should create error with correct name and message', () => {
            const error = new OpenAIAdapterError('test error');
            expect(error.name).toBe('OpenAIAdapterError');
            expect(error.message).toBe('OpenAI Error: test error');
            expect(error instanceof AdapterError).toBe(true);
        });

        it('should store original error', () => {
            const originalError = new Error('original error');
            const error = new OpenAIAdapterError('test error', originalError);
            expect(error.originalError).toBe(originalError);
        });

        it('should work without original error', () => {
            const error = new OpenAIAdapterError('test error');
            expect(error.originalError).toBeUndefined();
        });
    });

    describe('OpenAIValidationError', () => {
        it('should create error with correct name and message', () => {
            const error = new OpenAIValidationError('test error');
            expect(error.name).toBe('OpenAIValidationError');
            expect(error.message).toBe('OpenAI Error: Validation Error: test error');
            expect(error instanceof OpenAIAdapterError).toBe(true);
        });

        it('should inherit from OpenAIAdapterError', () => {
            const error = new OpenAIValidationError('test error');
            expect(error instanceof OpenAIAdapterError).toBe(true);
            expect(error instanceof AdapterError).toBe(true);
        });
    });

    describe('OpenAIStreamError', () => {
        it('should create error with correct name and message', () => {
            const error = new OpenAIStreamError('test error');
            expect(error.name).toBe('OpenAIStreamError');
            expect(error.message).toBe('OpenAI Error: Stream Error: test error');
            expect(error instanceof OpenAIAdapterError).toBe(true);
        });

        it('should inherit from OpenAIAdapterError', () => {
            const error = new OpenAIStreamError('test error');
            expect(error instanceof OpenAIAdapterError).toBe(true);
            expect(error instanceof AdapterError).toBe(true);
        });
    });
}); 