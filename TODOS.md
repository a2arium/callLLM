# Follow-up work

## Cancellation for standalone audio and embedding APIs

Add `signal` and `timeoutMs` to the option types used by `embeddings()`, `transcribe()`, `translateAudio()`, and speech generation. Reuse `CallExecutionContext`, forward native SDK signals, preserve the exported cancellation error types, and add the same callback, retry, and late-result quarantine tests used by `call()` and `stream()`.

## Remote video job cancellation and recovery

Add provider-specific cancellation where OpenAI or Gemini exposes a remote job-cancel API. Persist enough non-sensitive job metadata to let callers inspect or recover already-submitted jobs when local cancellation happens after submission. Local cancellation must remain deterministic when a provider cannot stop the remote job.
