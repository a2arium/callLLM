import type { JSONSchemaDefinition, UniversalMessage } from '../../interfaces/UniversalInterfaces.ts';
import { SchemaFormatter } from '../schema/SchemaFormatter.ts';

export type PromptEnhancementOptions = {
    jsonSchema?: {
        name?: string;
        schema: JSONSchemaDefinition;
    };
    responseFormat?: 'json' | 'text';
    isNativeJsonMode?: boolean;
    isStructuredOutput?: boolean;
};

export class PromptEnhancer {
    private static readonly JSON_INSTRUCTION = `
You must respond with a valid JSON OBJECT.
1. The response MUST be a single JSON object.
2. DO NOT wrap the response in an array [].
3. DO NOT include any explanatory text, markdown code blocks, or formatting.
4. Respond ONLY with the raw JSON content.`;

    private static readonly JSON_WITH_SCHEMA_INSTRUCTION = `
You must respond with a valid JSON OBJECT that matches the following schema:
1. The response MUST be a single JSON object matching the schema below.
2. DO NOT wrap the response in an array [].
3. DO NOT include any explanatory text, markdown code blocks, or formatting.
4. Respond ONLY with the raw JSON content.

Schema:
`;

    /**
     * Enhances messages with JSON instructions when needed
     */
    public static enhanceMessages(
        messages: UniversalMessage[],
        options: PromptEnhancementOptions
    ): UniversalMessage[] {
        // If no JSON output is requested, return messages as-is
        if (options.responseFormat !== 'json') {
            return messages;
        }

        // Create a copy of messages to avoid modifying the original
        const enhancedMessages = [...messages];

        // Extract the system message if it exists
        const systemMessages = enhancedMessages.filter(msg => msg.role === 'system');
        const nonSystemMessages = enhancedMessages.filter(msg => msg.role !== 'system');

        // Generate the instruction string
        const instruction = this.generateInstructionString(options);

        // Create an instruction message as a user message
        const instructionMessage: UniversalMessage = {
            role: 'user',
            content: `Format instructions: ${instruction}`,
            metadata: {
                isFormatInstruction: true  // Add special metadata to identify this message
            }
        };

        // Ensure system messages come first, then other messages, then instruction message at the end
        return [
            ...systemMessages,
            ...nonSystemMessages,
            instructionMessage
        ];
    }

    /**
     * Generates the instruction string based on options
     */
    private static generateInstructionString(options: PromptEnhancementOptions): string {
        const isStructuredOutput = options.isStructuredOutput ?? true;

        if (options.isNativeJsonMode && isStructuredOutput) {
            return 'Provide your response in valid JSON format.';
        }

        if (!options.jsonSchema) {
            return this.JSON_INSTRUCTION;
        }

        const schemaString = SchemaFormatter.schemaToString(options.jsonSchema.schema);
        const nameInstruction = options.jsonSchema.name
            ? `\nThe response should be wrapped in an object with a single key "${options.jsonSchema.name}" containing the schema-compliant object.`
            : '';

        return `${this.JSON_WITH_SCHEMA_INSTRUCTION}${schemaString}${nameInstruction}`;
    }
} 