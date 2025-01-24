import { ModelInfo } from '../../interfaces/UniversalInterfaces';

export class RequestProcessor {
    constructor() { }

    public processRequest({
        message,
        data,
        endingMessage,
        model
    }: {
        message: string;
        data?: any;
        endingMessage?: string;
        model: ModelInfo;
    }): string[] {
        let combinedMessage = message;

        // Add data if provided
        if (data !== undefined) {
            combinedMessage += '\n\n';
            combinedMessage += typeof data === 'object' ? JSON.stringify(data, null, 2) : data.toString();
        }

        // Add ending message if provided
        if (endingMessage) {
            combinedMessage += '\n\n';
            combinedMessage += endingMessage;
        }

        return [combinedMessage];
    }
} 