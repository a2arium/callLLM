// Test script to check model capabilities
const { ModelManager } = require('./dist/core/models/ModelManager');

// Create an instance of ModelManager with 'openai' provider
// This is required to properly initialize the static instance
const manager = new ModelManager('openai');

// Check gpt-image-1 capabilities
const gptImageCapabilities = ModelManager.getCapabilities('gpt-image-1');
console.log('gpt-image-1 capabilities:', JSON.stringify(gptImageCapabilities, null, 2));

// Check dall-e-3 capabilities
const dallE3Capabilities = ModelManager.getCapabilities('dall-e-3');
console.log('dall-e-3 capabilities:', JSON.stringify(dallE3Capabilities, null, 2));

// List all available models to verify they're loaded
const allModels = manager.getAvailableModels().map(model => model.name);
console.log('Available models:', allModels);

// Check a specific model to see its full configuration
const gptImageModel = manager.getModel('gpt-image-1');
if (gptImageModel) {
  console.log('gpt-image-1 full model:', JSON.stringify(gptImageModel, null, 2));
}

const dallE3Model = manager.getModel('dall-e-3');
if (dallE3Model) {
  console.log('dall-e-3 full model:', JSON.stringify(dallE3Model, null, 2));
} 