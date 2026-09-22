import { describe, expect, it } from '@jest/globals';
import { ResponseProcessor } from '@/core/processors/ResponseProcessor.ts';
import {
    FinishReason,
    type ModelInfo,
    type UniversalChatParams,
    type UniversalChatResponse
} from '@/interfaces/UniversalInterfaces.ts';
import { z } from 'zod';

const modelInfo: ModelInfo = {
    name: 'test-model',
    inputPricePerMillion: 0.01,
    outputPricePerMillion: 0.02,
    maxRequestTokens: 4000,
    maxResponseTokens: 1000,
    characteristics: { qualityIndex: 80, outputSpeed: 20, firstTokenLatency: 500 }
};

/** Caller contract: a stop action must use null, not an empty string. */
const actionSchema = z.object({
    action: z.enum(['tool_call', 'stop']),
    toolName: z.string().nullable(),
    argumentsJson: z.string().nullable()
});

function params(schema: unknown): UniversalChatParams {
    return {
        messages: [{ role: 'user', content: 'decide' }],
        model: 'test-model',
        responseFormat: 'json',
        jsonSchema: { name: 'ScientificActorAction', schema: schema as never }
    };
}

function responseWith(payload: unknown): UniversalChatResponse {
    return {
        content: JSON.stringify(payload),
        role: 'assistant',
        metadata: { finishReason: FinishReason.STOP, providerStatus: 'completed' }
    };
}

describe('nullable union validation on the response side', () => {
    const processor = new ResponseProcessor();

    it('accepts the null branch', async () => {
        const payload = { action: 'stop', toolName: null, argumentsJson: null };
        const result = await processor.validateResponse(responseWith(payload), params(actionSchema), modelInfo);

        expect(result.contentObject).toEqual(payload);
    });

    it('accepts the string branch', async () => {
        const payload = { action: 'tool_call', toolName: 'read_file', argumentsJson: '{"path":"/tmp/a"}' };
        const result = await processor.validateResponse(responseWith(payload), params(actionSchema), modelInfo);

        expect(result.contentObject).toEqual(payload);
    });

    it('rejects a value outside every branch', async () => {
        const payload = { action: 'stop', toolName: 42, argumentsJson: null };

        await expect(processor.validateResponse(responseWith(payload), params(actionSchema), modelInfo))
            .rejects.toMatchObject({
                name: 'StructuredOutputError',
                reason: 'schema_validation'
            });
    });

    it('does not enforce a plain JSON Schema object against responses', async () => {
        // Known limitation: SchemaValidator only enforces Zod schemas. A plain JSON
        // Schema object currently fails every response with `Invalid schema type`,
        // valid or not, so callers must use Zod when response enforcement matters.
        const plainSchema = {
            type: 'object',
            additionalProperties: false,
            properties: {
                action: { type: 'string', enum: ['tool_call', 'stop'] },
                toolName: { type: ['string', 'null'] }
            },
            required: ['action', 'toolName']
        };
        const valid = { action: 'stop', toolName: null };

        await expect(processor.validateResponse(responseWith(valid), params(plainSchema), modelInfo))
            .rejects.toMatchObject({
                reason: 'schema_validation',
                cause: expect.objectContaining({ message: 'Invalid schema type' })
            });
    });
});
