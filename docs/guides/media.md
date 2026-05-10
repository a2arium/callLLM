# Media: Images, Video, and Audio

`callllm` uses the same `LLMCaller` interface for text and media operations. Dynamic model selection infers the required media capability from the request.

## Image Input

Use `file` for one image or `files` for multiple images:

```ts
const caller = new LLMCaller('openai', 'gpt-4o-mini');

const response = await caller.call({
  text: 'Extract the table from this image.',
  file: './receipt.png',
  input: {
    image: { detail: 'high' }
  }
});

console.log(response[0].content);
console.log(response[0].metadata?.usage?.tokens.input.image);
```

Image sources can be local paths, URLs, or data URIs.

For image-specific token, file placeholder, and operation details, see [Image details](../reference/image-details.md).

## Image Generation and Editing

```ts
const caller = new LLMCaller(['openai', 'gemini'], 'fast');

const result = await caller.call({
  text: 'Generate a clean app icon for a task scheduler.',
  output: {
    image: {
      size: '1024x1024',
      quality: 'high'
    }
  },
  outputPath: './task-icon.png'
});

console.log(result[0].metadata?.imageSavedPath);
```

Operation inference:

| Request shape | Operation |
| --- | --- |
| `output.image` | generate |
| `output.image` + `file` or one `files[]` item | edit |
| `output.image` + multiple `files[]` items | composite edit |
| `output.image` + `mask` | masked edit |

## Video Generation

Video generation is asynchronous. You can return a job immediately or wait until completion.

```ts
const caller = new LLMCaller('openai', 'sora-2');

const response = await caller.call({
  text: 'A short product animation of a dashboard loading.',
  output: {
    video: {
      size: '1280x720',
      seconds: 8,
      wait: 'poll'
    }
  },
  outputPath: './dashboard.mp4'
});

console.log(response[0].metadata?.videoStatus);
console.log(response[0].metadata?.videoSavedPath);
console.log(response[0].metadata?.usage?.costs.output.video);
```

Seed an image when the selected video model supports image input:

```ts
const response = await caller.call({
  text: 'Animate this product screenshot with a subtle camera push.',
  file: './dashboard.png',
  output: {
    video: {
      size: '1280x720',
      seconds: 4,
      wait: 'poll'
    }
  },
  outputPath: './dashboard-animation.mp4'
});
```

Non-blocking:

```ts
const created = await caller.call({
  text: 'A loading spinner animation.',
  output: { video: { seconds: 4, wait: 'none' } }
});

const jobId = created[0].metadata?.videoJobId;
const status = await caller.retrieveVideo(jobId!);
```

Download a completed job manually:

```ts
await caller.downloadVideo(jobId!, {
  variant: 'video',
  outputPath: './loading-spinner.mp4'
});
```

Video usage is reported as media usage, not text tokens:

```ts
const usage = response[0].metadata?.usage;
console.log(usage?.tokens.output.videoSeconds);
console.log(usage?.costs.output.video);
```

Cost is estimated from model catalog metadata such as `videoPricePerSecond`. For example, the bundled OpenAI catalog currently lists `sora-2` at `0.10` per second and `sora-2-pro` at `0.30` per second. Provider pricing can change, so use these numbers as estimates and update catalog metadata if you need strict budgeting.

## Speech Synthesis

```ts
const caller = new LLMCaller(['openai', 'gemini'], 'fast');

const speech = await caller.synthesizeSpeech({
  input: 'Your report is ready.',
  voice: 'alloy',
  responseFormat: 'mp3',
  outputPath: './report.mp3'
});

console.log(speech.audio.mime);
console.log(speech.metadata?.audioSavedPath);
console.log(speech.usage.costs.total);
```

Supported output formats:

- `mp3`
- `opus`
- `aac`
- `flac`
- `wav`
- `pcm`

If the provider cannot return the requested format natively but returns another supported audio representation, `callllm` attempts to transcode locally with `ffmpeg`.

## Voice Names

The `voice` parameter is provider-dependent. You can pass native provider names. For convenience, Gemini also maps common OpenAI voice names to Gemini voices.

```ts
await caller.synthesizeSpeech({
  input: 'Hello.',
  voice: 'alloy',       // portable convenience name
  responseFormat: 'mp3'
});

await caller.synthesizeSpeech({
  input: 'Hello.',
  voice: { id: 'Charon' }, // native Gemini voice
  responseFormat: 'wav'
});
```

If a provider rejects a voice name, the provider error is surfaced. Future docs should define a first-class portable voice taxonomy; today the safest production path is to use a known native voice for the selected provider or test the portable name with your target provider scope.

## Speech-to-Text

```ts
const caller = new LLMCaller(['openai', 'gemini'], 'fast');

const transcript = await caller.transcribe({
  file: './meeting.mp3',
  language: 'en'
});

console.log(transcript.text);
console.log(transcript.usage.tokens.input.audio);
console.log(transcript.usage.durations?.inputAudioSeconds);
```

`file` can be a local path, URL, or data URI.

## Large Audio Files

Some providers cap transcription file size or duration. For local files, enable splitting:

```ts
const transcript = await caller.transcribe({
  file: './long-meeting.mp3',
  splitLargeFile: true,
  splitChunkSeconds: 600
});
```

This requires `ffmpeg` and `ffprobe` on `PATH`. If either is missing, `callllm` throws `TranscriptionFfmpegError` with platform-specific installation instructions.

## Audio Translation

```ts
const translated = await caller.translateAudio({
  file: './spanish-message.mp3'
});

console.log(translated.text);
```

Provider support varies. Dynamic selection filters to translation-capable models.
