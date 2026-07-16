/** Runtime-only execution controls. These values are never serialized to providers. */
export type LLMExecutionControl = {
    signal?: AbortSignal;
};

export type LLMTerminalReason = 'completed' | 'provider_error' | 'timeout' | 'cancelled';
