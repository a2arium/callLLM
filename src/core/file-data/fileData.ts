import * as fs from 'fs';
import * as path from 'path';
import { UrlSource, Base64Source, ImageDataSource, FilePathSource } from '../../interfaces/UniversalInterfaces';
import { logger } from '../../utils/logger';

const log = logger.createLogger({ prefix: 'fileData' });

/**
 * Error thrown when file validation fails
 * Includes details about the validation error
 */
export class FileValidationError extends Error {
    constructor(
        message: string,
        public readonly fileName?: string,
        public readonly details?: {
            maxSize?: number;
            actualSize?: number;
            allowedFormats?: string[];
            detectedFormat?: string;
        }
    ) {
        super(message);
        this.name = 'FileValidationError';
    }
}

/**
 * Read a file and convert it to a Base64 source
 * @param filePath Path to the file
 * @returns Base64Source object with the file contents
 * @throws Error if the file cannot be read
 */
export async function readFileAsBase64(filePath: string): Promise<Base64Source> {
    try {
        // Get file extension to determine MIME type
        const ext = path.extname(filePath).toLowerCase();
        let mime: string;

        // Map common image extensions to MIME types
        switch (ext) {
            case '.jpg':
            case '.jpeg':
                mime = 'image/jpeg';
                break;
            case '.png':
                mime = 'image/png';
                break;
            case '.gif':
                mime = 'image/gif';
                break;
            case '.webp':
                mime = 'image/webp';
                break;
            case '.svg':
                mime = 'image/svg+xml';
                break;
            default:
                // Default to octet-stream or try to infer from extension
                mime = 'application/octet-stream';
        }

        // Read file and convert to base64
        const data = await fs.promises.readFile(filePath);
        const base64Data = data.toString('base64');

        return {
            kind: 'base64',
            value: base64Data,
            mime
        };
    } catch (error) {
        log.error(`Failed to read file ${filePath}:`, error);
        throw new Error(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Validate an image file against size and format constraints
 * @param source FilePathSource with the path to validate
 * @param opts Validation options
 * @throws FileValidationError if validation fails
 */
export function validateImageFile(
    source: FilePathSource,
    opts: { maxSize: number; formats: string[] }
): void {
    const filePath = source.value;
    const fileName = path.basename(filePath);

    try {
        let fileSize: number;
        let fileStats: fs.Stats;

        try {
            // Use synchronous method to get file stats
            fileStats = fs.statSync(filePath);
            fileSize = fileStats.size;
        } catch (err) {
            throw new FileValidationError(
                `Failed to access file: ${filePath}`,
                fileName
            );
        }

        const ext = path.extname(filePath).toLowerCase().substring(1);

        // Check file size
        if (opts.maxSize && fileSize > opts.maxSize) {
            throw new FileValidationError(
                `File exceeds maximum size: ${fileSize} > ${opts.maxSize} bytes`,
                fileName,
                {
                    maxSize: opts.maxSize,
                    actualSize: fileSize,
                }
            );
        }

        // Check file format
        if (opts.formats && opts.formats.length > 0 && !opts.formats.includes(ext)) {
            throw new FileValidationError(
                `Unsupported image format: ${ext}. Allowed formats: ${opts.formats.join(', ')}`,
                fileName,
                {
                    allowedFormats: opts.formats,
                    detectedFormat: ext,
                }
            );
        }
    } catch (error) {
        if (error instanceof FileValidationError) {
            throw error;
        }

        log.error(`Image validation failed for ${filePath}:`, error);
        throw new FileValidationError(
            `Image validation failed: ${error instanceof Error ? error.message : String(error)}`,
            fileName
        );
    }
}

/**
 * Helper function to validate file path asynchronously
 * Used internally by normalizeImageSource
 * 
 * @param filePath Path to the file
 * @param options Validation options
 * @throws FileValidationError if validation fails
 */
async function validateFilePathInternal(
    filePath: string,
    options: {
        maxSize?: number;
        allowedFormats?: string[];
    }
): Promise<void> {
    const { maxSize, allowedFormats } = options;
    const fileName = path.basename(filePath);
    const stats = await fs.promises.stat(filePath);
    const fileSize = stats.size;
    const ext = path.extname(filePath).toLowerCase().substring(1);

    // Check file size
    if (maxSize && fileSize > maxSize) {
        throw new FileValidationError(
            `File exceeds maximum size: ${fileSize} > ${maxSize} bytes`,
            fileName,
            {
                maxSize,
                actualSize: fileSize,
            }
        );
    }

    // Check file format
    if (allowedFormats && allowedFormats.length > 0 && !allowedFormats.includes(ext)) {
        throw new FileValidationError(
            `Unsupported image format: ${ext}. Allowed formats: ${allowedFormats.join(', ')}`,
            fileName,
            {
                allowedFormats,
                detectedFormat: ext,
            }
        );
    }
}

/**
 * Normalize an image source to a standard format (URL or Base64)
 * @param src Source of the image data
 * @returns Normalized image source (always UrlSource or Base64Source)
 * @throws Error if the source cannot be normalized
 */
export async function normalizeImageSource(
    src: ImageDataSource
): Promise<UrlSource | Base64Source> {
    try {
        // If it's already a URL or Base64, return as is
        if (src.kind === 'url' || src.kind === 'base64') {
            return src;
        }

        // Handle file path source
        if (src.kind === 'filePath') {
            const filePath = src.value;

            // Validate the file - this should call the async version directly
            // since we're in an async function
            await validateFilePathInternal(filePath, {
                maxSize: 4 * 1024 * 1024, // Default 4MB limit
                allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
            });

            // Read and convert to base64
            return await readFileAsBase64(filePath);
        }

        throw new Error(`Unsupported image source kind: ${(src as any).kind}`);
    } catch (error) {
        log.error('Failed to normalize image source:', error);
        if (error instanceof FileValidationError) {
            throw error;
        }
        throw new Error(`Failed to normalize image source: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Estimate token usage for an image at different detail levels
 * Based on OpenAI's token counting guidelines for GPT-4 Vision
 * @param detail Detail level for the image
 * @returns Estimated token count
 */
export function estimateImageTokens(detail: 'low' | 'high' | 'auto'): number {
    // For the 'auto' detail level, default to 'low' for token estimation
    const actualDetail = detail === 'auto' ? 'low' : detail;

    // Based on OpenAI's token counting guidelines for GPT-4 Vision:
    // Low detail: ~85 tokens
    // High detail: ~170 tokens for 512x512 images, scales with size
    if (actualDetail === 'low') {
        return 85;
    } else {
        // For high detail, we use a base estimate
        // Note: This is an approximation and may vary based on actual image dimensions
        return 170;
    }
} 