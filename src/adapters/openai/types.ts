import { OpenAI } from 'openai';
import { ReasoningEffort } from '../../interfaces/UniversalInterfaces.js';

// Type aliases for OpenAI Response API
export type ResponseCreateParams = OpenAI.Responses.ResponseCreateParams;
export type ResponseCreateParamsNonStreaming = OpenAI.Responses.ResponseCreateParamsNonStreaming;
export type ResponseCreateParamsStreaming = OpenAI.Responses.ResponseCreateParamsStreaming;
export type Response = OpenAI.Responses.Response;
export type ResponseStreamEvent = OpenAI.Responses.ResponseStreamEvent
    | ResponseCreatedEvent
    | ResponseInProgressEvent
    | ResponseContentPartAddedEvent
    | ResponseContentPartDoneEvent
    | ResponseOutputItemDoneEvent
    | ResponseIncompleteEvent
    | ResponseReasoningSummaryPartAddedEvent
    | ResponseReasoningSummaryTextDeltaEvent
    | ResponseReasoningSummaryTextDoneEvent
    | ResponseReasoningSummaryPartDoneEvent;
export type ResponseOutputTextDeltaEvent = OpenAI.Responses.ResponseTextDeltaEvent;
export type ResponseOutputTextDoneEvent = OpenAI.Responses.ResponseTextDoneEvent;
export type ResponseFunctionCallArgumentsDeltaEvent = OpenAI.Responses.ResponseFunctionCallArgumentsDeltaEvent;
export type ResponseFunctionCallArgumentsDoneEvent = OpenAI.Responses.ResponseFunctionCallArgumentsDoneEvent;
export type ResponseOutputItemAddedEvent = OpenAI.Responses.ResponseOutputItemAddedEvent;
export type ResponseFailedEvent = OpenAI.Responses.ResponseFailedEvent;
export type ResponseCompletedEvent = OpenAI.Responses.ResponseCompletedEvent;
export type ResponseFunctionToolCall = OpenAI.Responses.ResponseFunctionToolCall;
export type FunctionTool = OpenAI.Responses.FunctionTool;
export type Tool = OpenAI.Responses.Tool;
export type ResponseOutputItem = OpenAI.Responses.ResponseOutputItem;
export type ResponseOutputMessage = OpenAI.Responses.ResponseOutputMessage;
export type ResponseInputItem = OpenAI.Responses.ResponseInputItem;
export type ResponseContent = OpenAI.Responses.ResponseContent;
export type ResponseInputText = OpenAI.Responses.ResponseInputText;
export type ResponseUsage = OpenAI.Responses.ResponseUsage;
export type ResponseTextConfig = OpenAI.Responses.ResponseTextConfig;
export type EasyInputMessage = OpenAI.Responses.EasyInputMessage;

// Additional event types (if not already exposed by the OpenAI SDK)
export type ResponseCreatedEvent = { type: 'response.created' };
export type ResponseInProgressEvent = { type: 'response.in_progress' };
export type ResponseContentPartAddedEvent = {
    type: 'response.content_part.added';
    content?: string;
};
export type ResponseContentPartDoneEvent = { type: 'response.content_part.done' };
export type ResponseOutputItemDoneEvent = { type: 'response.output_item.done' };
export type ResponseIncompleteEvent = { type: 'response.incomplete' };

// Reasoning summary event types
export type ResponseReasoningSummaryPartAddedEvent = {
    type: 'response.reasoning_summary_part.added';
};
export type ResponseReasoningSummaryTextDeltaEvent = {
    type: 'response.reasoning_summary_text.delta';
    delta?: string;
};
export type ResponseReasoningSummaryTextDoneEvent = {
    type: 'response.reasoning_summary_text.done';
};
export type ResponseReasoningSummaryPartDoneEvent = {
    type: 'response.reasoning_summary_part.done';
};

// Custom internal types
export type InternalToolCall = {
    id?: string;
    name: string;
    arguments: Record<string, unknown>;
    rawArguments?: string;
};

// Custom Reasoning type for the adapter
export type Reasoning = {
    effort: ReasoningEffort;
    summary?: 'auto' | 'concise' | 'detailed' | null;
};
