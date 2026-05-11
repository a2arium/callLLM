import type { UniversalChatParams, UniversalChatResponse, UniversalMessage, ResponseFormat, Usage } from '../../interfaces/UniversalInterfaces.ts';
import { FinishReason } from '../../interfaces/UniversalInterfaces.ts';
import type { ToolDefinition, ToolCall } from '../../types/tooling.ts';
import { logger } from '../../utils/logger.ts';
import { ModelManager } from '../../core/models/ModelManager.ts';
import { SchemaValidator } from '../../core/schema/SchemaValidator.ts';
import { SchemaSanitizer } from '../../core/schema/SchemaSanitizer.ts';
import type { VeniceCreateParams, VeniceChatCompletionResponse, VeniceParameters } from './types.ts';

export class VeniceConverter {
    constructor(private modelManager: ModelManager) { }

    async convertToProviderParams(model: string, params: UniversalChatParams, opts?: { stream?: boolean }): Promise<VeniceCreateParams> {
        const log = logger.createLogger({ prefix: 'VeniceConverter.convertToProviderParams' });
        const { messages, settings, responseFormat, jsonSchema, tools } = params;

        const veniceMessages = this.mapMessages(messages);

        const providerParams: VeniceCreateParams = {
            model,
            messages: veniceMessages,
            stream: opts?.stream || false,
        };

        // Map settings
        if (settings) {
            if (settings.temperature !== undefined) providerParams.temperature = settings.temperature;
            if (settings.topP !== undefined) providerParams.top_p = settings.topP;
            if (settings.maxTokens !== undefined) providerParams.max_tokens = settings.maxTokens;
            if (settings.stop !== undefined) providerParams.stop = settings.stop as string | string[];
            if (settings.user) providerParams.user = settings.user;

            if (settings.reasoning?.effort) {
                providerParams.reasoning_effort = this.mapReasoningEffort(settings.reasoning.effort) as any;
            }

            // Map Venice specific parameters from providerOptions
            if (settings.providerOptions?.venice_parameters) {
                providerParams.venice_parameters = settings.providerOptions.venice_parameters as VeniceParameters;
            }
        }

        // Map response format / JSON
        // Note: Venice hangs when using 'json_schema' (strict mode) with many models.
        // We fallback to 'json_object' if the model claims native JSON support.
        // If it doesn't support native JSON, we omit the flag and rely on ChatController's 
        // prompt enhancement (which happens BEFORE this call).
        const modelInfo = this.modelManager.getModel(model);
        const textCaps = modelInfo?.capabilities?.output?.text;
        const supportsNativeJson = typeof textCaps === 'object' && textCaps.textOutputFormats?.includes('json');

        if (supportsNativeJson && (jsonSchema || this.isJsonMode(responseFormat))) {
            providerParams.response_format = { type: 'json_object' };
        }

        // Map tools
        if (tools && tools.length > 0) {
            providerParams.tools = tools.map((t: ToolDefinition) => ({
                type: 'function',
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters || { type: 'object', properties: {}, required: [] }
                }
            })) as any;
        }

        log.debug('Provider params prepared:', providerParams);
        // console.log('[DEBUG] VeniceConverter: Returning providerParams');
        return providerParams;
    }

    convertFromProviderResponse(resp: unknown): UniversalChatResponse {
        const log = logger.createLogger({ prefix: 'VeniceConverter.convertFromProviderResponse' });
        const obj = resp as VeniceChatCompletionResponse;
        const choice = obj.choices[0];
        const message = choice.message;

        const toolCallsRaw = (message.tool_calls as any[]);
        const toolCalls = toolCallsRaw?.map(tc => {
            let args = tc.function.arguments;
            if (typeof args === 'string') {
                try {
                    args = JSON.parse(args);
                } catch (e) {
                    log.error('Failed to parse tool call arguments:', args);
                    args = {};
                }
            }
            return {
                id: tc.id,
                name: tc.function.name,
                arguments: args
            } as ToolCall;
        });

        const universal: UniversalChatResponse = {
            content: message.content,
            reasoning: message.reasoning_content,
            role: 'assistant',
            toolCalls: toolCalls as ToolCall[] | undefined,
            metadata: {
                finishReason: this.mapFinishReason(choice.finish_reason),
                created: obj.created,
                model: obj.model,
                usage: this.mapUsage(obj.usage)
            }
        };

        return universal;
    }

    private mapMessages(messages: UniversalMessage[]): any[] {
        return messages.map((m) => {
            const role = this.mapRole(m.role);
            let content = m.content;

            // Venice requires non-empty content for all messages except the final assistant message.
            // When tool calls are present, content is often empty. We use a space as a fallback.
            if (!content && (m.role === 'assistant' || m.role === 'developer' || m.role === 'system')) {
                content = ' ';
            }

            const hasToolCalls = m.toolCalls && m.toolCalls.length > 0;
            return {
                role,
                content,
                ...(m.name ? { name: m.name } : {}),
                ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
                ...(hasToolCalls ? { tool_calls: this.mapToolCallsToProvider(m.toolCalls as any) } : {})
            } as any;
        });
    }

    private mapToolCallsToProvider(toolCalls: ToolCall[]): any[] {
        return toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: {
                name: tc.name,
                arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments)
            }
        }));
    }

    private mapRole(role: UniversalMessage['role']): string {
        // Venice aggregated models often don't support 'developer' role.
        // We map it to 'system' for better compatibility.
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

    private mapFinishReason(reason: string | undefined): FinishReason {
        if (!reason) return FinishReason.STOP;
        switch (reason) {
            case 'stop': return FinishReason.STOP;
            case 'length': return FinishReason.LENGTH;
            case 'tool_calls': return FinishReason.TOOL_CALLS;
            case 'content_filter': return FinishReason.CONTENT_FILTER;
            default: return FinishReason.NULL;
        }
    }

    private mapUsage(usageObj: any): Usage | undefined {
        if (!usageObj) return undefined;
        const input = usageObj.prompt_tokens || 0;
        const output = usageObj.completion_tokens || 0;
        const reasoning = usageObj.completion_tokens_details?.reasoning_tokens || 0;
        const cached = usageObj.prompt_tokens_details?.cached_tokens || 0;

        return {
            tokens: {
                input: { total: input, cached },
                output: { total: output, reasoning },
                total: input + output
            },
            costs: {
                input: { total: 0, cached: 0 },
                output: { total: 0, reasoning: 0 },
                total: 0,
                unit: 'USD'
            }
        };
    }
}
