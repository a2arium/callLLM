import { jest } from '@jest/globals';

const gpt35Turbo = {
  name: 'gpt-3.5-turbo',
  inputPricePerMillion: 0.1,
  outputPricePerMillion: 0.2,
  maxRequestTokens: 4000,
  maxResponseTokens: 1000,
  tokenizationModel: 'cl100k_base',
  characteristics: { qualityIndex: 80, outputSpeed: 100, firstTokenLatency: 100 },
  capabilities: {
    streaming: true,
    toolCalls: true,
    parallelToolCalls: true,
    batchProcessing: true,
    input: { text: true },
    output: { text: { textOutputFormats: ['text', 'json'] } }
  }
};

const imageModel = {
  name: 'image-model',
  inputPricePerMillion: 0.02,
  outputPricePerMillion: 0,
  maxRequestTokens: 1000,
  maxResponseTokens: 1,
  tokenizationModel: 'cl100k_base',
  characteristics: { qualityIndex: 90, outputSpeed: 10, firstTokenLatency: 500 },
  capabilities: {
    streaming: false,
    toolCalls: false,
    parallelToolCalls: false,
    batchProcessing: false,
    input: { text: true, image: true },
    output: { image: true, text: false }
  }
};

const defaultModels = {
  'openai': {
    'gpt-3.5-turbo': gpt35Turbo,
    'image-model': imageModel
  }
};

// Mock ModelManager class
export class ModelManager {
  constructor(providerName) {
    this.providerName = providerName || 'openai';
    this.config = { models: [], defaultModel: '' };
    this.models = new Map();
    
    // Pre-populate with models for this provider
    const providerModels = defaultModels[this.providerName] || {};
    Object.entries(providerModels).forEach(([name, model]) => {
      this.models.set(name, model);
    });
  }

  getModel = jest.fn(function(modelAlias) {
    return this.models.get(modelAlias);
  });

  getAvailableModels = jest.fn(function() {
    return Array.from(this.models.values());
  });

  isKnownModel = jest.fn(function(modelName) {
    return this.models.has(modelName);
  });

  getDefaultModel = jest.fn(function() {
    return this.models.values().next().value;
  });

  getTokenizationModel = jest.fn(function(modelName) {
    return this.models.get(modelName)?.tokenizationModel;
  });

  loadModelsForProvider = jest.fn(async function() {
    return Promise.resolve();
  });

  getStrictModel = jest.fn(function(modelAlias) {
    const model = this.models.get(modelAlias);
    if (!model) throw new Error(`Model ${modelAlias} not found for provider ${this.providerName}`);
    return model;
  });
}

// Mock static methods
ModelManager.getCapabilities = jest.fn(function(modelName, providerName = 'openai') {
  const providerModels = defaultModels[providerName] || {};
  const model = providerModels[modelName];
  if (model) return model.capabilities;
  
  // Default capabilities if model not found
  return {
    streaming: true, 
    toolCalls: true, 
    parallelToolCalls: true, 
    batchProcessing: true,
    input: { text: true }, 
    output: { text: { textOutputFormats: ['text', 'json'] } }
  };
});

// Ensure this is treated as an ES module
export const __esModule = true; 