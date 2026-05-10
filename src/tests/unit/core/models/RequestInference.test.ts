import {
  inferChatRequestRequirements,
  inferEmbeddingRequestRequirements,
  inferImageOperation,
  inferSpeechRequestRequirements,
  inferTranscriptionRequestRequirements,
  inferTranslationRequestRequirements
} from '../../../../core/models/RequestInference.ts';

describe('RequestInference', () => {
  describe('chat and stream inference', () => {
    it('infers basic call text input and text output', () => {
      const inferred = inferChatRequestRequirements('call', { text: 'hello' });

      expect(inferred.operation).toBe('text');
      expect(inferred.requirements).toEqual({
        textInput: true,
        textOutput: {
          required: true,
          formats: ['text']
        }
      });
    });

    it('infers streaming for stream calls', () => {
      const inferred = inferChatRequestRequirements('stream', { text: 'hello' });

      expect(inferred.operation).toBe('text');
      expect(inferred.requirements.streaming).toEqual({ required: true });
      expect(inferred.scoreContext.operation).toBe('text');
    });

    it('infers native JSON requirements for native-only responseFormat', () => {
      const inferred = inferChatRequestRequirements('call', {
        text: 'json',
        responseFormat: 'json',
        settings: { jsonMode: 'native-only' }
      });

      expect(inferred.requirements.textOutput).toEqual({
        required: true,
        formats: ['json'],
        nativeJsonRequired: true,
        structuredOutputsRequired: false
      });
    });

    it('infers structured output requirement for native-only jsonSchema', () => {
      const inferred = inferChatRequestRequirements('call', {
        text: 'json',
        jsonSchema: {
          name: 'data',
          schema: { type: 'object', properties: {} }
        },
        settings: { jsonMode: 'native-only' }
      });

      expect(inferred.requirements.textOutput).toEqual({
        required: true,
        formats: ['json'],
        nativeJsonRequired: true,
        structuredOutputsRequired: true
      });
    });

    it('does not hard-require JSON for fallback or force-prompt modes', () => {
      expect(inferChatRequestRequirements('call', {
        responseFormat: 'json'
      }).requirements.textOutput).toEqual({
        required: true,
        formats: ['text']
      });

      expect(inferChatRequestRequirements('call', {
        responseFormat: 'json',
        settings: { jsonMode: 'force-prompt' }
      }).requirements.textOutput).toEqual({
        required: true,
        formats: ['text']
      });
    });

    it('infers tool requirements after effective tools are known', () => {
      const inferred = inferChatRequestRequirements('stream', { text: 'use tools' }, {
        hasTools: true,
        hasParallelTools: true
      });

      expect(inferred.operation).toBe('tools');
      expect(inferred.requirements.toolCalls).toEqual({
        required: true,
        streaming: true,
        parallel: true
      });
      expect(inferred.requirements.streaming).toEqual({ required: true });
    });

    it('infers reasoning support from settings.reasoning', () => {
      const inferred = inferChatRequestRequirements('call', {
        text: 'think',
        settings: { reasoning: { effort: 'medium' } }
      });

      expect(inferred.operation).toBe('reasoning');
      expect(inferred.requirements.reasoning).toEqual({ required: true });
    });

    it('infers output token budget from maxTokens', () => {
      const inferred = inferChatRequestRequirements('call', {
        settings: { maxTokens: 123 }
      });

      expect(inferred.requirements.tokenBudget).toEqual({
        requestedOutputTokens: 123
      });
    });
  });

  describe('image and video inference', () => {
    it('infers image operations', () => {
      expect(inferImageOperation({ output: { image: {} } })).toBe('generate');
      expect(inferImageOperation({ output: { image: {} }, file: 'input.png' })).toBe('edit');
      expect(inferImageOperation({ output: { image: {} }, files: ['a.png'] })).toBe('edit');
      expect(inferImageOperation({ output: { image: {} }, files: ['a.png', 'b.png'] })).toBe('composite');
      expect(inferImageOperation({ output: { image: {} }, mask: 'mask.png' })).toBe('editWithMask');
      expect(inferImageOperation({ text: 'no image' })).toBeUndefined();
    });

    it('infers image input chat separately from image output', () => {
      const inferred = inferChatRequestRequirements('call', {
        text: 'describe',
        file: 'photo.png'
      });

      expect(inferred.operation).toBe('imageInput');
      expect(inferred.requirements.imageInput).toEqual({ required: true });
      expect(inferred.requirements.textOutput).toEqual({
        required: true,
        formats: ['text']
      });
    });

    it('infers image generation requirements', () => {
      const inferred = inferChatRequestRequirements('call', {
        text: 'draw',
        output: { image: {} }
      });

      expect(inferred.operation).toBe('imageOutput');
      expect(inferred.imageOperation).toBe('generate');
      expect(inferred.requirements.imageOutput).toEqual({
        required: true,
        operations: ['generate']
      });
      expect(inferred.requirements.providerInterfaces).toEqual({ imageCall: true });
    });

    it('infers image edit and composite requirements as edit', () => {
      const edit = inferChatRequestRequirements('call', {
        output: { image: {} },
        file: 'input.png'
      });
      const composite = inferChatRequestRequirements('call', {
        output: { image: {} },
        files: ['a.png', 'b.png']
      });

      expect(edit.imageOperation).toBe('edit');
      expect(edit.requirements.imageInput).toEqual({ required: true });
      expect(edit.requirements.imageOutput).toEqual({ required: true, operations: ['edit'] });
      expect(composite.imageOperation).toBe('composite');
      expect(composite.requirements.imageOutput).toEqual({ required: true, operations: ['edit'] });
    });

    it('infers masked image edit requirements', () => {
      const inferred = inferChatRequestRequirements('call', {
        output: { image: {} },
        file: 'input.png',
        mask: 'mask.png'
      });

      expect(inferred.imageOperation).toBe('editWithMask');
      expect(inferred.requirements.imageInput).toEqual({ required: true });
      expect(inferred.requirements.imageOutput).toEqual({
        required: true,
        operations: ['editWithMask']
      });
    });

    it('infers video output and optional seed image requirements', () => {
      const inferred = inferChatRequestRequirements('call', {
        text: 'video',
        file: 'seed.png',
        output: {
          video: {
            size: '1280x720',
            seconds: 5,
            variant: 'thumbnail'
          }
        }
      });

      expect(inferred.operation).toBe('video');
      expect(inferred.requirements.videoOutput).toEqual({
        required: true,
        size: '1280x720',
        seconds: 5,
        variant: 'thumbnail'
      });
      expect(inferred.requirements.imageInput).toEqual({ required: true });
      expect(inferred.requirements.providerInterfaces).toEqual({ videoCall: true });
    });
  });

  describe('embeddings and audio inference', () => {
    it('infers embedding requirements', () => {
      const inferred = inferEmbeddingRequestRequirements({
        input: 'hello',
        dimensions: 1536,
        encodingFormat: 'base64'
      });

      expect(inferred.operation).toBe('embeddings');
      expect(inferred.requirements).toEqual({
        textInput: true,
        embeddings: {
          required: true,
          dimensions: 1536,
          encodingFormat: 'base64'
        },
        providerInterfaces: {
          embeddingCall: true
        }
      });
    });

    it('infers transcription requirements and file extension', () => {
      const inferred = inferTranscriptionRequestRequirements({
        file: '/tmp/audio.MP3?x=1'
      });

      expect(inferred.operation).toBe('audioTranscribe');
      expect(inferred.requirements.audioApi).toEqual({
        required: true,
        operations: ['transcribe'],
        inputFormat: 'mp3'
      });
      expect(inferred.requirements.providerInterfaces).toEqual({ audioCall: true });
    });

    it('infers translation requirements', () => {
      const inferred = inferTranslationRequestRequirements({
        file: 'https://example.com/audio.wav'
      });

      expect(inferred.operation).toBe('audioTranslate');
      expect(inferred.requirements.audioApi).toEqual({
        required: true,
        operations: ['translate'],
        inputFormat: 'wav'
      });
    });

    it('infers speech synthesis requirements', () => {
      const inferred = inferSpeechRequestRequirements({
        input: 'hello',
        voice: { id: 'alloy' },
        responseFormat: 'wav'
      });

      expect(inferred.operation).toBe('audioSpeech');
      expect(inferred.requirements.audioApi).toEqual({
        required: true,
        operations: ['synthesize']
      });
      expect(inferred.requirements.providerInterfaces).toEqual({ audioCall: true });
    });
  });
});
