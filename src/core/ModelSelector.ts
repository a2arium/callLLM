import { ModelInfo, ModelAlias } from '../interfaces/UniversalInterfaces';

export class ModelSelector {
    /**
     * Selects the best model based on the given alias
     * @param models Available models
     * @param alias Model alias (fast, premium, or balanced)
     * @returns Name of the selected model
     */
    static selectModel(models: ModelInfo[], alias: ModelAlias): string {
        switch (alias) {
            case 'fast':
                return this.selectFastModel(models);
            case 'premium':
                return this.selectPremiumModel(models);
            case 'balanced':
                return this.selectBalancedModel(models);
            case 'cheap':
                return this.selectCheapModel(models);
            default:
                throw new Error(`Unknown model alias: ${alias}`);
        }
    }

    private static selectFastModel(models: ModelInfo[]): string {
        // Normalize speed metrics and find the fastest model
        return this.selectBestModel(models, (model) => {
            const speedScore = (
                // Higher output speed is better
                (model.characteristics.outputSpeed / 30) * 0.6 +
                // Lower latency is better (inverse the score)
                (1 - model.characteristics.firstTokenLatency / 3000) * 0.4
            ) * 100;
            return speedScore;
        });
    }

    private static selectPremiumModel(models: ModelInfo[]): string {
        // Simply select the model with highest quality index
        return this.selectBestModel(models, (model) =>
            model.characteristics.qualityIndex
        );
    }

    private static selectBalancedModel(models: ModelInfo[]): string {
        // Calculate min/max values for each metric for normalization
        const metrics = {
            quality: {
                max: Math.max(...models.map(m => m.characteristics.qualityIndex)),
                min: Math.min(...models.map(m => m.characteristics.qualityIndex))
            },
            speed: {
                max: Math.max(...models.map(m => m.characteristics.outputSpeed)),
                min: Math.min(...models.map(m => m.characteristics.outputSpeed))
            },
            latency: {
                max: Math.max(...models.map(m => m.characteristics.firstTokenLatency)),
                min: Math.min(...models.map(m => m.characteristics.firstTokenLatency))
            },
            price: {
                max: Math.max(...models.map(m => m.inputPricePerMillion + m.outputPricePerMillion)),
                min: Math.min(...models.map(m => m.inputPricePerMillion + m.outputPricePerMillion))
            }
        };

        // Importance weights for different characteristics
        const weights = {
            quality: 0.4,    // Quality is most important
            speed: 0.25,     // Speed and latency together make up 0.4
            latency: 0.15,   // to match quality's importance
            price: 0.2       // Price has some influence but doesn't dominate
        };

        return this.selectBestModel(models, (model) => {
            // 1. Normalize each metric to 0-1 range based on distribution
            const normalizedScores = {
                // Higher quality is better (0-1)
                quality: (model.characteristics.qualityIndex - metrics.quality.min) /
                    (metrics.quality.max - metrics.quality.min),

                // Higher speed is better (0-1)
                speed: (model.characteristics.outputSpeed - metrics.speed.min) /
                    (metrics.speed.max - metrics.speed.min),

                // Lower latency is better (so we invert: 1 = best, 0 = worst)
                latency: 1 - ((model.characteristics.firstTokenLatency - metrics.latency.min) /
                    (metrics.latency.max - metrics.latency.min)),

                // Lower price is better (so we invert: 1 = best, 0 = worst)
                price: 1 - (((model.inputPricePerMillion + model.outputPricePerMillion) - metrics.price.min) /
                    (metrics.price.max - metrics.price.min))
            };

            // 2. Calculate standard deviations to penalize extreme variations
            const scores = [
                normalizedScores.quality,
                normalizedScores.speed,
                normalizedScores.latency,
                normalizedScores.price
            ];
            const stdDev = this.calculateStdDev(scores);
            const stdDevPenalty = stdDev * 0.1; // 10% penalty for each standard deviation

            // 3. Calculate weighted arithmetic mean
            const weightedMean =
                (normalizedScores.quality * weights.quality) +
                (normalizedScores.speed * weights.speed) +
                (normalizedScores.latency * weights.latency) +
                (normalizedScores.price * weights.price);

            // 4. Calculate harmonic mean to penalize poor performance in any metric
            const harmonicMean = scores.length / scores.reduce((sum, score) => sum + 1 / (score + 0.01), 0);

            // 5. Final score combines weighted mean and harmonic mean, with std dev penalty
            // - Weighted mean (60%): Represents overall weighted performance
            // - Harmonic mean (40%): Penalizes poor performance in any single metric
            // - StdDev penalty: Further penalizes unbalanced models
            const finalScore =
                (weightedMean * 0.6 + harmonicMean * 0.4) * (1 - stdDevPenalty);

            return finalScore;
        });
    }

    /**
     * Calculates the standard deviation of a set of values
     * Used to measure how balanced a model's performance is across metrics
     */
    private static calculateStdDev(values: number[]): number {
        const mean = values.reduce((a, b) => a + b) / values.length;
        return Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);
    }

    private static selectCheapModel(models: ModelInfo[]): string {
        // Select the model with lowest total cost per million tokens
        return this.selectBestModel(models, (model) => {
            // Return negative total cost since selectBestModel picks highest score
            return -1 * (model.inputPricePerMillion + model.outputPricePerMillion);
        });
    }

    private static selectBestModel(
        models: ModelInfo[],
        scoringFunction: (model: ModelInfo) => number
    ): string {
        let bestScore = Number.NEGATIVE_INFINITY;
        let bestModel = models[0].name;

        for (const model of models) {
            const score = scoringFunction(model);
            if (score > bestScore) {
                bestScore = score;
                bestModel = model.name;
            }
        }

        return bestModel;
    }
} 