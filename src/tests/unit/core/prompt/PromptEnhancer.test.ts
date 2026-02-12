import { jest } from "@jest/globals";
import { PromptEnhancer, type PromptEnhancementOptions } from '@/core/prompt/PromptEnhancer.ts';
import type { JSONSchemaDefinition, UniversalMessage } from '@/interfaces/UniversalInterfaces.ts';

describe('PromptEnhancer', () => {
  const simpleMessages: UniversalMessage[] = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello, how are you?' }];


  describe('enhanceMessages', () => {
    it('should return messages unchanged when responseFormat is not json', () => {
      const options: PromptEnhancementOptions = {
        responseFormat: 'text'
      };

      const result = PromptEnhancer.enhanceMessages(simpleMessages, options);
      expect(result).toEqual(simpleMessages);
    });

    it('should add JSON instruction when responseFormat is json', () => {
      const options: PromptEnhancementOptions = {
        responseFormat: 'json'
      };

      const result = PromptEnhancer.enhanceMessages(simpleMessages, options);

      // Should have one more message than original
      expect(result.length).toBe(simpleMessages.length + 1);

      // The inserted message should be at the end
      const instructionIndex = result.length - 1;
      expect(result[instructionIndex].role).toBe('user');
      expect(result[instructionIndex].content).toContain('Format instructions:');
      expect(result[instructionIndex].content).toContain('You must respond with a valid JSON OBJECT');
      expect(result[instructionIndex].metadata?.isFormatInstruction).toBe(true);
    });

    it('should add instruction after system message when present', () => {
      const messagesWithSystem: UniversalMessage[] = [
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'User message 1' },
        { role: 'assistant', content: 'Assistant message' },
        { role: 'user', content: 'User message 2' }];


      const options: PromptEnhancementOptions = {
        responseFormat: 'json'
      };

      const result = PromptEnhancer.enhanceMessages(messagesWithSystem, options);

      // Should be at the end
      expect(result.length).toBe(messagesWithSystem.length + 1);
      expect(result[0].role).toBe('system');
      const instructionIndex = result.length - 1;
      expect(result[instructionIndex].role).toBe('user');
      expect(result[instructionIndex].content).toContain('Format instructions:');
      expect(result[instructionIndex].metadata?.isFormatInstruction).toBe(true);
      expect(result[1].role).toBe('user');
      expect(result[1].content).toBe('User message 1');
    });

    it('should add instruction at beginning when no system message is present', () => {
      const messagesWithoutSystem: UniversalMessage[] = [
        { role: 'user', content: 'User message 1' },
        { role: 'assistant', content: 'Assistant message' }];


      const options: PromptEnhancementOptions = {
        responseFormat: 'json'
      };

      const result = PromptEnhancer.enhanceMessages(messagesWithoutSystem, options);

      // Should insert at the end
      expect(result.length).toBe(messagesWithoutSystem.length + 1);
      const instructionIndex = result.length - 1;
      expect(result[instructionIndex].role).toBe('user');
      expect(result[instructionIndex].content).toContain('Format instructions:');
      expect(result[instructionIndex].metadata?.isFormatInstruction).toBe(true);
      expect(result[0].role).toBe('user');
      expect(result[0].content).toBe('User message 1');
    });

    it('should include schema when jsonSchema is provided', () => {
      const schema: JSONSchemaDefinition = JSON.stringify({
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name', 'age']
      });

      const options: PromptEnhancementOptions = {
        responseFormat: 'json',
        jsonSchema: {
          schema
        }
      };

      const result = PromptEnhancer.enhanceMessages(simpleMessages, options);

      expect(result.length).toBe(simpleMessages.length + 1);
      const instructionIndex = result.length - 1;
      expect(result[instructionIndex].content).toContain('Schema:');
      expect(result[instructionIndex].content).toContain('"properties"');
      expect(result[instructionIndex].content).toContain('"required"');
    });

    it('should include schema name when jsonSchema.name is provided', () => {
      const schema: JSONSchemaDefinition = JSON.stringify({
        properties: {
          text: { type: 'string' }
        },
        required: ['text']
      });

      const options: PromptEnhancementOptions = {
        responseFormat: 'json',
        jsonSchema: {
          name: 'response',
          schema
        }
      };

      const result = PromptEnhancer.enhanceMessages(simpleMessages, options);

      expect(result.length).toBe(simpleMessages.length + 1);
      const instructionIndex = result.length - 1;
      expect(result[instructionIndex].content).toContain('wrapped in an object with a single key "response"');
    });

    it('should use simplified instruction when isNativeJsonMode is true', () => {
      const options: PromptEnhancementOptions = {
        responseFormat: 'json',
        isNativeJsonMode: true
      };

      const result = PromptEnhancer.enhanceMessages(simpleMessages, options);

      expect(result.length).toBe(simpleMessages.length + 1);
      const instructionIndex = result.length - 1;
      expect(result[instructionIndex].content).toContain('Provide your response in valid JSON format');
      // Should not contain the detailed instructions for non-native JSON mode
      expect(result[instructionIndex].content).not.toContain('You must respond with valid JSON');
    });

    it('should work with Zod schemas by using their JSON schema representation', () => {
      // Create a mock JSON schema as a string, as if it came from a Zod schema conversion
      const mockJsonSchema: JSONSchemaDefinition = JSON.stringify({
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          age: { type: 'number', minimum: 18 }
        },
        required: ['name', 'email', 'age']
      });

      const options: PromptEnhancementOptions = {
        responseFormat: 'json',
        jsonSchema: {
          schema: mockJsonSchema
        }
      };

      const result = PromptEnhancer.enhanceMessages(simpleMessages, options);

      expect(result.length).toBe(simpleMessages.length + 1);
      const instructionIndex = result.length - 1;
      expect(result[instructionIndex].content).toContain('Schema:');
    });

    it('should not modify the original messages array', () => {
      const originalMessages = [...simpleMessages];

      const options: PromptEnhancementOptions = {
        responseFormat: 'json'
      };

      PromptEnhancer.enhanceMessages(simpleMessages, options);

      // Original array should remain unchanged
      expect(simpleMessages).toEqual(originalMessages);
    });
  });
});