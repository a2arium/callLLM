import type { TranscriptionResponse, Usage } from '../../interfaces/UniversalInterfaces.ts';

/**
 * Sums {@link Usage} objects from multiple transcription API calls (e.g. chunked files).
 */
export function mergeTranscriptionUsages(usages: Usage[]): Usage {
    if (usages.length === 0) {
        return {
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
    }

    let inputTotal = 0;
    let inputCached = 0;
    let inputAudio = 0;
    let inputImage = 0;
    let outputTotal = 0;
    let reasoning = 0;
    let outAudio = 0;
    let outImage = 0;
    let videoSec = 0;
    let tokensGrand = 0;

    let costInTotal = 0;
    let costInCached = 0;
    let costInAudio = 0;
    let costOutTotal = 0;
    let costOutReasoning = 0;
    let costOutAudio = 0;
    let costOutImage = 0;
    let costOutVideo = 0;
    let costGrand = 0;

    let durAudio = 0;

    for (const u of usages) {
        inputTotal += u.tokens.input.total;
        inputCached += u.tokens.input.cached;
        inputAudio += u.tokens.input.audio ?? 0;
        inputImage += u.tokens.input.image ?? 0;
        outputTotal += u.tokens.output.total;
        reasoning += u.tokens.output.reasoning;
        outAudio += u.tokens.output.audio ?? 0;
        outImage += u.tokens.output.image ?? 0;
        videoSec += u.tokens.output.videoSeconds ?? 0;
        tokensGrand += u.tokens.total;

        costInTotal += u.costs.input.total;
        costInCached += u.costs.input.cached;
        costInAudio += u.costs.input.audio ?? 0;
        costOutTotal += u.costs.output.total;
        costOutReasoning += u.costs.output.reasoning;
        costOutAudio += u.costs.output.audio ?? 0;
        costOutImage += u.costs.output.image ?? 0;
        costOutVideo += u.costs.output.video ?? 0;
        costGrand += u.costs.total;

        durAudio += u.durations?.inputAudioSeconds ?? 0;
    }

    const merged: Usage = {
        tokens: {
            input: {
                total: inputTotal,
                cached: inputCached,
                ...(inputAudio > 0 ? { audio: inputAudio } : {}),
                ...(inputImage > 0 ? { image: inputImage } : {})
            },
            output: {
                total: outputTotal,
                reasoning,
                ...(outAudio > 0 ? { audio: outAudio } : {}),
                ...(outImage > 0 ? { image: outImage } : {}),
                ...(videoSec > 0 ? { videoSeconds: videoSec } : {})
            },
            total: tokensGrand
        },
        costs: {
            input: {
                total: costInTotal,
                cached: costInCached,
                ...(costInAudio > 0 ? { audio: costInAudio } : {})
            },
            output: {
                total: costOutTotal,
                reasoning: costOutReasoning,
                ...(costOutAudio > 0 ? { audio: costOutAudio } : {}),
                ...(costOutImage > 0 ? { image: costOutImage } : {}),
                ...(costOutVideo > 0 ? { video: costOutVideo } : {})
            },
            total: costGrand
        }
    };

    if (durAudio > 0) {
        merged.durations = { inputAudioSeconds: durAudio };
    }

    return merged;
}

/**
 * Combines chunked {@link TranscriptionResponse} into one result (concatenated text, summed usage).
 */
export function mergeTranscriptionResponses(parts: TranscriptionResponse[], model: string): TranscriptionResponse {
    if (parts.length === 0) {
        throw new Error('mergeTranscriptionResponses: no parts');
    }
    if (parts.length === 1) {
        return parts[0];
    }

    const text = parts
        .map(p => p.text.trim())
        .filter(Boolean)
        .join('\n\n');

    const language = parts.find(p => p.language !== undefined)?.language;
    const durationSum = parts.reduce((sum, p) => sum + (p.duration ?? 0), 0);
    const usage = mergeTranscriptionUsages(parts.map(p => p.usage));

    return {
        text,
        language,
        duration: durationSum > 0 ? durationSum : undefined,
        usage,
        model,
        metadata: {
            model,
            usage,
            transcriptionChunkCount: parts.length
        }
    };
}
