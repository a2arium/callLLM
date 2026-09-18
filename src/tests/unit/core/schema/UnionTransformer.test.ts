import {
  collapseNullableUnion,
  flattenUnions,
  responseHasFlattenedUnionKeys,
  unflattenData,
  OPTIONAL_UNION_OPTION_KEY
} from '@/core/schema/UnionTransformer.ts';

describe('UnionTransformer', () => {
  describe('collapseNullableUnion', () => {
    it('collapses string|null anyOf into a type array', () => {
      const collapsed = collapseNullableUnion({
        anyOf: [{ type: 'string' }, { type: 'null' }],
        description: 'optional id'
      });
      expect(collapsed).toEqual({
        type: ['string', 'null'],
        description: 'optional id'
      });
    });

    it('returns null for multi-variant unions', () => {
      expect(collapseNullableUnion({
        anyOf: [{ type: 'string' }, { type: 'number' }]
      })).toBeNull();
    });
  });

  describe('flattenUnions', () => {
    it('collapses nullable fields without creating selectors', () => {
      const { schema, mapping, didFlatten } = flattenUnions({
        type: 'object',
        properties: {
          id: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
            description: 'id or null'
          }
        },
        required: ['id']
      });

      expect(didFlatten).toBe(false);
      expect(mapping).toEqual([]);
      expect((schema.properties as any).id.type).toEqual(['string', 'null']);
      expect((schema.properties as any).id_selected).toBeUndefined();
    });

    it('flattens multi-variant unions into optional option fields', () => {
      const { schema, mapping, didFlatten } = flattenUnions({
        type: 'object',
        properties: {
          payload: {
            anyOf: [
              { type: 'object', properties: { kind: { type: 'string', enum: ['text'] }, value: { type: 'string' } }, required: ['kind', 'value'] },
              { type: 'object', properties: { kind: { type: 'string', enum: ['number'] }, value: { type: 'number' } }, required: ['kind', 'value'] }
            ]
          }
        },
        required: ['payload']
      });

      expect(didFlatten).toBe(true);
      expect(mapping).toHaveLength(1);
      expect((schema.required as string[])).toEqual(['payload_selected']);
      expect((schema.properties as any).payload_text[OPTIONAL_UNION_OPTION_KEY]).toBe(true);
      expect((schema.properties as any).payload_number[OPTIONAL_UNION_OPTION_KEY]).toBe(true);
    });
  });

  describe('unflattenData / responseHasFlattenedUnionKeys', () => {
    const mapping = [{
      path: [] as string[],
      prop: 'payload',
      options: [
        { key: 'text', originalIndex: 0 },
        { key: 'number', originalIndex: 1 }
      ]
    }];

    it('detects flattened keys and restores the original property', () => {
      const flat = {
        payload_selected: 'text',
        payload_text: { kind: 'text', value: 'hi' }
      };
      expect(responseHasFlattenedUnionKeys(flat, mapping)).toBe(true);
      expect(unflattenData(flat, mapping)).toEqual({
        payload: { kind: 'text', value: 'hi' }
      });
    });

    it('leaves native anyOf responses alone when no flattened keys are present', () => {
      const native = { payload: { kind: 'text', value: 'hi' }, canonicalEntityId: null };
      expect(responseHasFlattenedUnionKeys(native, mapping)).toBe(false);
      expect(unflattenData(native, mapping)).toEqual(native);
    });
  });
});
