import type { UniversalChatParams, UniversalChatResponse, UniversalMessage, ResponseFormat, Usage } from '../../interfaces/UniversalInterfaces.ts';
import { FinishReason } from '../../interfaces/UniversalInterfaces.ts';
import type { ToolDefinition, ToolCall } from '../../types/tooling.ts';
import { logger } from '../../utils/logger.ts';
import { ModelManager } from '../../core/models/ModelManager.ts';
import { jsonSchemaToZod } from '../../core/schema/JsonSchemaToZod.ts';
import { SchemaValidator } from '../../core/schema/SchemaValidator.ts';
import { SchemaSanitizer } from '../../core/schema/SchemaSanitizer.ts';
import { ToolType } from '@openrouter/sdk';
import type { CallModelInput } from '@openrouter/sdk';
import type { OpenRouterProviderOptions } from './types.ts';

export class OpenRouterConverter {
    constructor(private modelManager: ModelManager) { }

    convertToCallModelInput(model: string, params: UniversalChatParams): CallModelInput {
        const log = logger.createLogger({ prefix: 'OpenRouterConverter.convertToCallModelInput' });
        const { messages, settings, responseFormat, jsonSchema, tools, systemMessage } = params;

        const input: CallModelInput = {
            model,
            input: this.mapMessages(messages),
        };

        // Map system message to instructions
        if (systemMessage) {
            input.instructions = systemMessage;
        }

        // Map settings
        if (settings) {
            if (settings.temperature !== undefined) input.temperature = settings.temperature;
            if (settings.maxTokens !== undefined) input.maxOutputTokens = settings.maxTokens;
            if (settings.topP !== undefined) input.topP = settings.topP;
            if (settings.user) input.user = settings.user;

            if (settings.reasoning?.effort) {
                input.reasoning = {
                    effort: this.mapReasoningEffort(settings.reasoning.effort),
                } as any;
            }

            // Pass through OpenRouter-specific provider options
            if (settings.providerOptions?.openrouter) {
                const orOpts = settings.providerOptions.openrouter as OpenRouterProviderOptions;
                if (orOpts.provider) input.provider = orOpts.provider as any;
                if (orOpts.models) input.models = orOpts.models;
            }
        }

        // Map response format / JSON mode
        if (jsonSchema) {
            const schemaObject = SchemaValidator.getSchemaObject(jsonSchema.schema);
            const sanitized = SchemaSanitizer.sanitize(schemaObject as any, {
                forceAllRequired: true,
                forceNoAdditionalProps: true,
                addHintsToDescriptions: true,
            });
            input.text = {
                format: {
                    type: 'json_schema',
                    name: jsonSchema.name || 'response',
                    schema: sanitized as any,
                },
            } as any;
        } else if (this.isJsonMode(responseFormat)) {
            input.text = { format: { type: 'json_object' } } as any;
        }

        // Map tools as ManualTools (no execute function = SDK won't auto-execute)
        if (tools && tools.length > 0) {
            input.tools = this.mapTools(tools) as any;
        }

        log.debug('CallModelInput prepared:', input);
        return input;
    }

    convertFromProviderResponse(response: any): UniversalChatResponse {
        const log = logger.createLogger({ prefix: 'OpenRouterConverter.convertFromProviderResponse' });

        // Extract text content from output items
        let content: string | null = null;
        let reasoning: string | undefined;
        const toolCalls: ToolCall[] = [];

        if (response.output && Array.isArray(response.output)) {
            for (const item of response.output) {
                if (item.type === 'message' && Array.isArray(item.content)) {
                    for (const contentItem of item.content) {
                        if (contentItem.type === 'output_text') {
                            content = (content || '') + (contentItem.text || '');
                        } else if (contentItem.type === 'refusal') {
                            content = (content || '') + (contentItem.refusal || '');
                        }
                    }
                } else if (item.type === 'reasoning') {
                    reasoning = (reasoning || '') + (item.summary?.[0]?.text || '');
                } else if (item.type === 'function_call') {
                    let args = item.arguments;
                    if (typeof args === 'string') {
                        try { args = JSON.parse(args); } catch {
                            log.error('Failed to parse tool call arguments:', args);
                            args = {};
                        }
                    }
                    toolCalls.push({
                        id: item.callId || item.call_id || item.id,
                        name: item.name,
                        arguments: args,
                    });
                }
            }
        }

        const usage = this.mapUsage(response.usage);

        const universal: UniversalChatResponse = {
            content,
            reasoning,
            role: 'assistant',
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            metadata: {
                finishReason: toolCalls.length > 0 ? FinishReason.TOOL_CALLS : FinishReason.STOP,
                model: response.model,
                usage,
            },
        };

        return universal;
    }

    private mapMessages(messages: UniversalMessage[]): any[] {
        return messages.map((m) => {
            const role = this.mapRole(m.role);
            let content = m.content;

            // OpenRouter expects non-empty content
            if (!content && (m.role === 'assistant' || m.role === 'developer' || m.role === 'system')) {
                content = ' ';
            }

            const msg: any = { role, content };

            if (m.name) msg.name = m.name;
            if (m.toolCallId) msg.tool_call_id = m.toolCallId;

            if (m.toolCalls && m.toolCalls.length > 0) {
                msg.tool_calls = (m.toolCalls as ToolCall[]).map((tc) => ({
                    id: tc.id,
                    type: 'function',
                    function: {
                        name: tc.name,
                        arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments),
                    },
                }));
            }

            return msg;
        });
    }

    private mapTools(tools: ToolDefinition[]): any[] {
        // Construct ManualTool objects directly (bypassing the SDK's tool() helper)
        // to avoid Zod version conflicts between our zod and the SDK's bundled zod.
        // ManualTool has no execute function, so the SDK won't auto-execute.
        return tools.map((t: ToolDefinition) => {
            const inputSchema = t.parameters
                ? jsonSchemaToZod(t.parameters as Record<string, unknown>)
                : undefined;

            return {
                type: ToolType.Function,
                function: {
                    name: t.name,
                    description: t.description || '',
                    ...(inputSchema ? { inputSchema } : {}),
                },
            };
        });
    }

    private mapRole(role: UniversalMessage['role']): string {
        if (role === 'developer') return 'system';
        if (role === 'system') return 'system';
        if (role === 'function') return 'tool';
        return role;
    }

    private isJsonMode(format: ResponseFormat | undefined): boolean {
        if (!format) return false;
        if (format === 'json') return true;
        if (typeof format === 'object' && 'type' in format && (format as any).type === 'json_object') return true;
        return false;
    }

    private mapReasoningEffort(effort: string): string {
        if (effort === 'minimal' || effort === 'low') return 'low';
        if (effort === 'high') return 'high';
        return 'medium';
    }

    mapUsage(usageObj: any): Usage | undefined {
        if (!usageObj) return undefined;
        const input = usageObj.inputTokens || usageObj.prompt_tokens || 0;
        const output = usageObj.outputTokens || usageObj.completion_tokens || 0;
        const cached = usageObj.cachedTokens || usageObj.prompt_tokens_details?.cached_tokens || 0;

        return {
            tokens: {
                input: { total: input, cached },
                output: { total: output, reasoning: 0 },
                total: input + output,
            },
            costs: {
                input: { total: 0, cached: 0 },
                output: { total: 0, reasoning: 0 },
                total: 0,
            },
        };
    }
}
