/**
 * Path utilities for CommonJS builds
 */
import * as path from 'path';

/**
 * Get the directory name for the calling file (CJS version)
 * 
 * @param importMetaUrl Optional import.meta.url parameter (ignored in CJS)
 */
export function getDirname(_importMetaUrl?: string): string {
    // In CJS builds, __dirname is available globally
    return __dirname;
}

/**
 * Get the filename for the calling file (CJS version)
 * 
 * @param importMetaUrl Optional import.meta.url parameter (ignored in CJS)
 */
export function getFilename(_importMetaUrl?: string): string {
    // In CJS builds, __filename is available globally
    return __filename;
}

/**
 * Resolve a path relative to the calling file's directory
 * @param importMetaUrl - Optional import.meta.url parameter (ignored in CJS)
 * @param relativePath Path relative to the calling file
 */
export function resolveFromFile(_importMetaUrl: string | undefined, relativePath: string): string {
    return path.resolve(__dirname, relativePath);
} 