import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AudioController } from '../../../../core/audio/AudioController.ts';
import { BaseAdapter } from '../../../../adapters/base/baseAdapter.ts';
import { ModelManager } from '../../../../core/models/ModelManager.ts';
import { TokenCalculator } from '../../../../core/models/TokenCalculator.ts';
import { CapabilityError } from '../../../../core/models/CapabilityError.ts';
import type {
    TranscriptionParams,
    TranslationParams,
    SpeechParams,
    TranscriptionResponse,
    TranslationResponse,
    SpeechResponse
} from '../../../../interfaces/UniversalInterfaces.ts';

const emptyUsage = {
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
};

class MockAudioAdapter extends BaseAdapter {
    async chatCall(): Promise<never> {
        throw new Error('Not implemented');
    }

    async streamCall(): Promise<never> {
        throw new Error('Not implemented');
    }

    convertToProviderParams(): unknown {
        throw new Error('Not implemented');
    }

    convertFromProviderResponse(): never {
        throw new Error('Not implemented');
    }

    convertFromProviderStreamResponse(): never {
        throw new Error('Not implemented');
    }

    async audioCall(
        model: string,
        op: 'transcribe' | 'translate' | 'synthesize',
        params: TranscriptionParams | TranslationParams | SpeechParams
    ): Promise<TranscriptionResponse | TranslationResponse | SpeechResponse> {
        if (op === 'transcribe') {
            return {
                text: 'mock transcript',
                model,
                usage: {
                    ...emptyUsage,
                    tokens: { ...emptyUsage.tokens, input: { total: 5, cached: 0 }, total: 5 },
                    costs: { ...emptyUsage.costs, input: { total: 0.001, cached: 0 }, total: 0.001 }
                },
                metadata: { model }
            };
        }
        if (op === 'translate') {
            return {
                text: 'mock english',
                model,
                usage: emptyUsage,
                metadata: { model }
            };
        }
        return {
            audio: { data: 'AA==', mime: 'audio/mpeg', format: 'mp3', sizeBytes: 1 },
            model,
            usage: emptyUsage,
            metadata: { model }
        };
    }
}

describe('AudioController', () => {
    let controller: AudioController;
    let mockAdapter: MockAudioAdapter;
    let mockModelManager: { getModel: ReturnType<typeof jest.fn> };

    beforeEach(() => {
        mockAdapter = new MockAudioAdapter({ apiKey: 'test' });
        mockModelManager = {
            getModel: jest.fn()
        };
        jest.spyOn(ModelManager, 'getCapabilities').mockReturnValue({
            audio: { transcribe: true, translate: true, synthesize: true },
            input: { text: true },
            output: { text: true }
        });
        controller = new AudioController(
            mockAdapter,
            mockModelManager as unknown as ModelManager,
            new TokenCalculator()
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('transcribe calls adapter and returns text', async () => {
        const spy = jest.spyOn(mockAdapter, 'audioCall');
        const res = await controller.transcribe({ file: '/tmp/a.wav', model: 'whisper-1' });
        expect(res.text).toBe('mock transcript');
        expect(spy).toHaveBeenCalledWith('whisper-1', 'transcribe', expect.objectContaining({ file: '/tmp/a.wav' }));
    });

    it('translate calls adapter', async () => {
        const res = await controller.translate({ file: '/tmp/a.wav', model: 'whisper-1' });
        expect(res.text).toBe('mock english');
    });

    it('synthesize calls adapter', async () => {
        const res = await controller.synthesize({
            input: 'hi',
            model: 'gpt-4o-mini-tts',
            voice: 'alloy'
        });
        expect(res.audio.format).toBe('mp3');
    });

    it('throws CapabilityError when model lacks audio', async () => {
        jest.spyOn(ModelManager, 'getCapabilities').mockReturnValue({
            input: { text: true },
            output: { text: true }
        });
        await expect(controller.transcribe({ file: '/x.wav', model: 'gpt-4o' })).rejects.toThrow(CapabilityError);
    });

    it('throws CapabilityError when transcribe not supported on object audio cap', async () => {
        jest.spyOn(ModelManager, 'getCapabilities').mockReturnValue({
            audio: { synthesize: true },
            input: { text: true },
            output: { text: true }
        });
        await expect(controller.transcribe({ file: '/x.wav', model: 'tts' })).rejects.toThrow(CapabilityError);
    });

    it('throws when adapter has no audioCall', async () => {
        const bare = {
            embeddingCall: undefined
        } as unknown as BaseAdapter;
        const c = new AudioController(bare, mockModelManager as unknown as ModelManager, new TokenCalculator());
        await expect(c.transcribe({ file: '/x.wav', model: 'whisper-1' })).rejects.toThrow(CapabilityError);
    });

    it('checkAudioCapabilities reflects model', () => {
        jest.spyOn(ModelManager, 'getCapabilities').mockReturnValue({
            audio: { transcribe: true, translate: false, synthesize: true },
            input: { text: true },
            output: { text: true }
        });
        const cap = controller.checkAudioCapabilities('x');
        expect(cap.supported).toBe(true);
        expect(cap.transcribe).toBe(true);
        expect(cap.translate).toBe(false);
        expect(cap.synthesize).toBe(true);
    });
});
