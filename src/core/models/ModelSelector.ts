import type { ModelInfo, ModelAlias, ModelCapabilities } from '../../interfaces/UniversalInterfaces.ts';

/**
 * Capability requirements for model selection
 */
export type CapabilityRequirement = {
    /** Text output capability requirements */
    textOutput?: {
        /** Whether text output is required */
        required: boolean;
        /** Specific formats required (e.g., ['json']) */
        formats?: ('text' | 'json')[];
    };

    /** Image input capability requirements */
    imageInput?: {
        /** Whether image input is required */
        required: boolean;
        /** Specific formats required (e.g., ['png', 'jpeg']) */
        formats?: string[];
    };

    /** Image output capability requirements */
    imageOutput?: {
        /** Whether image output is required */
        required: boolean;
        /** Specific image operations required */
        operations?: ('generate' | 'edit' | 'editWithMask')[];
    };

    /** Tool calling capability requirements */
    toolCalls?: {
        /** Whether tool calling is required */
        required: boolean;
        /** Whether parallel tool calls are required */
        parallel?: boolean;
    };

    /** Streaming capability requirements */
    streaming?: {
        /** Whether streaming is required */
        required: boolean;
    };

    /** Embedding capability requirements */
    embeddings?: {
        /** Whether embeddings are required */
        required: boolean;
        /** Specific dimensions required */
        dimensions?: number[];
        /** Specific encoding format required */
        encodingFormat?: 'float' | 'base64';
    };

    /** Reasoning capability requirements */
    reasoning?: {
        /** Whether reasoning is required */
        required: boolean;
    };
};

export class ModelSelector {
    public static selectModel(models: ModelInfo[], alias: ModelAlias, requirements?: CapabilityRequirement): string {
        // Filter models based on capability requirements first
        // If no specific requirements provided, ensure basic text output capability for general use
        const filteredModels = requirements
            ? this.filterModelsByCapabilities(models, requirements)
            : this.filterModelsByCapabilities(models, {
                textOutput: { required: true, formats: ['text'] }
            });

        if (filteredModels.length === 0) {
            throw new Error(`No models available that meet the capability requirements for alias: ${alias}`);
        }

        switch (alias) {
            case 'cheap':
                return this.selectCheapestModel(filteredModels);
            case 'balanced':
                return this.selectBalancedModel(filteredModels);
            case 'fast':
                return this.selectFastestModel(filteredModels);
            case 'premium':
                return this.selectPremiumModel(filteredModels);
            default:
                throw new Error(`Unknown model alias: ${alias}`);
        }
    }

    /**
     * Filters models based on capability requirements
     */
    private static filterModelsByCapabilities(models: ModelInfo[], requirements: CapabilityRequirement): ModelInfo[] {
        return models.filter(model => {
            const capabilities = model.capabilities || this.getDefaultCapabilities();

            // Check text output requirements
            if (requirements.textOutput?.required) {
                if (!this.supportsTextOutput(capabilities, requirements.textOutput.formats)) {
                    return false;
                }
            }

            // Check image input requirements
            if (requirements.imageInput?.required) {
                if (!this.supportsImageInput(capabilities, requirements.imageInput.formats)) {
                    return false;
                }
            }

            // Check image output requirements
            if (requirements.imageOutput?.required) {
                if (!this.supportsImageOutput(capabilities, requirements.imageOutput.operations)) {
                    return false;
                }
            }

            // Check tool calling requirements
            if (requirements.toolCalls?.required) {
                const tc = capabilities.toolCalls;
                const hasToolCalls = typeof tc === 'boolean' ? tc : Boolean(tc?.nonStreaming);
                if (!hasToolCalls) {
                    return false;
                }
                const parallelCap = typeof tc === 'object' && tc?.parallel !== undefined
                    ? Boolean(tc.parallel)
                    : Boolean(capabilities.parallelToolCalls);
                if (requirements.toolCalls.parallel && !parallelCap) {
                    return false;
                }
            }

            // Check streaming requirements
            if (requirements.streaming?.required) {
                if (!capabilities.streaming) {
                    return false;
                }
            }

            // Check embedding requirements
            if (requirements.embeddings?.required) {
                if (!this.supportsEmbeddings(capabilities, requirements.embeddings)) {
                    return false;
                }
            }

            // Check reasoning requirements
            if (requirements.reasoning?.required) {
                if (!capabilities.reasoning) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Checks if model supports text output with specified formats
     */
    private static supportsTextOutput(capabilities: ModelCapabilities, formats?: ('text' | 'json')[]): boolean {
        const textCapability = capabilities.output.text;

        // If text output is completely disabled
        if (textCapability === false) {
            return false;
        }

        // If text output is enabled (basic true or object with formats)
        if (textCapability === true) {
            // Basic text output supports 'text' format by default
            return !formats || formats.every(f => f === 'text');
        }

        // If text output is an object with specific formats
        if (typeof textCapability === 'object' && textCapability.textOutputFormats) {
            return !formats || formats.every(f => textCapability.textOutputFormats.includes(f));
        }

        // Default to false for unexpected structures
        return false;
    }

    /**
     * Checks if model supports image input with specified formats
     */
    private static supportsImageInput(capabilities: ModelCapabilities, formats?: string[]): boolean {
        const imageCapability = capabilities.input.image;

        // If image input is not supported
        if (!imageCapability) {
            return false;
        }

        // If image input is enabled (basic true)
        if (imageCapability === true) {
            return true; // Supports all formats by default
        }

        // If image input is an object with specific formats
        if (typeof imageCapability === 'object' && imageCapability.formats) {
            return !formats || formats.every(f => imageCapability.formats!.includes(f));
        }

        // Default to true for basic support
        return true;
    }

    /**
     * Checks if model supports image output with specified operations
     */
    private static supportsImageOutput(capabilities: ModelCapabilities, operations?: ('generate' | 'edit' | 'editWithMask')[]): boolean {
        const imageCapability = capabilities.output.image;

        // If image output is not supported
        if (!imageCapability) {
            return false;
        }

        // If image output is a boolean, check its value
        if (typeof imageCapability === 'boolean') {
            return imageCapability; // true supports all operations, false supports none
        }

        // If image output is an object with specific operations
        if (typeof imageCapability === 'object') {
            if (!operations) {
                return true; // No specific operations required
            }

            return operations.every(op => {
                switch (op) {
                    case 'generate':
                        return imageCapability.generate === true;
                    case 'edit':
                        return imageCapability.edit === true;
                    case 'editWithMask':
                        return imageCapability.editWithMask === true;
                    default:
                        return false;
                }
            });
        }

        // Default to false for unexpected structures
        return false;
    }

    /**
     * Checks if model supports embeddings with specified requirements
     */
    private static supportsEmbeddings(capabilities: ModelCapabilities, requirements?: {
        dimensions?: number[];
        encodingFormat?: 'float' | 'base64';
    }): boolean {
        const embeddingCapability = capabilities.embeddings;

        // If embeddings are not supported
        if (!embeddingCapability) {
            return false;
        }

        // If embeddings are enabled (basic true)
        if (embeddingCapability === true) {
            return true; // Supports all formats and dimensions by default
        }

        // If embeddings are an object with specific capabilities
        if (typeof embeddingCapability === 'object') {
            // Check dimensions requirement
            if (requirements?.dimensions) {
                if (!embeddingCapability.dimensions ||
                    !requirements.dimensions.every(d => embeddingCapability.dimensions!.includes(d))) {
                    return false;
                }
            }

            // Check encoding format requirement
            if (requirements?.encodingFormat) {
                if (!embeddingCapability.encodingFormats ||
                    !embeddingCapability.encodingFormats.includes(requirements.encodingFormat)) {
                    return false;
                }
            }

            return true;
        }

        // Default to false for unexpected structures
        return false;
    }

    /**
     * Returns default capabilities for models that don't specify them
     */
    private static getDefaultCapabilities(): ModelCapabilities {
        return {
            streaming: true,
            toolCalls: false,
            parallelToolCalls: false,
            batchProcessing: false,
            reasoning: false,
            input: {
                text: true
            },
            output: {
                text: {
                    textOutputFormats: ['text']
                }
            }
        };
    }

    private static selectCheapestModel(models: ModelInfo[]): string {
        // Select the model with the best price/quality ratio
        return models.reduce((cheapest, current) => {
            const cheapestTotal = cheapest.inputPricePerMillion + cheapest.outputPricePerMillion;
            const currentTotal = current.inputPricePerMillion + current.outputPricePerMillion;

            // If costs are significantly different (>50%), prefer the cheaper one
            if (currentTotal < cheapestTotal * 0.5) return current;
            if (cheapestTotal < currentTotal * 0.5) return cheapest;

            // Otherwise, consider both cost and quality
            const cheapestScore = cheapestTotal / (1 + cheapest.characteristics.qualityIndex * 0.01);
            const currentScore = currentTotal / (1 + current.characteristics.qualityIndex * 0.01);

            return currentScore < cheapestScore ? current : cheapest;
        }, models[0]).name;
    }

    private static selectBalancedModel(models: ModelInfo[]): string {
        // Filter out models with extreme characteristics for balanced selection
        const validModels = models.filter(model =>
            model.characteristics.qualityIndex >= 70 &&
            model.characteristics.outputSpeed >= 100 &&
            model.characteristics.firstTokenLatency <= 25000
        );

        if (validModels.length === 0) {
            throw new Error('No models meet the balanced criteria');
        }

        return validModels.reduce((balanced, current) => {
            const balancedScore = this.calculateBalanceScore(balanced);
            const currentScore = this.calculateBalanceScore(current);
            return currentScore > balancedScore ? current : balanced;
        }, validModels[0]).name;
    }

    private static selectFastestModel(models: ModelInfo[]): string {
        if (models.length === 0) {
            throw new Error('No models meet the balanced criteria');
        }

        // For fast models, we only care about speed
        return models.reduce((fastest, current) => {
            const fastestScore = this.calculateSpeedScore(fastest);
            const currentScore = this.calculateSpeedScore(current);
            return currentScore > fastestScore ? current : fastest;
        }, models[0]).name;
    }

    private static selectPremiumModel(models: ModelInfo[]): string {
        // Filter out low quality models for premium selection
        const validModels = models.filter(model =>
            model.characteristics.qualityIndex >= 80
        );

        return validModels.reduce((premium, current) => {
            const premiumScore = this.calculateQualityScore(premium);
            const currentScore = this.calculateQualityScore(current);
            return currentScore > premiumScore ? current : premium;
        }).name;
    }

    private static calculateBalanceScore(model: ModelInfo): number {
        const costRatio = model.inputPricePerMillion / model.outputPricePerMillion;
        const costBalance = 1 / (1 + Math.abs(1 - costRatio));

        // Normalize characteristics with adjusted ranges
        const normalizedQuality = model.characteristics.qualityIndex / 100;
        const normalizedSpeed = Math.min(model.characteristics.outputSpeed / 200, 1);
        const normalizedLatency = 1 - Math.min(model.characteristics.firstTokenLatency / 25000, 1);

        // Calculate weighted score with adjusted weights to favor more balanced models
        const qualityWeight = 0.25;
        const speedWeight = 0.25;
        const latencyWeight = 0.25;
        const costWeight = 0.25;

        // Calculate base score
        const baseScore = (
            qualityWeight * normalizedQuality +
            speedWeight * normalizedSpeed +
            latencyWeight * normalizedLatency +
            costWeight * costBalance
        );

        // Calculate variance from ideal balanced values
        const idealQuality = 0.85;  // Target for balanced model
        const idealSpeed = 0.75;    // Target for balanced model
        const idealLatency = 0.75;  // Target for balanced model
        const idealCost = 0.75;     // Target for balanced model

        const varianceFromIdeal = Math.sqrt(
            Math.pow(normalizedQuality - idealQuality, 2) +
            Math.pow(normalizedSpeed - idealSpeed, 2) +
            Math.pow(normalizedLatency - idealLatency, 2) +
            Math.pow(costBalance - idealCost, 2)
        );

        // Apply a stronger penalty for variance from ideal values
        return baseScore * Math.exp(-varianceFromIdeal);
    }

    private static calculateSpeedScore(model: ModelInfo): number {
        const outputSpeedWeight = 0.7;
        const latencyWeight = 0.3;
        const normalizedSpeed = model.characteristics.outputSpeed / 100;
        const normalizedLatency = 1 - (model.characteristics.firstTokenLatency / 5000);
        return (outputSpeedWeight * normalizedSpeed) + (latencyWeight * normalizedLatency);
    }

    private static calculateQualityScore(model: ModelInfo): number {
        return model.characteristics.qualityIndex / 100;
    }
} 