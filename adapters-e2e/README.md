## adapters-e2e

Capability-driven end-to-end scenarios for adapter conformance. This suite runs real examples (chat, streaming, JSON, tools, images, embeddings, history) against registered providers and auto-skips unsupported cases using model capabilities.

### What it does
- Discovers providers via `src/adapters/index.ts`
- Selects models per scenario using `CapabilityRequirement` (streaming, tools, JSON, images, embeddings)
- Runs non-stream and stream flows with per-chunk logging (when enabled)
- Uses LLM-as-a-judge (OpenAI by default) or schema checks
- Reports costs, tokens, chunk counts, and previews

### Scripts
- Run all (default providers):
  - `yarn adapters:e2e`
- Filter by provider(s):
  - `yarn adapters:e2e --provider=openai`
  - `yarn adapters:e2e --providers=openai,my-provider`
- Filter by scenario(s):
  - `yarn adapters:e2e --scenarios=simple-chat,streaming-chat`
- Choose judge:
  - `yarn adapters:e2e --judgeProvider=openai --judgeModelAlias=premium`
- Tools filter (available to scenarios via `E2E_TOOLS` env):
  - `yarn adapters:e2e --tools=getTime,getWeather`

### Streaming debug
- `E2E_STREAM_DEBUG=true` to log per-chunk info
- `E2E_STREAM_TIMEOUT_MS=30000` to cap stream duration

### Output
- One-line status per scenario with: provider, model, testId, score, cost, tokens, chunks, timeout, JSON keys, image info
- Explicit pass/fail line: `RESULT: PASSED|FAILED • testId=...`
- `usageCallbacks=N` shows how many times `usageCallback` fired during the test

### Adding scenarios
- Create a file under `adapters-e2e/scenarios/` exporting `Scenario`
- Declare `requirements` to gate by capabilities
- Implement `run()` and optional `judge()`
- Add to `scenarios/index.ts`

### Notes
- Some providers coalesce streaming to one chunk; streaming judges accept single-chunk content with lower score
- Tool-folder scenarios require `toolsDir` and tool names; the runner configures `toolsDir` for that scenario

