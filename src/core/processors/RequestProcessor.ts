import { ModelInfo } from '../../interfaces/UniversalInterfaces';
import { TokenCalculator } from '../models/TokenCalculator';
import { DataSplitter } from './DataSplitter';

export class RequestProcessor {
    private tokenCalculator: TokenCalculator;
    private dataSplitter: DataSplitter;

    constructor() {
        this.tokenCalculator = new TokenCalculator();
        this.dataSplitter = new DataSplitter(this.tokenCalculator);
    }

    public async processRequest({
        message,
        data,
        endingMessage,
        model,
        maxResponseTokens
    }: {
        message: string;
        data?: any;
        endingMessage?: string;
        model: ModelInfo;
        maxResponseTokens?: number;
    }): Promise<string[]> {
        // If no data or null data, return single message
        if (data === undefined || data === null) {
            return [this.createMessage(message, undefined, endingMessage)];
        }

        // Use DataSplitter to split the data if needed
        const chunks = await this.dataSplitter.splitIfNeeded({
            message,
            data,
            endingMessage,
            modelInfo: model,
            maxResponseTokens: maxResponseTokens || model.maxResponseTokens
        });

        // Convert chunks to messages
        return chunks.map(chunk => {
            const dataString = typeof chunk.content === 'object'
                ? JSON.stringify(chunk.content, null, 2)
                : String(chunk.content);
            return this.createMessage(message, dataString, endingMessage);
        });
    }

    private createMessage(message: string, data: string | undefined, endingMessage?: string): string {
        let result = message;
        if (data) {
            result += '\n\n' + data;
        }
        if (endingMessage) {
            result += '\n\n' + endingMessage;
        }
        return result;
    }
} 