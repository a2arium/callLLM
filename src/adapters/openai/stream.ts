import type { Stream } from 'openai/streaming';
import { FinishReason, UniversalStreamResponse } from '../../interfaces/UniversalInterfaces';
import type { ToolCall, ToolDefinition } from '../../types/tooling';
import { logger } from '../../utils/logger';
import * as types from './types';
import type { StreamChunk, ToolCallChunk } from '../../core/streaming/types'; // Import core types

export class StreamHandler {
    private tools?: ToolDefinition[];
    private log = logger.createLogger({ prefix: 'StreamHandler' });
    private toolCallIndex = 0; // Track index for tool calls
    private toolCallMap: Map<string, number> = new Map(); // Map OpenAI item_id to our index

    constructor(tools?: ToolDefinition[]) {
        if (tools && tools.length > 0) {
            this.tools = tools;
            this.log.debug(`Initialized with ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`);
        } else {
            this.tools = undefined;
            this.log.debug('Initialized without tools');
        }
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

        // State management
        let accumulatedContent = '';
        let finishReason: FinishReason = FinishReason.NULL;
        let aggregatedToolCalls: ToolCall[] = []; // We won't yield this directly anymore
        let isCompleted = false;
        let finalResponse: types.Response | null = null;
        let currentToolCall: types.InternalToolCall | null = null; // Still useful for internal tracking

        try {
            for await (const chunk of stream) {
                this.log.debug(`Received stream event: ${chunk.type}`);

                const outputChunk: Partial<StreamChunk> = {}; // Build the output chunk incrementally
                let yieldChunk = false; // Flag to yield at the end of the switch

                switch (chunk.type) {
                    case 'response.output_text.delta': {
                        const textDeltaEvent = chunk as types.ResponseOutputTextDeltaEvent;
                        const delta = textDeltaEvent.delta || '';
                        if (delta) {
                            if (!accumulatedContent.endsWith(delta)) {
                                accumulatedContent += delta;
                                outputChunk.content = delta; // Yield only the delta
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

                        // Determine final finish reason based on the API response
                        if (finalResponse.status === 'completed' && finalResponse.output && finalResponse.output.some(item => item.type === 'function_call')) {
                            finishReason = FinishReason.TOOL_CALLS;
                        } else if (finalResponse.status === 'completed') {
                            finishReason = FinishReason.STOP;
                        } else if (finalResponse.status === 'incomplete') {
                            finishReason = FinishReason.LENGTH;
                        } else {
                            finishReason = FinishReason.ERROR; // Default or handle other statuses
                        }

                        outputChunk.isComplete = true;
                        outputChunk.metadata = { finishReason, model: finalResponse.model || '' };
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
                    default:
                        this.log.warn(`Unhandled stream event type: ${chunk.type}`);
                }

                // Yield the assembled UniversalStreamResponse chunk
                if (yieldChunk) {
                    // IMPORTANT: We yield UniversalStreamResponse, but structure it like a StreamChunk
                    // for the pipeline processors (e.g., ContentAccumulator) to handle.
                    const responseChunk: UniversalStreamResponse = {
                        content: outputChunk.content || '',
                        role: 'assistant',
                        isComplete: !!outputChunk.isComplete,
                        toolCalls: undefined, // Let the accumulator handle this
                        toolCallChunks: outputChunk.toolCallChunks, // Pass raw chunks
                        metadata: {
                            finishReason: finishReason,
                            model: (outputChunk.metadata?.model as string) || '',
                            ...(outputChunk.metadata || {}) // Include other metadata
                        },
                        contentText: accumulatedContent // Always include the latest accumulated text
                    };
                    this.log.debug('Yielding processed chunk:', JSON.stringify(responseChunk, null, 2));
                    yield responseChunk;
                }

                if (isCompleted) {
                    this.log.debug('Exiting stream handling loop due to completion.');
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