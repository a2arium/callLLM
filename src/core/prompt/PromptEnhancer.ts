import { JSONSchemaDefinition, UniversalMessage } from '../../interfaces/UniversalInterfaces.js';
import { SchemaFormatter } from '../schema/SchemaFormatter.js';

export type PromptEnhancementOptions = {
    jsonSchema?: {
        name?: string;
        schema: JSONSchemaDefinition;
    };
    responseFormat?: 'json' | 'text';
    isNativeJsonMode?: boolean;
};

export class PromptEnhancer {
    private static readonly JSON_INSTRUCTION = `
You must respond with valid JSON that matches the following requirements:
1. The response must be parseable as JSON
2. Do not include any explanatory text outside the JSON
3. Do not include markdown code blocks or formatting
4. Do not include the word "json" or any other descriptors
5. Just respond with the raw JSON content`;

    private static readonly JSON_WITH_SCHEMA_INSTRUCTION = `
You must respond with valid JSON that matches the following schema and requirements:
1. The response must be parseable as JSON
2. The JSON must exactly match the schema provided below
3. Do not include any explanatory text outside the JSON
4. Do not include markdown code blocks or formatting
5. Do not include the word "json" or any other descriptors
6. Just respond with the raw JSON content

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

        // Ensure system messages come first, then instruction message, then other messages
        return [
            ...systemMessages,
            instructionMessage,
            ...nonSystemMessages
        ];
    }

    /**
     * Generates the instruction string based on options
     */
    private static generateInstructionString(options: PromptEnhancementOptions): string {
        if (options.isNativeJsonMode) {
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