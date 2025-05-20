import type { Stream } from 'openai/streaming';
import { FinishReason, UniversalStreamResponse } from '../../interfaces/UniversalInterfaces.js';
import type { ToolCall, ToolDefinition } from '../../types/tooling.js';
import { logger } from '../../utils/logger.js';
import * as types from './types.js';
import type { StreamChunk, ToolCallChunk } from '../../core/streaming/types.js'; // Import core types
import { TokenCalculator } from '../../core/models/TokenCalculator.js';

export class StreamHandler {
    private tools?: ToolDefinition[];
    private log = logger.createLogger({ prefix: 'StreamHandler' });
    private toolCallIndex = 0; // Track index for tool calls
    private toolCallMap: Map<string, number> = new Map(); // Map OpenAI item_id to our index
    private inputTokens = 0; // Track input tokens for progress events
    private tokenCalculator?: TokenCalculator; // Optional token calculator for more accurate estimates

    // Add trackers for reported tokens
    private reportedInputTokens = 0;
    private reportedOutputTokens = 0;
    private reportedReasoningTokens = 0;
    private reportedImageTokens = 0;

    constructor(tools?: ToolDefinition[], tokenCalculator?: TokenCalculator) {
        if (tools && tools.length > 0) {
            this.tools = tools;
            this.log.debug(`Initialized with ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`);
        } else {
            this.tools = undefined;
            this.log.debug('Initialized without tools');
        }

        this.tokenCalculator = tokenCalculator;
    }

    /**
     * Updates the tools managed by this handler
     * Used by the adapter to provide tools with special execution properties
     */
    updateTools(tools: ToolDefinition[]): void {
        if (tools && tools.length > 0) {
            this.tools = tools;
            this.log.debug(`Updated with ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`);
        }
    }

    /**
     * Processes a stream of native OpenAI Response API events and
     * converts them to UniversalStreamResponse objects, adapting to StreamChunk format
     * 
     * @param stream AsyncIterable of native OpenAI Response API stream events
     * @returns AsyncGenerator yielding UniversalStreamResponse objects
     */
    async *handleStream(
        stream: Stream<types.ResponseStreamEvent>
    ): AsyncGenerator<UniversalStreamResponse> {
        this.log.debug('Starting to handle native stream...');
        this.toolCallIndex = 0; // Reset index for each stream
        this.toolCallMap.clear(); // Clear map for each stream
        this.inputTokens = 0; // Reset input tokens

        // Reset reported token trackers
        this.reportedInputTokens = 0;
        this.reportedOutputTokens = 0;
        this.reportedReasoningTokens = 0;
        this.reportedImageTokens = 0;

        // State management
        let accumulatedContent = '';
        let finishReason: FinishReason = FinishReason.NULL;
        let aggregatedToolCalls: ToolCall[] = []; // We won't yield this directly anymore
        let isCompleted = false;
        let finalResponse: types.Response | null = null;
        let currentToolCall: types.InternalToolCall | null = null; // Still useful for internal tracking
        let reasoningTokens: number | undefined = undefined; // Track reasoning tokens
        let latestReasoningTokens: number | undefined = undefined; // Track latest reasoning tokens from any event
        let accumulatedReasoning = '';
        let reasoningDelta = '';  // Track incremental reasoning deltas
        let hasReasoningEvents = false; // Track if we've seen any reasoning events

        try {
            for await (const chunk of stream) {
                if ('response' in chunk && chunk.response?.usage) {

                    // If we receive usage data and haven't set input tokens yet, set them now
                    if (chunk.response.usage.input_tokens && this.inputTokens === 0) {
                        this.inputTokens = chunk.response.usage.input_tokens;
                        this.log.debug(`Setting input tokens from stream usage: ${this.inputTokens}`);

                        // Check for image tokens if we have high input token count
                        if (this.inputTokens > 100) {
                            const estimatedTextTokens = 50; // Fixed approximation for text portion
                            const estimatedImageTokens = Math.max(0, this.inputTokens - estimatedTextTokens);
                            this.log.debug(`Detected possible image in stream, estimating ${estimatedImageTokens} image tokens`);
                            this.reportedImageTokens = estimatedImageTokens;
                        }

                        // Update reported input tokens to match what the API reports
                        this.reportedInputTokens = this.inputTokens;
                    }
                }

                // Update latestReasoningTokens if present in any event
                if ('response' in chunk && chunk.response?.usage?.output_tokens_details?.reasoning_tokens !== undefined) {
                    latestReasoningTokens = chunk.response.usage.output_tokens_details.reasoning_tokens;
                    this.log.debug(`Updated latestReasoningTokens: ${latestReasoningTokens}`);
                }

                const outputChunk: Partial<StreamChunk> = {}; // Build the output chunk incrementally
                let yieldChunk = false; // Flag to yield at the end of the switch
                // Reset reasoning delta for each chunk
                reasoningDelta = '';

                switch (chunk.type) {
                    case 'response.output_text.delta': {
                        const textDeltaEvent = chunk as types.ResponseOutputTextDeltaEvent;
                        const delta = textDeltaEvent.delta || '';
                        if (delta) {
                            if (!accumulatedContent.endsWith(delta)) {
                                accumulatedContent += delta;
                                outputChunk.content = delta; // Yield only the delta

                                // Add incremental token count as an estimate
                                const deltaTokenCount = this.tokenCalculator ?
                                    this.tokenCalculator.calculateTokens(delta) :
                                    Math.ceil(delta.length / 4); // Very rough estimate if no calculator

                                // Get the latest known reasoning tokens
                                const currentReasoningTokens = latestReasoningTokens ?? 0;

                                // Only add usage if we have a delta token count
                                if (deltaTokenCount > 0) {
                                    outputChunk.metadata = outputChunk.metadata || {};
                                    outputChunk.metadata.usage = {
                                        tokens: {
                                            input: {
                                                total: this.inputTokens,
                                                cached: 0,
                                                image: this.reportedImageTokens > 0 ? this.reportedImageTokens : undefined
                                            },
                                            output: {
                                                total: deltaTokenCount,
                                                reasoning: currentReasoningTokens
                                            },
                                            total: this.inputTokens + deltaTokenCount + currentReasoningTokens
                                        },
                                        costs: {
                                            input: {
                                                total: 0,
                                                cached: 0
                                            },
                                            output: {
                                                total: 0,
                                                reasoning: 0
                                            },
                                            total: 0
                                        },
                                        incremental: deltaTokenCount // Signal this is an incremental update
                                    };

                                    // Update reported token totals
                                    this.reportedOutputTokens += deltaTokenCount;
                                    this.reportedReasoningTokens = currentReasoningTokens; // This is an absolute value, not incremental
                                }

                                yieldChunk = true;
                            }
                        }
                        break;
                    }

                    case 'response.function_call_arguments.delta': {
                        const argsDeltaEvent = chunk as types.ResponseFunctionCallArgumentsDeltaEvent;
                        const delta = argsDeltaEvent.delta || '';
                        if (delta && argsDeltaEvent.item_id) {
                            const index = this.toolCallMap.get(argsDeltaEvent.item_id);
                            if (index !== undefined) {
                                const toolChunk: ToolCallChunk = {
                                    index,
                                    argumentsChunk: delta,
                                    id: argsDeltaEvent.item_id // Pass the original ID
                                };
                                outputChunk.toolCallChunks = [toolChunk];
                                yieldChunk = true;
                                this.log.debug(`Yielding arguments chunk for index ${index}`);
                            } else {
                                this.log.warn(`Received args delta for unknown item_id: ${argsDeltaEvent.item_id}`);
                            }
                        }
                        break;
                    }

                    case 'response.output_item.added': {
                        const itemAddedEvent = chunk as types.ResponseOutputItemAddedEvent;
                        const item = itemAddedEvent.item;
                        if (item.type === 'function_call') {
                            const functionCallItem = item as any;
                            if (functionCallItem.name && functionCallItem.id) {
                                const index = this.toolCallIndex++;
                                this.toolCallMap.set(functionCallItem.id, index);
                                const toolChunk: ToolCallChunk = {
                                    index,
                                    name: functionCallItem.name,
                                    id: functionCallItem.id
                                };
                                outputChunk.toolCallChunks = [toolChunk];
                                yieldChunk = true;
                                this.log.debug(`Yielding tool name chunk for index ${index}: ${functionCallItem.name}`);
                            }
                        }
                        break;
                    }

                    case 'response.completed': {
                        const completedEvent = chunk as types.ResponseCompletedEvent;
                        finalResponse = completedEvent.response;
                        isCompleted = true;

                        // Store input tokens for use in other events like in_progress
                        if (finalResponse.usage?.input_tokens) {
                            this.inputTokens = finalResponse.usage.input_tokens;
                        }

                        // Extract reasoning summary if available
                        if (finalResponse.output && Array.isArray(finalResponse.output)) {
                            // Look for reasoning items in the output
                            for (const item of finalResponse.output) {
                                if (item.type === 'reasoning' && Array.isArray(item.summary)) {
                                    // Extract the reasoning summary text
                                    const summary = item.summary
                                        .map((summaryItem: any) => summaryItem.text || '')
                                        .filter(Boolean)
                                        .join('\n\n');

                                    if (summary) {
                                        outputChunk.reasoning = summary;
                                        this.log.debug('Found reasoning summary in completed response:', summary.substring(0, 100) + '...');
                                    }
                                    break; // Found what we need
                                }
                            }
                        }

                        // Add accumulated reasoning to the response if available with better logging
                        if (accumulatedReasoning) {
                            outputChunk.reasoning = accumulatedReasoning;
                            this.log.debug(`Added accumulated reasoning to final response. Length: ${accumulatedReasoning.length}`);
                            this.log.debug(`Reasoning summary: "${accumulatedReasoning.substring(0, 100)}..."`);
                        } else {
                            this.log.debug('No accumulated reasoning available for final response');
                        }

                        // Determine final finish reason based on the API response
                        if (finalResponse.status === 'completed' && finalResponse.output && finalResponse.output.some((item: any) => item.type === 'function_call')) {
                            finishReason = FinishReason.TOOL_CALLS;
                        } else if (finalResponse.status === 'completed') {
                            finishReason = FinishReason.STOP;
                        } else if (finalResponse.status === 'incomplete') {
                            finishReason = FinishReason.LENGTH;
                        } else {
                            finishReason = FinishReason.ERROR; // Default or handle other statuses
                        }

                        outputChunk.isComplete = true;
                        outputChunk.metadata = {
                            finishReason,
                            model: finalResponse.model || ''
                        };

                        // Add usage information if available
                        if (finalResponse.usage) {
                            outputChunk.metadata = outputChunk.metadata || {};
                            const usageDetails = (finalResponse.usage as any).output_tokens_details ?? {};
                            const reasoningTokens = usageDetails.reasoning_tokens || 0;

                            // Extract full token counts from API response (source of truth)
                            const actualInputTokens = finalResponse.usage.input_tokens || 0;
                            const actualOutputTokens = finalResponse.usage.output_tokens || 0;
                            const actualCachedTokens = (finalResponse.usage as any).input_tokens_details?.cached_tokens || 0;
                            const actualTotalTokens = finalResponse.usage.total_tokens || 0;

                            // Calculate image tokens if input tokens are high (similar to non-streaming logic)
                            let imageTokens = 0;
                            if (actualInputTokens > 100) {
                                const estimatedTextTokens = 50; // Fixed approximation for text portion
                                imageTokens = Math.max(0, actualInputTokens - estimatedTextTokens);
                                this.log.debug(`Estimated image tokens in stream: ${imageTokens} (raw: ${actualInputTokens}, text: ~${estimatedTextTokens})`);
                            }

                            // Calculate deltas between reported and actual totals
                            // We only want to report the difference to avoid double-counting
                            const inputTokensDelta = Math.max(0, actualInputTokens - this.reportedInputTokens);
                            // For output tokens, we need to handle the case where we've been estimating
                            // and the actual count might be different
                            const outputTokensDelta = Math.max(0, actualOutputTokens - this.reportedOutputTokens);
                            const reasoningTokensDelta = Math.max(0, reasoningTokens - this.reportedReasoningTokens);
                            const imageTokensDelta = Math.max(0, imageTokens - this.reportedImageTokens);

                            this.log.debug(`Final token counts - actual input: ${actualInputTokens}, output: ${actualOutputTokens}, ` +
                                `reasoning: ${reasoningTokens}, image: ${imageTokens}, total: ${actualTotalTokens}`);
                            this.log.debug(`Previously reported - input: ${this.reportedInputTokens}, output: ${this.reportedOutputTokens}, ` +
                                `reasoning: ${this.reportedReasoningTokens}, image: ${this.reportedImageTokens}`);
                            this.log.debug(`Token deltas in final chunk - input: ${inputTokensDelta}, output: ${outputTokensDelta}, ` +
                                `reasoning: ${reasoningTokensDelta}, image: ${imageTokensDelta}`);

                            // Update the final usage with the EXACT structure we want in the output
                            // This matches what we'd expect from a non-streaming response
                            outputChunk.metadata.usage = {
                                tokens: {
                                    input: {
                                        total: actualInputTokens,
                                        cached: actualCachedTokens,
                                        image: imageTokens > 0 ? imageTokens : undefined
                                    },
                                    output: {
                                        total: actualOutputTokens,
                                        reasoning: reasoningTokens
                                    },
                                    total: actualTotalTokens
                                },
                                costs: {
                                    input: {
                                        total: 0,
                                        cached: 0
                                    },
                                    output: {
                                        total: 0,
                                        reasoning: 0
                                    },
                                    total: 0
                                },
                                incremental: false
                            };

                            // Update reported totals to match actual values
                            this.reportedInputTokens = actualInputTokens;
                            this.reportedOutputTokens = actualOutputTokens;
                            this.reportedReasoningTokens = reasoningTokens;
                            this.reportedImageTokens = imageTokens;
                        }

                        yieldChunk = true;
                        this.log.debug(`Stream completed, final finish reason: ${finishReason}`);
                        break;
                    }

                    case 'response.failed': {
                        const failedEvent = chunk as types.ResponseFailedEvent;
                        this.log.error('Stream failed event received:', failedEvent);
                        isCompleted = true;
                        finishReason = FinishReason.ERROR;
                        outputChunk.isComplete = true;
                        // Access the error message safely
                        const errorMessage = (failedEvent as any).error?.message || 'Unknown stream error';
                        outputChunk.metadata = { finishReason, toolError: errorMessage };
                        yieldChunk = true;
                        break;
                    }

                    case 'response.incomplete': {
                        const incompleteEvent = chunk as types.ResponseIncompleteEvent;
                        this.log.debug('Incomplete response event received');
                        isCompleted = true;
                        finishReason = FinishReason.LENGTH;
                        outputChunk.isComplete = true;
                        outputChunk.metadata = { finishReason };
                        yieldChunk = true;
                        break;
                    }

                    // Other events are handled for logging or state but might not yield a chunk directly
                    case 'response.output_text.done':
                        this.log.debug('Text output done.');
                        break;
                    case 'response.function_call_arguments.done':
                        const argsDoneEvent = chunk as types.ResponseFunctionCallArgumentsDoneEvent;
                        this.log.debug(`Function call arguments done event received for item ID: ${argsDoneEvent.item_id}`);
                        // Accumulator handles assembly, we just log completion
                        break;
                    case 'response.created':
                        const createdEvent = chunk as types.ResponseCreatedEvent;
                        this.log.debug('Stream created event received');
                        break;
                    case 'response.in_progress':
                        const inProgressEvent = chunk as types.ResponseInProgressEvent;
                        this.log.debug('Stream in progress event received');

                        // Handle incremental updates for reasoning tokens if available
                        if ('response' in chunk && chunk.response?.usage?.output_tokens) {
                            const outputTokens = chunk.response.usage.output_tokens;
                            // Use the latest known reasoning tokens value
                            const reasoningTokens = latestReasoningTokens ?? 0;
                            this.log.debug(`In progress: output_tokens=${outputTokens}, reasoning_tokens=${reasoningTokens}`);

                            // Add incremental usage update
                            outputChunk.metadata = outputChunk.metadata || {};
                            outputChunk.metadata.usage = {
                                tokens: {
                                    input: {
                                        total: this.inputTokens || 0,
                                        cached: 0,
                                        image: this.reportedImageTokens > 0 ? this.reportedImageTokens : undefined
                                    },
                                    output: {
                                        total: outputTokens,
                                        reasoning: reasoningTokens
                                    },
                                    total: (this.inputTokens || 0) + outputTokens + reasoningTokens
                                },
                                costs: {
                                    input: {
                                        total: 0,
                                        cached: 0
                                    },
                                    output: {
                                        total: 0,
                                        reasoning: 0
                                    },
                                    total: 0
                                },
                                incremental: true // Signal this is an incremental update
                            };

                            // Update reported token totals
                            this.reportedInputTokens = this.inputTokens;
                            this.reportedOutputTokens = outputTokens;
                            this.reportedReasoningTokens = reasoningTokens;

                            yieldChunk = true;
                        }
                        break;
                    case 'response.content_part.added':
                        const contentPartEvent = chunk as types.ResponseContentPartAddedEvent;
                        const contentPart = contentPartEvent.content || '';
                        if (contentPart && typeof contentPart === 'string') {
                            if (!accumulatedContent.endsWith(contentPart)) {
                                accumulatedContent += contentPart;
                                outputChunk.content = contentPart;
                                yieldChunk = true;
                            }
                        }
                        break;
                    case 'response.content_part.done':
                        const contentPartDoneEvent = chunk as types.ResponseContentPartDoneEvent;
                        this.log.debug('Content part completed event received');
                        break;
                    case 'response.output_item.done':
                        const outputItemDoneEvent = chunk as types.ResponseOutputItemDoneEvent;
                        this.log.debug('Output item completed event received');
                        break;
                    case 'response.reasoning_summary_text.delta': {
                        const textDeltaEvent = chunk as types.ResponseReasoningSummaryTextDeltaEvent;
                        const delta = textDeltaEvent.delta || '';
                        if (delta) {
                            hasReasoningEvents = true;
                            accumulatedReasoning += delta;
                            reasoningDelta = delta;
                            outputChunk.reasoning = delta;

                            // More verbose logging to track reasoning events
                            this.log.debug(`REASONING DELTA RECEIVED: "${delta}"`);
                            this.log.debug(`Current accumulated reasoning length: ${accumulatedReasoning.length}`);

                            // Force yield for reasoning chunks - this is critical
                            yieldChunk = true;
                        }
                        break;
                    }
                    case 'response.reasoning_summary_part.added': {
                        this.log.debug('Reasoning summary part added');
                        hasReasoningEvents = true;
                        break;
                    }
                    case 'response.reasoning_summary_text.done': {
                        this.log.debug('Reasoning summary text done');
                        hasReasoningEvents = true;
                        break;
                    }
                    case 'response.reasoning_summary_part.done': {
                        this.log.debug('Reasoning summary part done');
                        hasReasoningEvents = true;
                        break;
                    }
                    default:
                        this.log.warn(`Unhandled stream event type: ${chunk.type}`);
                }

                // Yield the assembled UniversalStreamResponse chunk
                if (yieldChunk) {
                    // IMPORTANT: We yield UniversalStreamResponse, but structure it like a StreamChunk
                    // for the pipeline processors (e.g., ContentAccumulator) to handle.

                    // For reasoning, include the delta during streaming or accumulated when complete
                    // If we have a new reasoning delta specifically for this chunk, make sure it's included
                    const reasoningContent = outputChunk.isComplete
                        ? accumulatedReasoning
                        : outputChunk.reasoning || reasoningDelta;

                    // Debug if reasoning is present
                    if (reasoningContent) {
                        this.log.debug(`YIELDING REASONING CONTENT: ${reasoningContent.substring(0, 50)}...`);
                    }

                    // For better debugging, add a tracker for reasoning events
                    if (chunk.type.includes('reasoning')) {
                        this.log.debug(`PROCESSING REASONING EVENT: ${chunk.type}`);
                        // Add additional debugging for reasoning-specific events
                        this.log.debug('Reasoning event details:', JSON.stringify(chunk));
                    }

                    const responseChunk: UniversalStreamResponse = {
                        content: outputChunk.content || '',
                        role: 'assistant',
                        isComplete: !!outputChunk.isComplete,
                        reasoning: reasoningContent, // Include reasoning delta or full reasoning
                        toolCalls: undefined, // Let the accumulator handle this
                        toolCallChunks: outputChunk.toolCallChunks, // Pass raw chunks
                        metadata: {
                            finishReason: finishReason,
                            model: (outputChunk.metadata?.model as string) || '',
                            ...(outputChunk.metadata || {}) // Include other metadata
                        },
                        contentText: accumulatedContent // Always include the latest accumulated text
                    };

                    // Enhanced logging for troubleshooting
                    this.log.debug(`Yielding response chunk with properties:
                        - content length: ${(outputChunk.content || '').length}
                        - has reasoning: ${reasoningContent ? true : false}
                        - reasoning length: ${reasoningContent ? reasoningContent.length : 0}
                        - is complete: ${!!outputChunk.isComplete}
                    `);

                    yield responseChunk;
                }

                if (isCompleted) {
                    // Log reasoning stats before exiting
                    this.log.debug(`Stream completed. Received reasoning events: ${hasReasoningEvents}`);
                    this.log.debug(`Final accumulated reasoning length: ${accumulatedReasoning.length}`);
                    break; // End the loop after the final response
                }
            }
        } catch (error) {
            this.log.error('Error processing stream:', error);
            // Yield an error response
            yield {
                content: '',
                contentText: accumulatedContent,
                role: 'assistant',
                isComplete: true,
                toolCalls: undefined,
                toolCallChunks: undefined,
                metadata: {
                    finishReason: FinishReason.ERROR,
                    toolError: error instanceof Error ? error.message : String(error)
                }
            };
        }
        this.log.debug('Stream handling finished.');
    }
} 