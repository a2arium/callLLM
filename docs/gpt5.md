## GPT-5, Reasoning Effort, and Verbosity

This library supports GPT-5 family features and adds sensible fallbacks for older/non-reasoning models.

### Reasoning Effort

- Supported efforts: `minimal`, `low`, `medium`, `high`.
- Configure via `settings.reasoning.effort`.
- Behavior:
  - GPT-5 models: the requested effort is passed through as-is.
  - Non‑GPT‑5 reasoning models: `minimal` is mapped to `low` for backward compatibility.
  - If a model supports reasoning but no effort is specified, we default to `medium`.

Temperature with reasoning models:
- If a model has `capabilities.reasoning: true`, any provided `settings.temperature` is ignored and a warning is logged (when log level allows). This avoids API errors where temperature is not supported with reasoning.

### Verbosity

- Configure via `settings.verbosity?: 'low' | 'medium' | 'high'`.
- Behavior:
  - GPT-5 models: sent as `text.verbosity` in the OpenAI Responses API request.
  - Non‑reasoning models: when `verbosity` is provided and `settings.maxTokens` is not, we map it to a derived `max_output_tokens` based on the model’s `maxResponseTokens`:
    - `low` → 25% (min 256)
    - `medium` → 50% (min 512)
    - `high` → 75% (min 1024)
  - If `settings.maxTokens` is provided by the user, it is always respected (verbosity will not override it).

### Default max_output_tokens

If `settings.maxTokens` is not provided, we default `max_output_tokens` to the model’s `maxResponseTokens`. This provides a safe upper bound and predictable behavior.

### Example

```ts
const caller = new LLMCaller('openai', 'gpt-5');
await caller.call('Summarize:', {
  settings: {
    reasoning: { effort: 'minimal' },
    verbosity: 'high'
  }
});
```

### Provider Notes

- Current implementation targets OpenAI. Other providers will adopt the same universal settings (`reasoning.effort`, `verbosity`) with provider-appropriate mappings in their adapters.


