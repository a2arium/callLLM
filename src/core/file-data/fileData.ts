import * as fs from 'fs';
import * as path from 'path';
import { UrlSource, Base64Source, ImageDataSource, FilePathSource } from '../../interfaces/UniversalInterfaces';
import { logger } from '../../utils/logger';
import sharp from 'sharp';

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
 * Determine MIME type based on file extension
 * @param filePath Path to the file or file extension
 * @returns MIME type string
 */
export function getMimeTypeFromExtension(filePath: string): string {
    // Extract extension, handle both ".jpg" and "jpg" formats
    const ext = filePath.startsWith('.')
        ? filePath.toLowerCase()
        : path.extname(filePath).toLowerCase();

    // Map common image extensions to MIME types
    switch (ext) {
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.png':
            return 'image/png';
        case '.gif':
            return 'image/gif';
        case '.webp':
            return 'image/webp';
        case '.svg':
            return 'image/svg+xml';
        default:
            // Default to octet-stream or try to infer from extension
            return 'application/octet-stream';
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
        // Get MIME type from extension
        const mime = getMimeTypeFromExtension(filePath);

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
 * Saves a base64-encoded string to a file
 * @param base64 The base64-encoded string (without MIME prefix)
 * @param targetPath Path where the file should be saved
 * @param mime Optional MIME type (will be inferred from file extension if not provided)
 * @returns Promise that resolves when the file is saved
 * @throws Error if the file cannot be written
 */
export async function saveBase64ToFile(
    base64: string,
    targetPath: string,
    mime?: string
): Promise<void> {
    const log = logger.createLogger({ prefix: 'fileData.saveBase64ToFile' });

    try {
        // Remove MIME prefix if present (e.g., "data:image/png;base64,")
        const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');

        // Create buffer from base64
        const buffer = Buffer.from(cleanBase64, 'base64');

        // Ensure directory exists
        const directory = path.dirname(targetPath);
        await fs.promises.mkdir(directory, { recursive: true });

        // Write file
        await fs.promises.writeFile(targetPath, buffer);

        log.debug(`Successfully saved file to ${targetPath}`);
    } catch (error) {
        log.error(`Failed to save base64 to file ${targetPath}:`, error);
        throw new Error(`Failed to save file: ${error instanceof Error ? error.message : String(error)}`);
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
 * Error thrown when mask validation fails
 * Includes details about the validation error
 */
export class MaskValidationError extends FileValidationError {
    constructor(
        message: string,
        fileName?: string,
        public readonly details?: {
            maxSize?: number;
            actualSize?: number;
            allowedFormats?: string[];
            detectedFormat?: string;
            sourceImageDimensions?: { width: number; height: number };
            maskDimensions?: { width: number; height: number };
            hasAlphaChannel?: boolean;
        }
    ) {
        super(message, fileName, details);
        this.name = 'MaskValidationError';
    }
}

/**
 * Validates a mask file for use in image editing operations
 * Ensures it has the correct format, size, dimensions, and alpha channel
 * 
 * @param maskSource Source file path of the mask
 * @param sourceImage Source image to compare dimensions with (optional)
 * @param opts Validation options
 * @throws MaskValidationError if validation fails
 */
export async function validateMaskFile(
    maskSource: FilePathSource,
    sourceImage?: FilePathSource,
    opts: {
        maxSize?: number;
        formats?: string[];
        requireAlphaChannel?: boolean;
    } = {}
): Promise<void> {
    const log = logger.createLogger({ prefix: 'fileData.validateMaskFile' });
    const maskPath = maskSource.value;
    const maskName = path.basename(maskPath);
    const sourceImagePath = sourceImage?.value;

    // Default options
    const options = {
        maxSize: opts.maxSize || 4 * 1024 * 1024, // 4MB default
        formats: opts.formats || ['png'], // PNG is preferred for masks (has alpha channel)
        requireAlphaChannel: opts.requireAlphaChannel !== false // Require alpha by default
    };

    try {
        // 1. Basic file validation (size and format)
        try {
            // First validate basic file properties (reuse existing validation)
            validateImageFile(
                maskSource,
                {
                    maxSize: options.maxSize,
                    formats: options.formats
                }
            );
        } catch (error) {
            if (error instanceof FileValidationError) {
                // Convert to MaskValidationError
                throw new MaskValidationError(
                    error.message,
                    maskName,
                    error.details
                );
            }
            throw error;
        }

        // 2. Load the images to check dimensions and alpha channel
        try {
            // Load the mask image using sharp
            const maskImage = sharp(maskPath);
            const maskMetadata = await maskImage.metadata();

            // Validate mask has alpha channel if required
            if (options.requireAlphaChannel) {
                const hasAlphaChannel = maskMetadata.hasAlpha === true;

                if (!hasAlphaChannel) {
                    throw new MaskValidationError(
                        `Mask image must have an alpha channel`,
                        maskName,
                        { hasAlphaChannel: false }
                    );
                }
            }

            // If source image is provided, validate dimensions match
            if (sourceImagePath) {
                const sourceImage = sharp(sourceImagePath);
                const sourceMetadata = await sourceImage.metadata();

                // Check if dimensions match
                if (maskMetadata.width !== sourceMetadata.width ||
                    maskMetadata.height !== sourceMetadata.height) {
                    throw new MaskValidationError(
                        `Mask dimensions (${maskMetadata.width}x${maskMetadata.height}) do not match source image (${sourceMetadata.width}x${sourceMetadata.height})`,
                        maskName,
                        {
                            sourceImageDimensions: {
                                width: sourceMetadata.width || 0,
                                height: sourceMetadata.height || 0
                            },
                            maskDimensions: {
                                width: maskMetadata.width || 0,
                                height: maskMetadata.height || 0
                            }
                        }
                    );
                }
            }
        } catch (error) {
            if (error instanceof MaskValidationError) {
                throw error;
            }

            log.error(`Failed to validate mask image:`, error);
            throw new MaskValidationError(
                `Mask validation failed: ${error instanceof Error ? error.message : String(error)}`,
                maskName
            );
        }
    } catch (error) {
        if (error instanceof MaskValidationError) {
            throw error;
        }

        log.error(`Mask validation failed for ${maskPath}:`, error);
        throw new MaskValidationError(
            `Mask validation failed: ${error instanceof Error ? error.message : String(error)}`,
            maskName
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