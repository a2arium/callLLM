import { AdapterError } from '../base/baseAdapter';

export class OpenAIAdapterError extends AdapterError {
    constructor(message: string, public originalError?: unknown) {
        super(`OpenAI Error: ${message}`);
        this.name = 'OpenAIAdapterError';
    }
}

export class OpenAIValidationError extends OpenAIAdapterError {
    constructor(message: string) {
        super(`Validation Error: ${message}`);
        this.name = 'OpenAIValidationError';
    }
}

export class OpenAIStreamError extends OpenAIAdapterError {
    constructor(message: string) {
        super(`Stream Error: ${message}`);
        this.name = 'OpenAIStreamError';
    }
} 