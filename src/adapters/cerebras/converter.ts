import type { UniversalChatParams, UniversalChatResponse, UniversalMessage, ResponseFormat, ReasoningEffort, Usage } from '../../interfaces/UniversalInterfaces.ts';
import { FinishReason } from '../../interfaces/UniversalInterfaces.ts';
import type { ToolDefinition, ToolCall } from '../../types/tooling.ts';
import { logger } from '../../utils/logger.ts';
import { ModelManager } from '../../core/models/ModelManager.ts';
import { SchemaValidator } from '../../core/schema/SchemaValidator.ts';
import { SchemaSanitizer } from '../../core/schema/SchemaSanitizer.ts';

type CerebrasMessage = {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_call_id?: string;
};

type CerebrasResponseFormat =
    | { type: 'json_object' }
    | { type: 'json_schema'; json_schema: { name?: string; strict?: boolean; schema: unknown } };

type CerebrasCreateParams = {
    model: string;
    messages: CerebrasMessage[];
    stream?: boolean;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    stop?: string | string[];
    user?: string;
    reasoning_effort?: 'low' | 'medium' | 'high';
    response_format?: CerebrasResponseFormat;
    tools?: Array<{ type: 'function'; function: { name: string; description?: string; parameters: unknown } }>;
};

export class CerebrasConverter {
    constructor(private modelManager: ModelManager) { }

    async convertToProviderParams(model: string, params: UniversalChatParams, opts?: { stream?: boolean }): Promise<CerebrasCreateParams> {
        const log = logger.createLogger({ prefix: 'CerebrasConverter.convertToProviderParams' });
        const { messages, settings, responseFormat, jsonSchema, tools } = params;

        const cerebrasMessages: CerebrasMessage[] = this.mapMessages(messages);

        const providerParams: CerebrasCreateParams = {
            model,
            messages: cerebrasMessages,
            ...(opts?.stream ? { stream: true } : {}),
        } as CerebrasCreateParams;

        // Map settings
        if (settings) {
            if (settings.temperature !== undefined) providerParams.temperature = settings.temperature;
            if (settings.topP !== undefined) providerParams.top_p = settings.topP;
            if (settings.maxTokens !== undefined) providerParams.max_tokens = settings.maxTokens;
            if (settings.stop !== undefined) providerParams.stop = settings.stop as string | string[];
            if (settings.user) providerParams.user = settings.user;

            // Reasoning effort: project memory: minimal -> low for non-GPT-5 [[memory:5593323]]
            const effort = settings.reasoning?.effort;
            if (effort && this.supportsReasoningEffort(model)) {
                providerParams.reasoning_effort = this.mapReasoningEffort(effort);
            }
        }

        // Map response format / JSON
        if (jsonSchema) {
            const raw = SchemaValidator.getSchemaObject(jsonSchema.schema);
            // Flatten unions to avoid Cerebras unsupported anyOf/oneOf
            const { flattenUnions } = await import('../../core/schema/UnionTransformer.js');
            const { schema: flattenedSchema, mapping } = flattenUnions(raw as Record<string, unknown>);
            log.debug('Raw schema object before sanitization:', JSON.stringify(raw, null, 2));

            // Cerebras supports arrays with items, but has strict requirements
            // Sanitize to remove unsupported keywords while preserving array structures
            let sanitized = SchemaSanitizer.sanitize(flattenedSchema as Record<string, unknown>, {
                addHintsToDescriptions: true,
                // Cerebras strict: force required/all props and no additional props
                forceAllRequired: mapping.length === 0,
                forceNoAdditionalProps: true,
                normalizeDefs: true,
                stripMetaKeys: true,
                stripCompositionKeywords: true
            });

            log.debug('Sanitized schema being sent to Cerebras:', JSON.stringify(sanitized, null, 2));

            providerParams.response_format = {
                type: 'json_schema',
                json_schema: {
                    name: jsonSchema.name,
                    strict: true,
                    schema: sanitized
                }
            };

            log.debug('Complete response_format object:', JSON.stringify(providerParams.response_format, null, 2));
        } else if (this.isJsonMode(responseFormat)) {
            providerParams.response_format = { type: 'json_object' };
        }

        // Map tools (function calling)
        if (tools && tools.length > 0) {
            providerParams.tools = tools.map((t: ToolDefinition) => ({
                type: 'function',
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: this.prepareParameters(t)
                }
            }));
        }

        log.debug('Provider params prepared:', providerParams);
        return providerParams;
    }

    private supportsReasoningEffort(model: string): boolean {
        // Per Cerebras docs, reasoning_effort is only available for OpenAI GPT OSS
        return model.includes('gpt-oss');
    }

    // Provider-specific sanitizer no longer needed (using shared sanitizer)

    // no provider-specific array downgrade

    convertFromProviderResponse(resp: unknown): UniversalChatResponse {
        const log = logger.createLogger({ prefix: 'CerebrasConverter.convertFromProviderResponse' });
        // Narrow the response shape safely
        const obj = (resp ?? {}) as Record<string, unknown>;
        const choices = Array.isArray(obj.choices) ? (obj.choices as unknown[]) : [];
        const first = (choices[0] ?? {}) as Record<string, unknown>;
        const message = (first.message ?? {}) as Record<string, unknown>;
        let content: string | null = typeof message.content === 'string' ? message.content : null;
        const reasoning: string | undefined = typeof (message as Record<string, unknown>).reasoning === 'string' ? (message as Record<string, unknown>).reasoning as string : undefined;
        let finishReason = this.mapFinishReason(typeof first.finish_reason === 'string' ? (first.finish_reason as string) : undefined);

        // Check if Cerebras returned tool calls in content as JSON string
        let toolCalls: ToolCall[] | undefined;
        log.debug('Checking for tool calls in content:', { content, contentType: typeof content });
        if (content && content.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(content);
                log.debug('Parsed content as JSON:', parsed);
                // Check if it's a tool call format: {name: "...", parameters: {...}}
                // Cerebras returns tool calls WITHOUT the "type": "function" field
                if (parsed.name && typeof parsed.name === 'string' &&
                    (parsed.parameters || parsed.arguments)) {
                    toolCalls = [{
                        id: `call_${Date.now()}`,
                        name: parsed.name,
                        arguments: parsed.parameters || parsed.arguments || {}
                    }];
                    // Clear content since it's a tool call, not regular text
                    content = null;
                    // Update finish reason to indicate tool call
                    finishReason = FinishReason.TOOL_CALLS;
                    log.debug('Extracted tool call from content:', toolCalls);
                } else {
                    log.debug('Parsed JSON is not a tool call format:', { name: parsed.name, hasParams: !!(parsed.parameters || parsed.arguments) });
                }
            } catch (e) {
                // Not valid JSON or not a tool call, keep as regular content
                log.debug('Content is not valid JSON or not a tool call:', e);
            }
        }

        const universal: UniversalChatResponse = {
            content,
            reasoning,
            role: 'assistant',
            toolCalls,
            metadata: {
                finishReason,
                created: typeof obj.created === 'number' ? (obj.created as number) : undefined,
                model: typeof obj.model === 'string' ? (obj.model as string) : undefined,
                usage: this.mapUsage(obj.usage)
            }
        };
        log.debug('Mapped universal response:', universal);
        return universal;
    }

    minimalConvert(ev: unknown) {
        return { content: '', role: 'assistant', isComplete: false };
    }

    private mapMessages(messages: UniversalMessage[]): CerebrasMessage[] {
        return messages.map((m) => {
            const msg: CerebrasMessage = {
                role: this.mapRole(m.role),
                content: m.content
            };
            // Include tool_call_id for tool messages (required by Cerebras)
            if (m.role === 'tool' && m.toolCallId) {
                msg.tool_call_id = m.toolCallId;
            }
            return msg;
        });
    }

    private mapRole(role: UniversalMessage['role']): CerebrasMessage['role'] {
        if (role === 'developer') return 'system';
        if (role === 'function') return 'tool';
        return (['system', 'user', 'assistant', 'tool'] as const).includes(role as any) ? (role as any) : 'user';
    }

    private isJsonMode(format: ResponseFormat | undefined): boolean {
        if (!format) return false;
        if (format === 'json') return true;
        if (typeof format === 'object' && 'type' in format && (format as any).type === 'json_object') return true;
        return false;
    }

    private mapReasoningEffort(effort: ReasoningEffort): 'low' | 'medium' | 'high' {
        // Map 'minimal' -> 'low' per project guidance [[memory:5593323]]
        if (effort === 'minimal' || effort === 'low') return 'low';
        if (effort === 'high') return 'high';
        return 'medium';
    }

    private mapFinishReason(reason: string | undefined) {
        if (!reason) return FinishReason.STOP;
        if (reason === 'length') return FinishReason.LENGTH;
        if (reason === 'tool_calls') return FinishReason.TOOL_CALLS;
        if (reason === 'stop') return FinishReason.STOP;
        return FinishReason.NULL;
    }

    private mapUsage(usageObj: unknown): Usage | undefined {
        if (!usageObj || typeof usageObj !== 'object') return undefined;
        const u = usageObj as Record<string, unknown>;
        const input = typeof u.prompt_tokens === 'number'
            ? (u.prompt_tokens as number)
            : typeof u.input_tokens === 'number'
                ? (u.input_tokens as number)
                : 0;
        const output = typeof u.completion_tokens === 'number'
            ? (u.completion_tokens as number)
            : typeof u.output_tokens === 'number'
                ? (u.output_tokens as number)
                : 0;
        const total = typeof u.total_tokens === 'number' ? (u.total_tokens as number) : input + output;
        const usage: Usage = {
            tokens: {
                input: { total: input, cached: 0 },
                output: { total: output, reasoning: 0 },
                total
            },
            costs: {
                input: { total: 0, cached: 0 },
                output: { total: 0, reasoning: 0 },
                total: 0
            }
        };
        return usage;
    }

    private prepareParameters(tool: ToolDefinition): unknown {
        const parameters = tool.parameters || { type: 'object', properties: {}, required: [] };
        // Cerebras structured outputs/tooling support accepts JSON Schema-like parameters
        // Ensure additionalProperties=false if required present
        const hasRequired = Array.isArray((parameters as any).required) && (parameters as any).required.length > 0;
        const cloned = { ...(parameters as any) };
        if (hasRequired && cloned.additionalProperties === undefined) {
            cloned.additionalProperties = false;
        }
        return cloned;
    }

}
