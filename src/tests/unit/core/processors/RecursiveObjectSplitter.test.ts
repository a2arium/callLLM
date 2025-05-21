import { jest } from "@jest/globals";import { describe, expect, test } from '@jest/globals';
import { RecursiveObjectSplitter } from '../../../../core/processors/RecursiveObjectSplitter.js';

describe('RecursiveObjectSplitter', () => {
  let splitter: RecursiveObjectSplitter;

  describe('Basic Functionality', () => {
    beforeEach(() => {
      splitter = new RecursiveObjectSplitter(100);
    });

    test('should return single chunk for small object', () => {
      const input = { a: 1, b: 'small' };
      const result = splitter.split(input);
      expect(result).toEqual([input]);
    });

    test('should split large object into multiple chunks', () => {
      const input = {
        section1: 'a'.repeat(80),
        section2: 'b'.repeat(80)
      };
      const result = splitter.split(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('section1');
      expect(result[1]).toHaveProperty('section2');
    });
  });

  describe('Nested Objects', () => {
    beforeEach(() => {
      splitter = new RecursiveObjectSplitter(80);
    });

    test('should split nested objects', () => {
      const input = {
        parent: {
          child1: 'value1',
          child2: 'value2'.repeat(15)
        }
      };
      const result = splitter.split(input);
      expect(result).toHaveLength(2);
      expect(result[0].parent.child1).toBe('value1');
      expect(result[1].parent.child2).toBeDefined();
    });
  });

  describe('Array Handling', () => {
    test('should split arrays when handleArrays=true', () => {
      const splitter = new RecursiveObjectSplitter(100);
      const input = {
        items: Array.from({ length: 5 }, (_, i) => `item-${i}`.repeat(10))
      };
      const result = splitter.split(input, true);
      expect(result.length).toBeGreaterThan(1);
      expect(result[0]).toHaveProperty('items.0');
    });

    test('should preserve arrays when handleArrays=false', () => {
      const splitter = new RecursiveObjectSplitter(200);
      const input = {
        items: ['a'.repeat(50), 'b'.repeat(150)]
      };
      const result = splitter.split(input);
      expect(result).toHaveLength(2);
      expect(Array.isArray(result[0].items)).toBe(true);
      expect(result[0].items[0].length).toBe(50);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      splitter = new RecursiveObjectSplitter(100);
    });

    test('should handle empty object', () => {
      const result = splitter.split({});
      expect(result).toEqual([{}]);
    });

    test('should handle null values', () => {
      const input = { a: null, b: { c: null } };
      const result = splitter.split(input);
      expect(result).toEqual([input]);
    });
  });

  describe('Size Calculation', () => {
    test('should accurately calculate sizes', () => {
      const splitter = new RecursiveObjectSplitter(1000);
      const obj = {
        num: 123.45,
        str: 'test',
        bool: true,
        arr: [1, 2, 3]
      };
      const expectedSize = JSON.stringify(obj).length;
      expect(splitter['calculateSize'](obj)).toBe(expectedSize);
    });
  });

  describe('Chunk Management', () => {
    test('should respect min chunk size', () => {
      const splitter = new RecursiveObjectSplitter(100, 50);
      const input = {
        part1: 'a'.repeat(30),
        part2: 'b'.repeat(80)
      };
      const result = splitter.split(input);
      expect(result[0]).toEqual({ part1: 'a'.repeat(30) });
    });
  });
});