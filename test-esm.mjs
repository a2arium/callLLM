// ESM Test Script
import { LLMCaller } from './dist/index.js';
import { getRegisteredProviders } from './dist/adapters/index.js';

console.log('ESM import succeeded!');
console.log('Imported:', {
  LLMCaller: typeof LLMCaller,
  getRegisteredProviders: typeof getRegisteredProviders
});

// List all registered providers
console.log('Registered providers:', getRegisteredProviders()); 