import { ModelInfo, ModelAlias } from '../../interfaces/UniversalInterfaces.js';

export class ModelSelector {
    public static selectModel(models: ModelInfo[], alias: ModelAlias): string {
        switch (alias) {
            case 'cheap':
                return this.selectCheapestModel(models);
            case 'balanced':
                return this.selectBalancedModel(models);
            case 'fast':
                return this.selectFastestModel(models);
            case 'premium':
                return this.selectPremiumModel(models);
            default:
                throw new Error(`Unknown model alias: ${alias}`);
        }
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