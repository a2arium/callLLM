import type { EmbeddingParams, EmbeddingResponse } from '../../interfaces/UniversalInterfaces.ts';
import type { BaseAdapter } from '../../adapters/base/baseAdapter.ts';
import { CapabilityError } from '../models/CapabilityError.ts';
import { ModelManager } from '../models/ModelManager.ts';
import { logger } from '../../utils/logger.ts';
import type { UsageCallback } from '../../interfaces/UsageInterfaces.ts';
import { UsageTracker } from '../telemetry/UsageTracker.ts';
import { TokenCalculator } from '../models/TokenCalculator.ts';

export class EmbeddingController {
    private log = logger.createLogger({ prefix: 'EmbeddingController' });
    private usageTracker: UsageTracker;

    constructor(
        private adapter: BaseAdapter,
        private modelManager: ModelManager,
        private tokenCalculator: TokenCalculator,
        private globalUsageCallback?: UsageCallback,
        private callerId?: string
    ) {
        this.usageTracker = new UsageTracker(
            this.tokenCalculator,
            this.globalUsageCallback,
            this.callerId || 'unknown'
        );
    }

    async generateEmbeddings(params: EmbeddingParams): Promise<EmbeddingResponse> {
        this.log.debug('Generating embeddings', {
            model: params.model,
            inputType: Array.isArray(params.input) ? 'batch' : 'single',
            inputCount: Array.isArray(params.input) ? params.input.length : 1
        });

        // Validate model capabilities
        this.validateEmbeddingSupport(params.model);

        // Ensure adapter supports embeddings
        if (!this.adapter.embeddingCall) {
            throw new CapabilityError('Provider does not support embedding generation');
        }

        try {
            // Calculate input tokens for usage tracking
            const inputTokens = this.calculateInputTokens(params.input, params.model);

            // Generate embeddings
            const response = await this.adapter.embeddingCall(params.model, params);

            // Track usage for global callback (if configured)
            try {
                await this.usageTracker.triggerCallback(response.usage);
            } catch (error) {
                this.log.warn('Global usage callback failed:', error);
            }

            // Track usage for per-call callback (if provided)
            if (params.usageCallback) {
                try {
                    await params.usageCallback({
                        callerId: this.callerId || 'unknown',
                        usage: response.usage,
                        timestamp: Date.now()
                    });
                } catch (error) {
                    this.log.warn('Per-call usage callback failed:', error);
                }
            }

            this.log.info('Successfully generated embeddings', {
                model: params.model,
                inputCount: Array.isArray(params.input) ? params.input.length : 1,
                tokensUsed: response.usage.tokens.total,
                cost: response.usage.costs.total
            });

            return response;
        } catch (error) {
            this.log.error('Failed to generate embeddings:', error, {
                model: params.model,
                inputType: Array.isArray(params.input) ? 'batch' : 'single'
            });
            throw error;
        }
    }

    private validateEmbeddingSupport(modelName: string): void {
        const capabilities = ModelManager.getCapabilities(modelName);

        if (!capabilities.embeddings) {
            throw new CapabilityError(`Model ${modelName} does not support embeddings`);
        }

        this.log.debug('Model embedding capabilities validated', {
            model: modelName,
            capabilities: capabilities.embeddings
        });
    }

    private calculateInputTokens(input: string | string[], model: string): number {
        try {
            if (Array.isArray(input)) {
                return input.reduce((total, text) => {
                    return total + this.tokenCalculator.calculateTokens(text);
                }, 0);
            } else {
                return this.tokenCalculator.calculateTokens(input);
            }
        } catch (error) {
            this.log.warn('Failed to calculate input tokens, using estimate', { error });
            // Fallback estimation: roughly 4 characters per token
            const totalLength = Array.isArray(input)
                ? input.reduce((sum, text) => sum + text.length, 0)
                : input.length;
            return Math.ceil(totalLength / 4);
        }
    }

    /**
     * Check if a model supports specific embedding capabilities
     */
    public checkEmbeddingCapabilities(modelName: string): {
        supported: boolean;
        maxInputLength?: number;
        dimensions?: number[];
        defaultDimensions?: number;
        encodingFormats?: string[];
    } {
        const capabilities = ModelManager.getCapabilities(modelName);

        if (!capabilities.embeddings) {
            return { supported: false };
        }

        if (typeof capabilities.embeddings === 'boolean') {
            return { supported: true };
        }

        return {
            supported: true,
            maxInputLength: capabilities.embeddings.maxInputLength,
            dimensions: capabilities.embeddings.dimensions,
            defaultDimensions: capabilities.embeddings.defaultDimensions,
            encodingFormats: capabilities.embeddings.encodingFormats
        };
    }
} 