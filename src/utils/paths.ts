/**
 * Path utilities that work in both ESM and CommonJS
 */
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getImportMetaUrl } from './importMetaUrl.ts';

/**
 * Get the equivalent of __dirname in ESM
 * In CJS builds, this will be replaced with a direct reference to __dirname
 * 
 * @param importMetaUrl Optional import.meta.url of the calling file, will use current module's import.meta.url if not provided
 */
export function getDirname(importMetaUrl?: string): string {
    let metaUrl = '';
    try {
        // Use provided importMetaUrl or get current module's import.meta.url
        metaUrl = importMetaUrl || getImportMetaUrl();

        if (!metaUrl) {
            // Check if __dirname global exists (CJS fallback)
            // @ts-ignore
            if (typeof __dirname !== 'undefined') {
                // @ts-ignore
                return __dirname;
            }
            throw new Error('import.meta.url is empty and __dirname is not defined');
        }

        // ESM path resolution
        const __filename = fileURLToPath(metaUrl);
        return path.dirname(__filename);
    } catch (e: any) {
        // Provide more detailed error message
        const errorMsg = e?.message || String(e);
        throw new Error(`getDirname() failed in ESM context (metaUrl: "${metaUrl}"): ${errorMsg}`);
    }
}

/**
 * Get the equivalent of __filename in ESM
 * In CJS builds, this will be replaced with a direct reference to __filename
 * 
 * @param importMetaUrl Optional import.meta.url of the calling file, will use current module's import.meta.url if not provided
 */
export function getFilename(importMetaUrl?: string): string {
    let metaUrl = '';
    try {
        // Use provided importMetaUrl or get current module's import.meta.url
        metaUrl = importMetaUrl || getImportMetaUrl();

        if (!metaUrl) {
            // Check if __filename global exists (CJS fallback)
            // @ts-ignore
            if (typeof __filename !== 'undefined') {
                // @ts-ignore
                return __filename;
            }
            throw new Error('import.meta.url is empty and __filename is not defined');
        }

        // ESM
        return fileURLToPath(metaUrl);
    } catch (e: any) {
        // Provide more detailed error message
        const errorMsg = e?.message || String(e);
        throw new Error(`getFilename() failed in ESM context (metaUrl: "${metaUrl}"): ${errorMsg}`);
    }
}

/**
 * Resolve a path relative to the calling file's directory
 * @param importMetaUrl Optional import.meta.url of the calling file, will use current module's import.meta.url if not provided
 * @param relativePath Path relative to the calling file
 */
export function resolveFromFile(importMetaUrl: string | undefined, relativePath: string): string {
    const dirname = getDirname(importMetaUrl);
    return path.resolve(dirname, relativePath);
} 