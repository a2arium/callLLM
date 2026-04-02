import { jest, describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import { LLMCaller } from '../../../../core/caller/LLMCaller.ts';
import { ModelManager } from '../../../../core/models/ModelManager.ts';
import { CapabilityError } from '../../../../core/models/CapabilityError.ts';

describe('LLMCaller audio API', () => {
    let caller: LLMCaller;
    const audioCall = jest.fn();
    let originalEnv: NodeJS.ProcessEnv;

    beforeAll(() => {
        originalEnv = { ...process.env };
        process.env.OPENAI_API_KEY = 'test-key';
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    beforeEach(() => {
        audioCall.mockReset();
        audioCall.mockResolvedValue({
            text: 'hello from stt',
            model: 'gpt-4o-mini-transcribe',
            usage: {
                tokens: {
                    input: { total: 2, cached: 0 },
                    output: { total: 1, reasoning: 0 },
                    total: 3
                },
                costs: {
                    input: { total: 0, cached: 0 },
                    output: { total: 0, reasoning: 0 },
                    total: 0
                }
            },
            metadata: {}
        });

        caller = new LLMCaller('openai', 'gpt-4o-mini-transcribe', 'You are a helpful assistant.', {
            apiKey: 'test-key'
        });

        jest.spyOn(ModelManager, 'getCapabilities').mockImplementation((id: string) => {
            if (id === 'gpt-4o-mini-transcribe' || id === 'whisper-1') {
                return {
                    audio: { transcribe: true, translate: true, synthesize: true },
                    input: { text: true },
                    output: { text: true }
                };
            }
            return {
                input: { text: true },
                output: { text: true }
            };
        });

        (caller as unknown as { providerManager: { getProvider: () => unknown } }).providerManager.getProvider =
            () => ({
                audioCall,
                chatCall: jest.fn(),
                streamCall: jest.fn(),
                convertToProviderParams: jest.fn(),
                convertFromProviderResponse: jest.fn(),
                convertFromProviderStreamResponse: jest.fn()
            });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('transcribe forwards to provider audioCall', async () => {
        const res = await caller.transcribe({ file: '/tmp/x.wav', model: 'gpt-4o-mini-transcribe' });
        expect(res.text).toBe('hello from stt');
        expect(audioCall).toHaveBeenCalledWith(
            'gpt-4o-mini-transcribe',
            'transcribe',
            expect.objectContaining({ file: '/tmp/x.wav', model: 'gpt-4o-mini-transcribe' })
        );
    });

    it('translateAudio uses translate op', async () => {
        audioCall.mockResolvedValueOnce({
            text: 'hello',
            model: 'whisper-1',
            usage: {
                tokens: {
                    input: { total: 0, cached: 0 },
                    output: { total: 0, reasoning: 0 },
                    total: 0
                },
                costs: {
                    input: { total: 0, cached: 0 },
                    output: { total: 0, reasoning: 0 },
                    total: 0
                }
            },
            metadata: {}
        });
        const c = new LLMCaller('openai', 'whisper-1', 'sys', { apiKey: 'test-key' });
        (c as unknown as { providerManager: { getProvider: () => unknown } }).providerManager.getProvider =
            () => ({
                audioCall,
                chatCall: jest.fn(),
                streamCall: jest.fn(),
                convertToProviderParams: jest.fn(),
                convertFromProviderResponse: jest.fn(),
                convertFromProviderStreamResponse: jest.fn()
            });
        await c.translateAudio({ file: '/tmp/y.mp3', model: 'whisper-1' });
        expect(audioCall).toHaveBeenCalledWith('whisper-1', 'translate', expect.any(Object));
    });

    it('synthesizeSpeech uses synthesize op', async () => {
        audioCall.mockResolvedValueOnce({
            audio: { data: 'QQ==', mime: 'audio/mpeg', format: 'mp3', sizeBytes: 1 },
            model: 'gpt-4o-mini-tts',
            usage: {
                tokens: {
                    input: { total: 0, cached: 0 },
                    output: { total: 0, reasoning: 0 },
                    total: 0
                },
                costs: {
                    input: { total: 0, cached: 0 },
                    output: { total: 0.01, reasoning: 0, audio: 0.01 },
                    total: 0.01
                }
            },
            metadata: {}
        });
        jest.spyOn(ModelManager, 'getCapabilities').mockImplementation((id: string) => {
            if (id === 'gpt-4o-mini-tts') {
                return {
                    audio: { synthesize: true },
                    input: { text: true },
                    output: { text: false }
                };
            }
            return { input: { text: true }, output: { text: true } };
        });
        const c = new LLMCaller('openai', 'gpt-4o-mini-tts', 'sys', { apiKey: 'test-key' });
        (c as unknown as { providerManager: { getProvider: () => unknown } }).providerManager.getProvider =
            () => ({
                audioCall,
                chatCall: jest.fn(),
                streamCall: jest.fn(),
                convertToProviderParams: jest.fn(),
                convertFromProviderResponse: jest.fn(),
                convertFromProviderStreamResponse: jest.fn()
            });
        await c.synthesizeSpeech({ input: 'Hello', model: 'gpt-4o-mini-tts', voice: 'alloy' });
        expect(audioCall).toHaveBeenCalledWith('gpt-4o-mini-tts', 'synthesize', expect.objectContaining({ voice: 'alloy' }));
    });

    it('throws CapabilityError when model cannot transcribe', async () => {
        jest.spyOn(ModelManager, 'getCapabilities').mockReturnValue({
            input: { text: true },
            output: { text: true }
        });
        (caller as unknown as { modelManager: { getModel: typeof jest.fn; getAvailableModels: typeof jest.fn } }).modelManager =
            {
                getModel: jest.fn().mockReturnValue(undefined),
                getAvailableModels: jest.fn().mockReturnValue([])
            };
        const bad = new LLMCaller('openai', 'no-audio-model', 'sys', { apiKey: 'test-key' });
        (bad as unknown as { providerManager: { getProvider: () => unknown } }).providerManager.getProvider =
            () => ({
                audioCall,
                chatCall: jest.fn(),
                streamCall: jest.fn(),
                convertToProviderParams: jest.fn(),
                convertFromProviderResponse: jest.fn(),
                convertFromProviderStreamResponse: jest.fn()
            });
        await expect(bad.transcribe({ file: '/a.wav' })).rejects.toThrow(CapabilityError);
    });

    it('getAvailableAudioModels lists models with audio capability', () => {
        (caller as unknown as { modelManager: { getAvailableModels: () => { name: string; capabilities?: { audio?: boolean } }[] } }).modelManager =
            {
                getAvailableModels: () => [
                    { name: 'gpt-4o', capabilities: {} },
                    { name: 'whisper-1', capabilities: { audio: { transcribe: true } } }
                ]
            };
        const names = caller.getAvailableAudioModels();
        expect(names).toEqual(['whisper-1']);
    });

    it('checkAudioCapabilities returns unsupported without audio', () => {
        jest.spyOn(ModelManager, 'getCapabilities').mockReturnValue({
            input: { text: true },
            output: { text: true }
        });
        expect(caller.checkAudioCapabilities('gpt-4o').supported).toBe(false);
    });
});
