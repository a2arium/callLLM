/**
 * Utility for getting import.meta.url in a way that works with both ESM and CJS builds
 * 
 * This CJS version uses Node.js __filename to provide similar functionality to import.meta.url
 * The ESM version (importMetaUrl.ts) returns the actual import.meta.url
 */

/**
 * Get a compatible replacement for import.meta.url in CJS environments
 * Returns a file:// URL for the current module
 */
export function getImportMetaUrl(): string {
    // In CJS, we construct a file:// URL from __filename
    return `file://${__filename}`;
} 