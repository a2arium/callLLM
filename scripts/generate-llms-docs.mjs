import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const generatedAt = new Date().toISOString().slice(0, 10);

const sections = [
  {
    title: 'Start Here',
    pages: [
      ['README.md', 'Product overview, quick examples, supported providers, production notes, and release workflow.'],
      ['docs/getting-started.md', 'Install callllm, configure provider keys, and run the first local TypeScript call.'],
      ['docs/concepts.md', 'Core mental model: provider scope, model selection, request requirements, normalized responses, and telemetry.'],
      ['docs/examples.md', 'Runnable example catalog mapped to common tasks.'],
    ],
  },
  {
    title: 'Core Guides',
    pages: [
      ['docs/guides/model-selection.md', 'Exact models, presets, custom policies, capability filtering, cost, latency, and context constraints.'],
      ['docs/guides/structured-output.md', 'JSON output with Zod or JSON Schema, native provider mode, fallback mode, validation, and typed results.'],
      ['docs/guides/tools-and-mcp.md', 'Tool calling, function folders, inline tools, and MCP server tools.'],
      ['docs/guides/function-folders.md', 'Testable function-folder tool pattern for production applications.'],
      ['docs/guides/streaming-history-large-inputs.md', 'Streaming responses, conversation history modes, and large input splitting.'],
      ['docs/guides/media.md', 'Images, video, speech synthesis, speech transcription, translation, and ffmpeg format conversion.'],
      ['docs/guides/embeddings.md', 'Embedding calls, model selection, and usage metadata.'],
      ['docs/guides/retrieval-with-embeddings.md', 'Retrieval-oriented embedding patterns and model consistency.'],
      ['docs/guides/telemetry-and-usage.md', 'Usage, cost metadata, OpenTelemetry, Opik, and production observability.'],
      ['docs/guides/errors-and-troubleshooting.md', 'Common failures, auth issues, model capability errors, JSON validation problems, and audio tooling errors.'],
      ['docs/guides/retries-and-settings.md', 'Retries, settings overrides, and provider execution controls.'],
    ],
  },
  {
    title: 'Reference',
    pages: [
      ['docs/reference/api.md', 'Public API reference for LLMCaller and related surfaces.'],
      ['docs/reference/configuration.md', 'Environment variables, constructor options, settings, and provider configuration.'],
      ['docs/reference/models-and-capabilities.md', 'Model registry, capability metadata, and dynamic selection behavior.'],
      ['docs/reference/response-types.md', 'Normalized response shape, metadata, usage, costs, and structured output fields.'],
      ['docs/reference/history.md', 'History manager behavior and history modes.'],
      ['docs/reference/mcp.md', 'MCP configuration and direct tool access reference.'],
      ['docs/reference/image-details.md', 'Image input, output, editing, masks, and provider-specific notes.'],
    ],
  },
  {
    title: 'Migration And Contributors',
    pages: [
      ['docs/migration/model-selection.md', 'Migration notes for the model selection system.'],
      ['docs/contributing/providers.md', 'How to add or maintain provider adapters.'],
    ],
  },
];

const fullDocs = [
  'README.md',
  'docs/getting-started.md',
  'docs/concepts.md',
  'docs/examples.md',
  'docs/guides/model-selection.md',
  'docs/guides/structured-output.md',
  'docs/guides/tools-and-mcp.md',
  'docs/guides/function-folders.md',
  'docs/guides/streaming-history-large-inputs.md',
  'docs/guides/media.md',
  'docs/guides/embeddings.md',
  'docs/guides/retrieval-with-embeddings.md',
  'docs/guides/telemetry-and-usage.md',
  'docs/guides/errors-and-troubleshooting.md',
  'docs/guides/retries-and-settings.md',
  'docs/reference/api.md',
  'docs/reference/configuration.md',
  'docs/reference/models-and-capabilities.md',
  'docs/reference/response-types.md',
  'docs/reference/history.md',
  'docs/reference/mcp.md',
  'docs/reference/image-details.md',
  'docs/migration/model-selection.md',
];

function readMarkdown(path) {
  return readFileSync(path, 'utf8').trim();
}

function rewriteMarkdownLinks(markdown, sourcePath) {
  const sourceDir = path.dirname(sourcePath);

  return markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, href) => {
    const [target, hash = ''] = href.split('#');
    if (!target || /^(https?:|mailto:)/.test(target)) return match;

    const unwrapped = target.startsWith('<') && target.endsWith('>')
      ? target.slice(1, -1)
      : target;

    if (unwrapped.startsWith('#')) return match;

    const resolved = path.normalize(path.join(sourceDir, unwrapped)).replaceAll('\\', '/');
    const normalized = resolved.startsWith('.') ? resolved : `./${resolved}`;
    const nextHref = hash ? `${normalized}#${hash}` : normalized;

    return `[${label}](${nextHref})`;
  });
}

function normalizeMarkdown(markdown, sourcePath) {
  return rewriteMarkdownLinks(markdown, sourcePath)
    .replace(/<p align="center">[\s\S]*?<\/p>\n*/g, '')
    .replace(/<h1 align="center">callllm<\/h1>\n*/g, '# callllm\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const llms = [
  '# callllm',
  '',
  '> callllm is a capability-aware TypeScript runtime for production LLM calls. It lets developers describe request requirements such as text, structured JSON, tools, streaming, media, embeddings, cost, latency, and context size, then executes the request on a compatible provider/model with normalized output, usage, cost, and telemetry-ready metadata.',
  '',
  `Last updated: ${generatedAt}`,
  '',
  'For a single-file documentation bundle, see [llms-full.txt](./llms-full.txt).',
  '',
  '## Package',
  '',
  '- npm package: https://www.npmjs.com/package/callllm',
  '- GitHub repository: https://github.com/a2arium/callLLM',
  '- Runtime: Node.js 20+, TypeScript, ESM and CommonJS builds',
  '',
  ...sections.flatMap((section) => [
    `## ${section.title}`,
    '',
    ...section.pages.map(([path, description]) => `- [${path}](./${path}): ${description}`),
    '',
  ]),
  '## Notes For AI Assistants',
  '',
  '- Prefer exact model examples when users need deterministic provider/model control.',
  '- Prefer presets or policies when users ask for capability-aware model selection.',
  '- Structured JSON is supported for chat-capable providers through native JSON mode when available and schema/prompt fallback otherwise.',
  '- Function folders are the recommended production tool-calling pattern because tools remain normal, directly testable TypeScript functions.',
  '- Audio output may be transcoded with local ffmpeg when a provider cannot return the requested format natively.',
  '- Usage and cost metadata are normalized when provider usage data or model registry pricing is available.',
  '',
].join('\n');

const full = [
  '# callllm Full Documentation',
  '',
  '> Curated full documentation bundle for AI coding assistants and RAG ingestion. Generated from the repository Markdown sources.',
  '',
  `Last updated: ${generatedAt}`,
  '',
  'For the compact index, see [llms.txt](./llms.txt).',
  '',
  ...fullDocs.flatMap((path) => [
    '---',
    '',
    `# Source: ${path}`,
    '',
    normalizeMarkdown(readMarkdown(path), path),
    '',
  ]),
].join('\n');

writeFileSync('llms.txt', `${llms.trim()}\n`, 'utf8');
writeFileSync('llms-full.txt', `${full.trim()}\n`, 'utf8');

console.log('Generated llms.txt and llms-full.txt');
