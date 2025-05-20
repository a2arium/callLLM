/**
 * Utility for getting import.meta.url in a way that works with both ESM and CJS builds
 * 
 * This ESM version returns the actual import.meta.url
 * The CJS version (importMetaUrl.cjs.ts) will provide a compatible implementation
 */

/**
 * Get import.meta.url for the current module
 * In ESM, this returns the actual import.meta.url
 * In CJS, this is replaced with an implementation that provides similar functionality
 */
export function getImportMetaUrl(): string {
    return import.meta.url;
} 