import { jest } from '@jest/globals';
import { GeminiConverter } from '@/adapters/gemini/converter.ts';
import type { ToolDefinition } from '@/types/tooling.ts';
import type { ModelInfo, UniversalChatParams } from '@/interfaces/UniversalInterfaces.ts';
import { GeminiValidationError } from '@/adapters/gemini/errors.ts';

describe('GeminiConverter open-map tool encoding', () => {
    let converter: GeminiConverter;
    let mockModelManager: { getModel: jest.Mock };

    beforeEach(() => {
        mockModelManager = {
            getModel: jest.fn().mockReturnValue({
                name: 'gemini-2.0-flash',
                maxRequestTokens: 100000,
                maxResponseTokens: 8192,
                capabilities: {
                    streaming: true,
                    toolCalls: true,
                    input: { text: true },
                    output: { text: { textOutputFormats: ['text', 'json'] } }
                },
                characteristics: { qualityIndex: 70, outputSpeed: 100, firstTokenLatency: 100 }
            } as unknown as ModelInfo)
        };
        converter = new GeminiConverter(mockModelManager as any);
    });

    test('rewrites nested open-map fields to JSON strings before sanitizer closes them', async () => {
        const patchSchema = {
            type: 'object',
            propertyNames: { type: 'string' },
            additionalProperties: {}
        };
        const toolDef: ToolDefinition = {
            name: 'update_account',
            description: 'Update an account using a free-form patch object.',
            parameters: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    patch: patchSchema
                },
                required: ['id', 'patch'],
                additionalProperties: false
            }
        };

        const params: UniversalChatParams = {
            messages: [{ role: 'user', content: 'Update account' }],
            tools: [toolDef],
            model: 'gemini-2.0-flash'
        };

        const result = await converter.convertToProviderParams('gemini-2.0-flash', params);
        const declarations = (result.config as { tools?: Array<{ functionDeclarations?: Array<{ parametersJsonSchema?: Record<string, unknown> }> }> })
            ?.tools?.[0]?.functionDeclarations;
        expect(declarations).toHaveLength(1);
        const schema = declarations?.[0]?.parametersJsonSchema as Record<string, unknown>;
        expect(schema).toBeDefined();
        const properties = schema.properties as Record<string, unknown>;
        expect(properties.patch).toMatchObject({ type: 'string' });
        expect(schema.additionalProperties).toBe(false);

        // Caller schema remains the original open map
        expect(toolDef.parameters.properties.patch).toBe(patchSchema);
        expect(toolDef.parameters.properties.patch).toEqual({
            type: 'object',
            propertyNames: { type: 'string' },
            additionalProperties: {}
        });
    });

    test('rejects root-level open-map tool parameters', async () => {
        const toolDef: ToolDefinition = {
            name: 'update_account',
            description: 'Root is an open map',
            parameters: {
                type: 'object',
                additionalProperties: true,
                properties: {}
            }
        };

        await expect(converter.convertToProviderParams('gemini-2.0-flash', {
            messages: [{ role: 'user', content: 'Update' }],
            tools: [toolDef],
            model: 'gemini-2.0-flash'
        })).rejects.toThrow(GeminiValidationError);
    });
});
