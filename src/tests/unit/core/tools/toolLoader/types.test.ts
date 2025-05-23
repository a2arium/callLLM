import { jest } from "@jest/globals"; import { ToolParsingError } from '../../../../../core/tools/toolLoader/types.ts';

describe('toolLoader Types', () => {
  describe('ToolParsingError', () => {
    it('should create error with correct name and message', () => {
      const errorMessage = 'Test parsing error';
      const error = new ToolParsingError(errorMessage);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ToolParsingError');
      expect(error.message).toBe(errorMessage);
    });

    it('should be catchable as an Error', () => {
      const fn = () => {
        throw new ToolParsingError('Test error');
      };

      expect(fn).toThrow(Error);
      expect(fn).toThrow(ToolParsingError);
      expect(fn).toThrow('Test error');
    });
  });
});