import { LLMCaller } from '../src/core/caller/LLMCaller.ts';

async function main() {
    const exact = new LLMCaller('openai', 'gpt-5-mini');
    const preset = new LLMCaller('openai', 'fast');
    const multiProvider = new LLMCaller(['openai', 'gemini'], 'balanced');
    const policy = new LLMCaller(['openai', 'gemini'], {
        preset: 'fast',
        prefer: {
            cost: 0.25
        },
        constraints: {
            maxOutputPricePerMillion: 5,
            minContextTokens: 32000
        },
        resolution: {
            explain: true
        }
    });
    const collisionEscape = new LLMCaller('openai', { model: 'fast' });

    const response = await policy.call('Summarize model selection in one sentence.');
    console.log('Selected provider:', response[0].metadata?.provider);
    console.log('Selected model:', response[0].metadata?.model);
    console.log('Selection mode:', response[0].metadata?.selectionMode);
    console.log('Resolution:', response[0].metadata?.modelResolution);

    const image = await preset.call({
        text: 'Generate a small clean icon of a compass',
        output: {
            image: {
                size: '1024x1024'
            }
        }
    });
    console.log('Image model:', image[0].metadata?.model);

    const embedding = await multiProvider.embeddings({
        input: 'A short text to embed'
    });
    console.log('Embedding model:', embedding.metadata?.model);

    const audio = await exact.transcribe({
        file: './examples/audio-sample.mp3'
    }).catch(error => {
        console.log('Exact-model validation example:', error.message);
    });

    const video = await preset.call({
        text: 'A simple animated loading spinner',
        output: {
            video: {
                seconds: 4,
                wait: 'none'
            }
        }
    }).catch(error => {
        console.log('Video selection example:', error.message);
    });

    void collisionEscape;
    void audio;
    void video;
}

main().catch(console.error);
