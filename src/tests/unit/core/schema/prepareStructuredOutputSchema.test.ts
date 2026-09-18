import { z } from 'zod';
import { prepareStructuredOutputSchema } from '@/core/schema/prepareStructuredOutputSchema.ts';
import type { ModelInfo } from '@/interfaces/UniversalInterfaces.ts';

describe('prepareStructuredOutputSchema', () => {
  const nullableSchema = z.object({
    canonicalEntityId: z.string().nullable()
  });

  it('keeps anyOf for models with jsonSchemaUnions=anyOf', () => {
    const modelInfo = {
      name: 'gpt-5',
      capabilities: {
        output: {
          text: {
            textOutputFormats: ['text', 'json'],
            structuredOutputs: true,
            jsonSchemaUnions: 'anyOf'
          }
        }
      }
    } as unknown as ModelInfo;

    const prepared = prepareStructuredOutputSchema(nullableSchema, { modelInfo });
    expect(prepared.unionsMode).toBe('anyOf');
    expect(prepared.didFlatten).toBe(false);
    expect((prepared.schema.properties as any).canonicalEntityId.anyOf).toBeDefined();
    expect((prepared.schema.properties as any).canonicalEntityId_selected).toBeUndefined();
  });

  it('collapses nullables in flatten mode', () => {
    const prepared = prepareStructuredOutputSchema(nullableSchema, { unionsMode: 'flatten' });
    expect(prepared.unionsMode).toBe('flatten');
    expect((prepared.schema.properties as any).canonicalEntityId.type).toEqual(['string', 'null']);
    expect(prepared.mapping).toEqual([]);
  });
});
