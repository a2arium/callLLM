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
    try {
        // Use provided importMetaUrl or get current module's import.meta.url
        const metaUrl = importMetaUrl || getImportMetaUrl();
        // ESM
        const __filename = fileURLToPath(metaUrl);
        return path.dirname(__filename);
    } catch (e) {
        // Fallback for CJS (should not happen in ESM)
        throw new Error('getDirname() requires import.meta.url in ESM context');
    }
}

/**
 * Get the equivalent of __filename in ESM
 * In CJS builds, this will be replaced with a direct reference to __filename
 * 
 * @param importMetaUrl Optional import.meta.url of the calling file, will use current module's import.meta.url if not provided
 */
export function getFilename(importMetaUrl?: string): string {
    try {
        // Use provided importMetaUrl or get current module's import.meta.url
        const metaUrl = importMetaUrl || getImportMetaUrl();
        // ESM
        return fileURLToPath(metaUrl);
    } catch (e) {
        // Fallback for CJS (should not happen in ESM)
        throw new Error('getFilename() requires import.meta.url in ESM context');
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