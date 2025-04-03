# Adding New LLM Provider Adapters

This guide explains how to add support for new LLM providers to the library.

## Overview

The library uses an adapter pattern to support different LLM providers. Each provider is implemented as an adapter class that extends the `BaseAdapter` class and implements the required interface methods.

New providers can be added by:
1. Creating a new adapter class
2. Registering it in the central adapter registry

## Creating a New Adapter

1. Create a new directory under `src/adapters` for your provider:
   ```bash
   mkdir src/adapters/your-provider
   ```

2. Create the adapter class:
   ```typescript
   // src/adapters/your-provider/adapter.ts
   import { BaseAdapter } from '../base/baseAdapter';
   import type { AdapterConfig } from '../base/baseAdapter';
   import type {
     UniversalChatParams,
     UniversalChatResponse,
     UniversalStreamResponse
   } from '../../interfaces/UniversalInterfaces';

   export class YourProviderAdapter extends BaseAdapter {
     constructor(config: Partial<AdapterConfig>) {
       super(config);
       // Initialize provider-specific configuration
     }

     // Implement required methods
     async chat(params: UniversalChatParams): Promise<UniversalChatResponse> {
       // Implement chat functionality
     }

     async chatStream(params: UniversalChatParams): Promise<UniversalStreamResponse> {
       // Implement streaming functionality
     }

     // ... other required methods
   }
   ```

3. Implement all required methods from the `BaseAdapter` class:
   - `chat`: For non-streaming chat completions
   - `chatStream`: For streaming chat completions
   - Any other methods required by the base adapter

## Registering the Adapter

1. Import your adapter in `src/adapters/index.ts`:
   ```typescript
   import { YourProviderAdapter } from './your-provider/adapter';
   ```

2. Add it to the adapter registry:
   ```typescript
   export const adapterRegistry: Map<string, AdapterConstructor> = new Map([
     // ... existing adapters ...
     ['your-provider', YourProviderAdapter],
   ]);
   ```

## Testing the Adapter

1. Create a test file for your adapter:
   ```typescript
   // src/tests/unit/adapters/your-provider/adapter.test.ts
   import { YourProviderAdapter } from '../../../../adapters/your-provider/adapter';

   describe('YourProviderAdapter', () => {
     // Add your test cases
   });
   ```

2. Test both streaming and non-streaming functionality
3. Test error handling
4. Test configuration handling

## Best Practices

1. **Type Safety**
   - Use proper TypeScript types
   - Never use 'any' types
   - Use type aliases instead of interfaces

2. **Error Handling**
   - Map provider-specific errors to universal error types
   - Include helpful error messages
   - Handle rate limits and retries

3. **Configuration**
   - Support all relevant provider options
   - Document required and optional configuration
   - Use environment variables for sensitive data

4. **Streaming**
   - Implement proper streaming functionality
   - Never fake streaming with batched responses
   - Handle stream errors properly

5. **Testing**
   - Test both success and error cases
   - Mock external API calls
   - Test configuration validation
   - Test streaming behavior

## Example

Here's a minimal example of adding a new provider:

```typescript
// src/adapters/example-provider/adapter.ts
import { BaseAdapter } from '../base/baseAdapter';
import type { AdapterConfig } from '../base/baseAdapter';
import type {
  UniversalChatParams,
  UniversalChatResponse,
  UniversalStreamResponse
} from '../../interfaces/UniversalInterfaces';

export class ExampleProviderAdapter extends BaseAdapter {
  constructor(config: Partial<AdapterConfig>) {
    super(config);
    if (!config.apiKey) {
      throw new Error('API key is required for ExampleProvider');
    }
  }

  async chat(params: UniversalChatParams): Promise<UniversalChatResponse> {
    try {
      // Call the provider's API
      const response = await fetch('https://api.example.com/v1/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.mapToProviderParams(params)),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.mapFromProviderResponse(data);
    } catch (error) {
      throw this.mapProviderError(error);
    }
  }

  async chatStream(params: UniversalChatParams): Promise<UniversalStreamResponse> {
    // Implement streaming
  }

  private mapToProviderParams(params: UniversalChatParams): unknown {
    // Convert universal params to provider-specific format
  }

  private mapFromProviderResponse(response: unknown): UniversalChatResponse {
    // Convert provider-specific response to universal format
  }

  private mapProviderError(error: unknown): Error {
    // Map provider-specific errors to universal errors
  }
}

// src/adapters/index.ts
import { ExampleProviderAdapter } from './example-provider/adapter';

export const adapterRegistry: Map<string, AdapterConstructor> = new Map([
  // ... existing adapters ...
  ['example-provider', ExampleProviderAdapter],
]);
```

## Need Help?

If you need help implementing a new provider adapter:
1. Check the existing adapters for examples
2. Review the provider's API documentation
3. Open an issue for guidance
4. Submit a pull request for review 