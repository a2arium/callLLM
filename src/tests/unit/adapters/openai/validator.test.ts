import { Validator } from '../../../../adapters/openai/validator';
import { AdapterError } from '../../../../adapters/base/baseAdapter';
import type { UniversalChatParams } from '../../../../interfaces/UniversalInterfaces';

describe('Validator', () => {
    let validator: Validator;

    beforeEach(() => {
        validator = new Validator();
    });

    describe('validateParams', () => {
        const validMessage = { role: 'user' as const, content: 'test' };

        describe('messages validation', () => {
            it('should throw error when messages array is missing', () => {
                const params = {} as UniversalChatParams;
                expect(() => validator.validateParams(params)).toThrow(AdapterError);
                expect(() => validator.validateParams(params)).toThrow('Messages array is required and cannot be empty');
            });

            it('should throw error when messages is not an array', () => {
                const params = { messages: {} } as unknown as UniversalChatParams;
                expect(() => validator.validateParams(params)).toThrow(AdapterError);
                expect(() => validator.validateParams(params)).toThrow('Messages array is required and cannot be empty');
            });

            it('should throw error when messages array is empty', () => {
                const params: UniversalChatParams = { messages: [] };
                expect(() => validator.validateParams(params)).toThrow(AdapterError);
                expect(() => validator.validateParams(params)).toThrow('Messages array is required and cannot be empty');
            });

            it('should throw error when message is missing role', () => {
                const params: UniversalChatParams = {
                    messages: [{ content: 'test' }] as any
                };
                expect(() => validator.validateParams(params)).toThrow(AdapterError);
                expect(() => validator.validateParams(params)).toThrow('Each message must have a role and content');
            });

            it('should throw error when message is missing content', () => {
                const params: UniversalChatParams = {
                    messages: [{ role: 'user' }] as any
                };
                expect(() => validator.validateParams(params)).toThrow(AdapterError);
                expect(() => validator.validateParams(params)).toThrow('Each message must have a role and content');
            });

            it('should throw error when message has invalid role', () => {
                const params: UniversalChatParams = {
                    messages: [{ role: 'invalid' as any, content: 'test' }]
                };
                expect(() => validator.validateParams(params)).toThrow(AdapterError);
                expect(() => validator.validateParams(params)).toThrow('Invalid message role. Must be one of: system, user, assistant');
            });

            it('should accept valid message roles', () => {
                const validRoles = ['system', 'user', 'assistant'] as const;
                validRoles.forEach(role => {
                    const params: UniversalChatParams = {
                        messages: [{ role, content: 'test' }]
                    };
                    expect(() => validator.validateParams(params)).not.toThrow();
                });
            });
        });

        describe('settings validation', () => {
            it('should throw error when temperature is out of bounds', () => {
                const testCases = [-0.1, 2.1];
                testCases.forEach(temperature => {
                    const params: UniversalChatParams = {
                        messages: [validMessage],
                        settings: { temperature }
                    };
                    expect(() => validator.validateParams(params)).toThrow(AdapterError);
                    expect(() => validator.validateParams(params)).toThrow('Temperature must be between 0 and 2');
                });
            });

            it('should accept valid temperature values', () => {
                const testCases = [0, 1, 2];
                testCases.forEach(temperature => {
                    const params: UniversalChatParams = {
                        messages: [validMessage],
                        settings: { temperature }
                    };
                    expect(() => validator.validateParams(params)).not.toThrow();
                });
            });

            it('should throw error when maxTokens is invalid', () => {
                const testCases = [0, -1];
                testCases.forEach(maxTokens => {
                    const params: UniversalChatParams = {
                        messages: [validMessage],
                        settings: { maxTokens }
                    };
                    expect(() => validator.validateParams(params)).toThrow(AdapterError);
                    expect(() => validator.validateParams(params)).toThrow('Max tokens must be greater than 0');
                });
            });

            it('should accept valid maxTokens values', () => {
                const params: UniversalChatParams = {
                    messages: [validMessage],
                    settings: { maxTokens: 1 }
                };
                expect(() => validator.validateParams(params)).not.toThrow();
            });

            it('should throw error when topP is out of bounds', () => {
                const testCases = [-0.1, 1.1];
                testCases.forEach(topP => {
                    const params: UniversalChatParams = {
                        messages: [validMessage],
                        settings: { topP }
                    };
                    expect(() => validator.validateParams(params)).toThrow(AdapterError);
                    expect(() => validator.validateParams(params)).toThrow('Top P must be between 0 and 1');
                });
            });

            it('should accept valid topP values', () => {
                const testCases = [0, 0.5, 1];
                testCases.forEach(topP => {
                    const params: UniversalChatParams = {
                        messages: [validMessage],
                        settings: { topP }
                    };
                    expect(() => validator.validateParams(params)).not.toThrow();
                });
            });

            it('should throw error when frequencyPenalty is out of bounds', () => {
                const testCases = [-2.1, 2.1];
                testCases.forEach(frequencyPenalty => {
                    const params: UniversalChatParams = {
                        messages: [validMessage],
                        settings: { frequencyPenalty }
                    };
                    expect(() => validator.validateParams(params)).toThrow(AdapterError);
                    expect(() => validator.validateParams(params)).toThrow('Frequency penalty must be between -2 and 2');
                });
            });

            it('should accept valid frequencyPenalty values', () => {
                const testCases = [-2, 0, 2];
                testCases.forEach(frequencyPenalty => {
                    const params: UniversalChatParams = {
                        messages: [validMessage],
                        settings: { frequencyPenalty }
                    };
                    expect(() => validator.validateParams(params)).not.toThrow();
                });
            });

            it('should throw error when presencePenalty is out of bounds', () => {
                const testCases = [-2.1, 2.1];
                testCases.forEach(presencePenalty => {
                    const params: UniversalChatParams = {
                        messages: [validMessage],
                        settings: { presencePenalty }
                    };
                    expect(() => validator.validateParams(params)).toThrow(AdapterError);
                    expect(() => validator.validateParams(params)).toThrow('Presence penalty must be between -2 and 2');
                });
            });

            it('should accept valid presencePenalty values', () => {
                const testCases = [-2, 0, 2];
                testCases.forEach(presencePenalty => {
                    const params: UniversalChatParams = {
                        messages: [validMessage],
                        settings: { presencePenalty }
                    };
                    expect(() => validator.validateParams(params)).not.toThrow();
                });
            });

            it('should accept params without settings', () => {
                const params: UniversalChatParams = {
                    messages: [validMessage]
                };
                expect(() => validator.validateParams(params)).not.toThrow();
            });
        });
    });
}); 