import { Validator } from '../../../../adapters/openai/validator';
import { OpenAIResponseValidationError } from '../../../../adapters/openai/errors';
import type { UniversalChatParams } from '../../../../interfaces/UniversalInterfaces';
import type { ToolDefinition } from '../../../../types/tooling';
import { ModelManager } from '../../../../core/models/ModelManager';
import { ModelInfo, ReasoningEffort } from '../../../../interfaces/UniversalInterfaces';

// Mock the ModelManager
jest.mock('../../../../core/models/ModelManager');

describe('OpenAI Response Validator', () => {
    let validator: Validator;
    let mockModelManager: jest.Mocked<ModelManager>;

    beforeEach(() => {
        mockModelManager = new ModelManager('openai') as jest.Mocked<ModelManager>;
        validator = new Validator();
        (validator as any).modelManager = mockModelManager;
    });

    describe('validateParams', () => {
        const validMessage = { role: 'user' as const, content: 'test' };

        describe('basic parameter validation', () => {
            it('should throw error when messages array is missing', () => {
                const params = {} as UniversalChatParams;
                expect(() => validator.validateParams(params)).toThrow(OpenAIResponseValidationError);
                expect(() => validator.validateParams(params)).toThrow('At least one message is required');
            });

            it('should throw error when messages array is empty', () => {
                const params: UniversalChatParams = { messages: [], model: 'test-model' };
                expect(() => validator.validateParams(params)).toThrow(OpenAIResponseValidationError);
                expect(() => validator.validateParams(params)).toThrow('At least one message is required');
            });

            it('should throw error when model is missing', () => {
                const params: UniversalChatParams = { messages: [validMessage], model: '' as any };
                expect(() => validator.validateParams(params)).toThrow(OpenAIResponseValidationError);
                expect(() => validator.validateParams(params)).toThrow('Model name is required');
            });

            it('should throw error when model is empty string', () => {
                const params: UniversalChatParams = { messages: [validMessage], model: '  ' };
                expect(() => validator.validateParams(params)).toThrow(OpenAIResponseValidationError);
                expect(() => validator.validateParams(params)).toThrow('Model name is required');
            });

            it('should accept valid params with minimal requirements', () => {
                const params: UniversalChatParams = {
                    messages: [validMessage],
                    model: 'test-model'
                };
                expect(() => validator.validateParams(params)).not.toThrow();
            });
        });

        describe('settings validation', () => {
            it('should throw error when temperature is out of bounds', () => {
                const testCases = [-0.1, 2.1];
                testCases.forEach(temperature => {
                    const params: UniversalChatParams = {
                        messages: [validMessage],
                        settings: { temperature },
                        model: 'test-model'
                    };
                    expect(() => validator.validateParams(params)).toThrow(OpenAIResponseValidationError);
                    expect(() => validator.validateParams(params)).toThrow('Temperature must be between 0 and 2');
                });
            });

            it('should accept valid temperature values', () => {
                const testCases = [0, 1, 2];
                testCases.forEach(temperature => {
                    const params: UniversalChatParams = {
                        messages: [validMessage],
                        settings: { temperature },
                        model: 'test-model'
                    };
                    expect(() => validator.validateParams(params)).not.toThrow();
                });
            });

            it('should throw error when topP is out of bounds', () => {
                const testCases = [-0.1, 1.1];
                testCases.forEach(topP => {
                    const params: UniversalChatParams = {
                        messages: [validMessage],
                        settings: { topP },
                        model: 'test-model'
                    };
                    expect(() => validator.validateParams(params)).toThrow(OpenAIResponseValidationError);
                    expect(() => validator.validateParams(params)).toThrow('Top P must be between 0 and 1');
                });
            });

            it('should accept valid topP values', () => {
                const testCases = [0, 0.5, 1];
                testCases.forEach(topP => {
                    const params: UniversalChatParams = {
                        messages: [validMessage],
                        settings: { topP },
                        model: 'test-model'
                    };
                    expect(() => validator.validateParams(params)).not.toThrow();
                });
            });

            it('should throw error when maxTokens is invalid', () => {
                const testCases = [0, -1];
                testCases.forEach(maxTokens => {
                    const params: UniversalChatParams = {
                        messages: [validMessage],
                        settings: { maxTokens },
                        model: 'test-model'
                    };
                    expect(() => validator.validateParams(params)).toThrow(OpenAIResponseValidationError);
                    expect(() => validator.validateParams(params)).toThrow('Max tokens must be greater than 0');
                });
            });

            it('should accept valid maxTokens values', () => {
                const params: UniversalChatParams = {
                    messages: [validMessage],
                    settings: { maxTokens: 1 },
                    model: 'test-model'
                };
                expect(() => validator.validateParams(params)).not.toThrow();
            });
        });

        describe('reasoning model validation', () => {
            const reasoningModel: ModelInfo = {
                name: 'o3-mini',
                inputPricePerMillion: 1.10,
                outputPricePerMillion: 4.40,
                maxRequestTokens: 128000,
                maxResponseTokens: 65536,
                capabilities: {
                    streaming: true,
                    reasoning: true,
                    input: { text: true },
                    output: { text: true }
                },
                characteristics: {
                    qualityIndex: 86,
                    outputSpeed: 212.1,
                    firstTokenLatency: 10890
                }
            };

            const nonReasoningModel: ModelInfo = {
                name: 'gpt-4',
                inputPricePerMillion: 10,
                outputPricePerMillion: 30,
                maxRequestTokens: 8000,
                maxResponseTokens: 2000,
                capabilities: {
                    input: { text: true },
                    output: { text: true }
                },
                characteristics: {
                    qualityIndex: 90,
                    outputSpeed: 15,
                    firstTokenLatency: 200
                }
            };

            const validParams: UniversalChatParams = {
                model: 'o3-mini',
                messages: [{ role: 'user', content: 'Hello' }],
            };

            it('should validate reasoning settings with valid effort values', () => {
                // Setup - model has reasoning capability
                mockModelManager.getModel.mockReturnValue(reasoningModel);

                // Add valid reasoning settings to params
                const params = {
                    ...validParams,
                    settings: {
                        reasoning: { effort: 'medium' as ReasoningEffort }
                    }
                };

                // Verification
                expect(() => validator.validateParams(params)).not.toThrow();
            });

            it('should reject reasoning settings for non-reasoning models', () => {
                // Setup - model does NOT have reasoning capability
                mockModelManager.getModel.mockReturnValue(nonReasoningModel);

                // Add reasoning settings to params for a non-reasoning model
                const params = {
                    ...validParams,
                    model: 'gpt-4',
                    settings: {
                        reasoning: { effort: 'high' as ReasoningEffort }
                    }
                };

                // Verification
                expect(() => validator.validateParams(params)).toThrow(OpenAIResponseValidationError);
                expect(() => validator.validateParams(params)).toThrow(
                    'Reasoning settings can only be used with reasoning-capable models'
                );
            });

            it('should reject invalid reasoning effort values', () => {
                // Setup - model has reasoning capability
                mockModelManager.getModel.mockReturnValue(reasoningModel);

                // Use invalid value for reasoning effort
                const params = {
                    ...validParams,
                    settings: {
                        reasoning: { effort: 'extreme' as any }
                    }
                };

                // Verification
                expect(() => validator.validateParams(params)).toThrow(OpenAIResponseValidationError);
                expect(() => validator.validateParams(params)).toThrow(
                    'Reasoning effort must be one of: low, medium, high'
                );
            });

            it('should reject temperature for reasoning models', () => {
                // Setup - model has reasoning capability
                mockModelManager.getModel.mockReturnValue(reasoningModel);

                // Use temperature with a reasoning model
                const params = {
                    ...validParams,
                    settings: {
                        temperature: 0.7
                    }
                };

                // Verification
                expect(() => validator.validateParams(params)).toThrow(OpenAIResponseValidationError);
                expect(() => validator.validateParams(params)).toThrow(
                    'Temperature cannot be set for reasoning-capable models'
                );
            });

            it('should allow all effort values for reasoning models', () => {
                // Setup - model has reasoning capability
                mockModelManager.getModel.mockReturnValue(reasoningModel);

                // Test all valid effort values
                const effortValues: ReasoningEffort[] = ['low', 'medium', 'high'];

                for (const effort of effortValues) {
                    const params = {
                        ...validParams,
                        settings: {
                            reasoning: { effort }
                        }
                    };

                    // Verification - should not throw for any valid effort value
                    expect(() => validator.validateParams(params)).not.toThrow();
                }
            });
        });
    });

    describe('validateTools', () => {
        it('should return silently when tools array is undefined', () => {
            expect(() => validator.validateTools(undefined)).not.toThrow();
        });

        it('should return silently when tools array is empty', () => {
            expect(() => validator.validateTools([])).not.toThrow();
        });

        it('should throw error when tool is missing name', () => {
            const invalidTool = {
                description: 'Test tool',
                parameters: {
                    type: 'object' as const,
                    properties: {}
                }
            } as unknown as ToolDefinition;

            expect(() => validator.validateTools([invalidTool])).toThrow(OpenAIResponseValidationError);
            expect(() => validator.validateTools([invalidTool])).toThrow('missing \'name\' property');
        });

        it('should throw error when tool is missing parameters', () => {
            const invalidTool = {
                name: 'test-tool',
                description: 'Test tool'
            } as unknown as ToolDefinition;

            expect(() => validator.validateTools([invalidTool])).toThrow(OpenAIResponseValidationError);
            expect(() => validator.validateTools([invalidTool])).toThrow('missing \'parameters\' property');
        });

        it('should throw error when parameters type is not object', () => {
            const invalidTool: ToolDefinition = {
                name: 'test-tool',
                description: 'Test tool',
                parameters: {
                    type: 'string' as any,
                    properties: {}
                }
            };

            expect(() => validator.validateTools([invalidTool])).toThrow(OpenAIResponseValidationError);
            expect(() => validator.validateTools([invalidTool])).toThrow('parameters must have type \'object\'');
        });

        it('should throw error when properties is missing', () => {
            const invalidTool: ToolDefinition = {
                name: 'test-tool',
                description: 'Test tool',
                parameters: {
                    type: 'object',
                    properties: undefined as any
                }
            };

            expect(() => validator.validateTools([invalidTool])).toThrow(OpenAIResponseValidationError);
            expect(() => validator.validateTools([invalidTool])).toThrow('parameters must have \'properties\' defined');
        });

        it('should throw error when parameter is missing type', () => {
            const invalidTool: ToolDefinition = {
                name: 'test-tool',
                description: 'Test tool',
                parameters: {
                    type: 'object',
                    properties: {
                        param1: {} as any
                    }
                }
            };

            expect(() => validator.validateTools([invalidTool])).toThrow(OpenAIResponseValidationError);
            expect(() => validator.validateTools([invalidTool])).toThrow('missing \'type\' property');
        });

        it('should throw error when required parameter is not in properties', () => {
            const invalidTool: ToolDefinition = {
                name: 'test-tool',
                description: 'Test tool',
                parameters: {
                    type: 'object',
                    properties: {
                        param1: { type: 'string' }
                    },
                    required: ['param2']
                }
            };

            expect(() => validator.validateTools([invalidTool])).toThrow(OpenAIResponseValidationError);
            expect(() => validator.validateTools([invalidTool])).toThrow('lists \'param2\' as required but it\'s not defined in properties');
        });

        it('should accept valid tool definition', () => {
            const validTool: ToolDefinition = {
                name: 'test-tool',
                description: 'Test tool',
                parameters: {
                    type: 'object',
                    properties: {
                        param1: { type: 'string' },
                        param2: { type: 'number' }
                    },
                    required: ['param1']
                }
            };

            expect(() => validator.validateTools([validTool])).not.toThrow();
        });

        it('should validate multiple tools in one call', () => {
            const validTool: ToolDefinition = {
                name: 'valid-tool',
                description: 'Valid tool',
                parameters: {
                    type: 'object',
                    properties: {
                        param1: { type: 'string' }
                    }
                }
            };

            const invalidTool = {
                name: 'invalid-tool',
                description: 'Invalid tool'
            } as unknown as ToolDefinition;

            expect(() => validator.validateTools([validTool, invalidTool])).toThrow(OpenAIResponseValidationError);
            expect(() => validator.validateTools([validTool, invalidTool])).toThrow('missing \'parameters\' property');
        });
    });

    describe('validateUniversalTools', () => {
        // This is a private method, so we indirectly test it through validateParams

        it('should throw error when tools is not an array', () => {
            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }],
                model: 'test-model',
                tools: {} as any
            };

            expect(() => validator.validateParams(params)).toThrow(OpenAIResponseValidationError);
            expect(() => validator.validateParams(params)).toThrow('Tools must be an array');
        });

        it('should validate tools during params validation', () => {
            const invalidTool = {
                description: 'Test tool',
                parameters: {
                    type: 'object' as const,
                    properties: {}
                }
            } as unknown as ToolDefinition;

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }],
                model: 'test-model',
                tools: [invalidTool]
            };

            expect(() => validator.validateParams(params)).toThrow(OpenAIResponseValidationError);
            expect(() => validator.validateParams(params)).toThrow('Tool must have a name');
        });

        it('should throw error when tool is missing parameters', () => {
            const invalidTool = {
                name: 'test-tool',
                description: 'Test tool'
            } as unknown as ToolDefinition;

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }],
                model: 'test-model',
                tools: [invalidTool]
            };

            expect(() => validator.validateParams(params)).toThrow(OpenAIResponseValidationError);
            expect(() => validator.validateParams(params)).toThrow('Tool must have parameters');
        });

        it('should throw error when parameters type is not object and properties do not exist', () => {
            const invalidTool: ToolDefinition = {
                name: 'test-tool',
                description: 'Test tool',
                parameters: {
                    type: 'string' as any
                } as any
            };

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }],
                model: 'test-model',
                tools: [invalidTool]
            };

            expect(() => validator.validateParams(params)).toThrow(OpenAIResponseValidationError);
            expect(() => validator.validateParams(params)).toThrow('parameters must be of type \'object\' or have properties defined');
        });

        it('should throw error when parameters type is not object but properties exist', () => {
            const invalidTool: ToolDefinition = {
                name: 'test-tool',
                description: 'Test tool',
                parameters: {
                    type: 'string' as any,
                    properties: {
                        param1: { type: 'string' }
                    }
                } as any
            };

            expect(() => validator.validateTools([invalidTool])).toThrow(OpenAIResponseValidationError);
            expect(() => validator.validateTools([invalidTool])).toThrow('parameters must have type \'object\'');
        });

        it('should log warning but not throw for object type with no properties', () => {
            const warningTool: ToolDefinition = {
                name: 'warning-tool',
                description: 'Warning tool',
                parameters: {
                    type: 'object',
                    properties: {}
                }
            };

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }],
                model: 'test-model',
                tools: [warningTool]
            };

            // This should not throw, as it's a warning case
            expect(() => validator.validateParams(params)).not.toThrow();
        });

        it('should throw error when required parameter is not found in properties', () => {
            const invalidTool: ToolDefinition = {
                name: 'test-tool',
                description: 'Test tool',
                parameters: {
                    type: 'object',
                    properties: {
                        existingParam: { type: 'string' }
                    },
                    required: ['missingParam']
                }
            };

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }],
                model: 'test-model',
                tools: [invalidTool]
            };

            expect(() => validator.validateParams(params)).toThrow(OpenAIResponseValidationError);
            expect(() => validator.validateParams(params)).toThrow('Required parameter missingParam not found in properties');
        });

        it('should accept valid tools during params validation', () => {
            const validTool: ToolDefinition = {
                name: 'test-tool',
                description: 'Test tool',
                parameters: {
                    type: 'object',
                    properties: {
                        param1: { type: 'string' }
                    }
                }
            };

            const params: UniversalChatParams = {
                messages: [{ role: 'user', content: 'test' }],
                model: 'test-model',
                tools: [validTool]
            };

            expect(() => validator.validateParams(params)).not.toThrow();
        });
    });
}); 