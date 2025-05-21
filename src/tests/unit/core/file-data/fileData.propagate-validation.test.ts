import { jest, expect, describe, it, beforeAll, beforeEach } from '@jest/globals';
import type { Stats } from 'fs';

// Mock fs module to simulate file read error
jest.unstable_mockModule('fs', () => {
    return {
        promises: {
            readFile: jest.fn<() => Promise<Buffer>>().mockRejectedValue(new Error('File not found')),
            stat: jest.fn<() => Promise<Stats>>().mockResolvedValue({ size: 1024 } as Stats),
            writeFile: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
            mkdir: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
        },
        existsSync: jest.fn<() => boolean>().mockReturnValue(true),
        mkdirSync: jest.fn<() => void>(),
        statSync: jest.fn<() => Stats>().mockReturnValue({ size: 1024 } as Stats)
    };
});

let fileData: any;

beforeAll(async () => {
    fileData = await import('../../../../core/file-data/fileData.js');
});

describe('normalizeImageSource – error propagation (integration style)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('propagates error from filePathToBase64 (via fs.promises.readFile)', async () => {
        await expect(
            fileData.normalizeImageSource({ type: 'file_path', path: '/foo.jpg' })
        ).rejects.toThrow('Failed to read file:');
    });
}); 