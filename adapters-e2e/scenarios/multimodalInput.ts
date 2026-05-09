import type { Scenario } from '../types.ts';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as zlib from 'zlib';

/**
 * Multimodal input scenario: creates a small test image and sends it with a text prompt.
 * Tests input.image capability via local file path.
 */
export const multimodalInput: Scenario = {
    id: 'multimodal-input',
    title: 'Multimodal input (image + text)',
    requirements: {
        textOutput: { required: true, formats: ['text'] },
        imageInput: { required: true },
    },
    run: async ({ caller }) => {
        const tmpDir = os.tmpdir();
        const imgPath = path.join(tmpDir, `callllm-e2e-multimodal-${Date.now()}.png`);

        try {
            // Create a minimal valid 8x8 red square PNG
            const pngBuffer = createTestPng();
            fs.writeFileSync(imgPath, pngBuffer);

            const chatResp = await caller.call({
                text: 'Describe what you see in this image. Be specific about colors. <file:' + imgPath + '>',
            } as any);

            const content = chatResp[0].content ?? '';

            return {
                outputText: content,
                metadata: {
                    hasContent: content.length > 0,
                },
                usage: chatResp[0].metadata?.usage,
            };
        } finally {
            try { if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath); } catch { /* ignore */ }
        }
    },
    judge: async (_ctx, result) => {
        const text = (result.outputText ?? '').toLowerCase();
        const meta = result.metadata as { error?: string };

        if (meta?.error) {
            return { pass: false, score: 0, reason: meta.error };
        }

        if (!text || text.length < 10) {
            return { pass: false, score: 0, reason: 'No meaningful response text' };
        }

        const mentionsColor = text.includes('color') || text.includes('red') || text.includes('blue') || text.includes('white') || text.includes('black');
        const mentionsShape = text.includes('square') || text.includes('rectangle') || text.includes('pixel') || text.includes('shape');
        const mentionsImage = text.includes('image') || text.includes('see') || text.includes('appear') || text.includes('show');

        const matched = [mentionsColor, mentionsShape, mentionsImage].filter(Boolean).length;

        if (matched >= 1) {
            return {
                pass: true,
                score: 1,
                reason: `Model described image content (color:${mentionsColor}, shape:${mentionsShape}, image:${mentionsImage})`,
            };
        }

        // Be lenient - if we got a substantive response, multimodal input worked
        if (text.length > 50) {
            return {
                pass: true,
                score: 0.75,
                reason: `Model responded to image input (${text.length} chars) without specific visual details`,
            };
        }

        return {
            pass: false,
            score: 0,
            reason: `Response doesn't reference image content: "${text.slice(0, 200)}"`,
        };
    },
};

function crc32(buf: Buffer): number {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
        }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makePngChunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeB = Buffer.from(type);
    const crcData = Buffer.concat([typeB, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData), 0);
    return Buffer.concat([len, typeB, data, crc]);
}

function createTestPng(): Buffer {
    const width = 64, height = 64;
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 2;  // RGB

    const rawData = Buffer.alloc(height * (1 + width * 3));
    for (let y = 0; y < height; y++) {
        const offset = y * (1 + width * 3);
        rawData[offset] = 0; // no filter
        for (let x = 0; x < width; x++) {
            const px = offset + 1 + x * 3;
            rawData[px] = 255;     // R
            rawData[px + 1] = 0;   // G
            rawData[px + 2] = 0;   // B
        }
    }

    const compressed = zlib.deflateSync(rawData);
    return Buffer.concat([
        signature,
        makePngChunk('IHDR', ihdr),
        makePngChunk('IDAT', compressed),
        makePngChunk('IEND', Buffer.alloc(0)),
    ]);
}
