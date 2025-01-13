import { SchemaFormatter } from '../../../../core/schema/SchemaFormatter';
import type { JSONSchemaObject } from '../../../../core/schema/SchemaFormatter';

describe('SchemaFormatter', () => {
    describe('addAdditionalPropertiesFalse', () => {
        it('should add additionalProperties: false to root level object', () => {
            const input: JSONSchemaObject = {
                type: 'object',
                properties: {
                    name: { type: 'string' }
                }
            };

            const result = SchemaFormatter.addAdditionalPropertiesFalse(input);

            expect(result).toEqual({
                type: 'object',
                properties: {
                    name: { type: 'string' }
                },
                additionalProperties: false
            });
        });

        it('should handle nested object properties', () => {
            const input: JSONSchemaObject = {
                type: 'object',
                properties: {
                    user: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            age: { type: 'number' }
                        }
                    }
                }
            };

            const result = SchemaFormatter.addAdditionalPropertiesFalse(input);

            expect(result).toEqual({
                type: 'object',
                additionalProperties: false,
                properties: {
                    user: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            name: { type: 'string' },
                            age: { type: 'number' }
                        }
                    }
                }
            });
        });

        it('should handle arrays with object items', () => {
            const input: JSONSchemaObject = {
                type: 'object',
                properties: {
                    users: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' }
                            }
                        }
                    }
                }
            };

            const result = SchemaFormatter.addAdditionalPropertiesFalse(input);

            expect(result).toEqual({
                type: 'object',
                additionalProperties: false,
                properties: {
                    users: {
                        type: 'array',
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                name: { type: 'string' }
                            }
                        }
                    }
                }
            });
        });

        it('should not modify non-object properties', () => {
            const input: JSONSchemaObject = {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    age: { type: 'number' },
                    tags: {
                        type: 'array',
                        items: { type: 'string' }
                    }
                }
            };

            const result = SchemaFormatter.addAdditionalPropertiesFalse(input);

            expect(result).toEqual({
                type: 'object',
                additionalProperties: false,
                properties: {
                    name: { type: 'string' },
                    age: { type: 'number' },
                    tags: {
                        type: 'array',
                        items: { type: 'string' }
                    }
                }
            });
        });

        it('should handle empty properties', () => {
            const input: JSONSchemaObject = {
                type: 'object',
                properties: {
                    emptyProp: { type: 'null' },
                    optionalProp: { type: 'string', nullable: true }
                }
            };

            const result = SchemaFormatter.addAdditionalPropertiesFalse(input);

            expect(result).toEqual({
                type: 'object',
                additionalProperties: false,
                properties: {
                    emptyProp: { type: 'null' },
                    optionalProp: { type: 'string', nullable: true }
                }
            });
        });
    });

    describe('formatJsonSchema', () => {
        it('should format basic schema correctly', () => {
            const name = 'UserSchema';
            const schema = JSON.stringify({
                type: 'object',
                properties: {
                    name: { type: 'string' }
                }
            });

            const result = SchemaFormatter.formatJsonSchema(name, schema);

            expect(result).toEqual({
                name: 'UserSchema',
                description: 'UserSchema',
                strict: true,
                schema: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        name: { type: 'string' }
                    }
                }
            });
        });

        it('should handle complex nested schema', () => {
            const name = 'ComplexSchema';
            const schema = JSON.stringify({
                type: 'object',
                properties: {
                    user: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            addresses: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        street: { type: 'string' },
                                        city: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            const result = SchemaFormatter.formatJsonSchema(name, schema);

            expect(result).toEqual({
                name: 'ComplexSchema',
                description: 'ComplexSchema',
                strict: true,
                schema: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                        user: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                name: { type: 'string' },
                                addresses: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        additionalProperties: false,
                                        properties: {
                                            street: { type: 'string' },
                                            city: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
        });

        it('should throw error for invalid JSON schema', () => {
            const name = 'InvalidSchema';
            const schema = 'invalid json';

            expect(() => SchemaFormatter.formatJsonSchema(name, schema))
                .toThrow(SyntaxError);
        });
    });
}); 