# Function Folders

The Function Folders feature allows you to define tools as individual TypeScript files in a directory. This makes it easier to organize and maintain your tools, especially when you have many of them.

## Quick Start

```bash
yarn add callllm ts-morph
```

### Step 1: Create a functions directory

```bash
mkdir my-tools
```

### Step 2: Create a tool function file

Create a file in your functions directory (e.g., `my-tools/getWeather.ts`):

```typescript
/**
 * Get current temperature for a given location.
 *
 * @param params - Object containing all parameters
 * @param params.location - City and country e.g. Bogotá, Colombia
 * @returns Weather information for the location
 */
export function toolFunction(params: { location: string }): { temperature: number; conditions: string } {
  console.log(`Getting weather for ${params.location}`);
  
  // Your implementation here
  return {
    temperature: 22,
    conditions: 'Partly cloudy'
  };
}
```

### Step 3: Use the tool in your code

```typescript
import { LLMCaller } from 'callllm';
import path from 'path';

// Initialize with a functions directory
const caller = new LLMCaller(
  'openai',
  'gpt-4o-mini',
  'You are a helpful assistant',
  { toolsDir: './my-tools' }
);

// Use the tool by its filename (without .ts extension)
const response = await caller.call(
  'What is the weather in London?',
  {
    tools: ['getWeather'], // Just the filename
    settings: { toolChoice: 'auto' }
  }
);

console.log(response[0].content);
```

## Creating Tool Function Files

Each tool function file must follow these rules:

1. The file must export a function named `toolFunction`.
2. The file name (without `.ts` extension) becomes the tool name.
3. The function must have a comment directly above it describing what it does.
4. Parameters should have descriptions (either in JSDoc tags or comments on type properties).

### Function Description Comments

You can describe the `toolFunction` using either:

* **JSDoc style:**
  ```typescript
  /**
   * Get current temperature for a given location.
   * (Add @param tags here too if not using separate types)
   */
  export function toolFunction(...) { /* ... */ }
  ```
* **Standard comments:**
  ```typescript
  // Get current temperature for a given location.
  export function toolFunction(...) { /* ... */ }
  
  /* Or use a block comment like this */
  export function toolFunction(...) { /* ... */ }
  ```
  The parser will extract the text from the comment immediately preceding the function definition.

### Parameter Definitions and Descriptions

The recommended way to define parameters is using a separate TypeScript `type` for the parameters object. This allows for better organization and more flexible commenting.

**Describing Parameters:**

You can describe individual parameters in several ways:

1. **JSDoc `@param` tags (in function comment):** If using an inline type for parameters.
  ```typescript
  /**
   * Calculate the tip amount for a bill.
   *
   * @param params - The parameters object
   * @param params.amount - The bill amount in dollars
   * @param params.percentage - The tip percentage (default: 15)
   */
  export function toolFunction(params: { 
    amount: number; 
    percentage?: number 
  }): { /* ... */ } { /* ... */ }
  ```
2. **JSDoc comment on type property:**
  ```typescript
  export type DistanceParams = {
    /**
     * Starting point latitude
     */
    startLat: number;
    // ... other params
  };
  ```
3. **Standard comment on type property:**
  ```typescript
  export type GetFactParams = {
    // The topic to get a fact about.
    topic: Topic;
    // The mood to get a fact in. 
    mood?: 'funny' | 'serious' | 'inspiring'; // ... other moods
  };
  ```
  The parser will use the comment immediately preceding the property definition.

### Using Enums and String Literal Unions

To restrict a parameter to a specific set of allowed values, you can use:

* **TypeScript Enums:**

  ```typescript
  export enum Topic {
      General = "general",
      Animal = "animal",
      Space = "space"
  }
  
  export type GetFactParams = {
      // The topic to get a fact about.
      topic: Topic;
      // ... other params
  };
  
  // The generated schema will include: "enum": ["general", "animal", "space"]
  ```
* **String Literal Unions:**

  ```typescript
  export type GetFactParams = {
      // ... other params
      // The mood to get a fact in. 
      mood?: 'funny' | 'serious' | 'inspiring' | 'educational';
  };
  
  // The generated schema will include: "enum": ["funny", "serious", "inspiring", "educational"]
  ```
  The parser automatically detects both enums and string literal unions and adds the allowed values to the `enum` field in the generated JSON schema for the LLM.

### Example with Various Styles (`getFact.ts` inspired)

```typescript
// Get a random fact about a topic, potentially in a certain mood.

// Use an enum for predefined topics
export enum Topic {
    General = "general",
    Animal = "animal",
    Space = "space"
}

// Define parameters using a type
export type GetFactParams = {
    // The topic to get a fact about.
    topic: Topic;
    
    // The mood to get a fact in. 
    // Use a string literal union for moods.
    mood?: 'funny' | 'serious' | 'inspiring' | 'educational' | 'historical' | 'scientific' | 'cultural' | 'general';
}

// toolFunction uses the defined type
export function toolFunction(params: GetFactParams): { fact: string; source?: string } {
    console.log(`getFact tool called with topic: ${params.topic} and mood: ${params.mood || 'any'}`);
    
    let factList = [...]; // Your implementation to select facts based on topic/mood
    
    // ... implementation ...
    
    const randomIndex = Math.floor(Math.random() * factList.length);
    return factList[randomIndex];
}
```
This example demonstrates:
- A standard single-line comment for the function description.
- A separate `type` definition (`GetFactParams`).
- Parameter descriptions using standard `//` comments within the type definition.
- Use of a TypeScript `enum` (`Topic`) for the required `topic` parameter.
- Use of a string literal union for the optional `mood` parameter.

The generated JSON schema passed to the LLM will correctly include the `enum` arrays for both `topic` and `mood`.

## Configuration Options

### Constructor options

When creating a new `LLMCaller` instance, you can specify the functions directory:

```typescript
const caller = new LLMCaller(
  'openai',
  'gpt-4o-mini',
  'You are a helpful assistant',
  { 
    toolsDir: './my-tools',
    // other options...
  }
);
```

### Per-call overrides

You can override the functions directory for a specific call:

```typescript
const response = await caller.call(
  'What is the weather in London?',
  {
    tools: ['getWeather'],
    toolsDir: './other-tools', // Override for this call only
    settings: { toolChoice: 'auto' }
  }
);
```

## Mixing Tool Types

You can mix string function names with explicit `ToolDefinition` objects:

```typescript
import { ToolDefinition } from 'callllm';

// Define an explicit tool
const calculateTool: ToolDefinition = {
  name: 'calculate',
  description: 'Perform a calculation',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The mathematical expression to evaluate'
      }
    },
    required: ['expression']
  },
  callFunction: async (params) => {
    return { result: eval(params.expression) };
  }
};

// Use both explicit and string-based tools
const response = await caller.call(
  'What is 15% of $85 and what is the weather in Paris?',
  {
    tools: [calculateTool, 'getWeather'], // Mix both types
    settings: { toolChoice: 'auto' }
  }
);
```

## Best Practices

1. **Organize by functionality**: Group related tools in the same directory.
2. **Use descriptive filenames**: The filename becomes the tool name, so make it clear.
3. **Document thoroughly**: Add comprehensive descriptions to help the LLM understand when to use the tool.
4. **Handle errors gracefully**: Implement proper error handling in your tool functions.
5. **Return typed data**: Use TypeScript return types to ensure consistent responses.

## Technical Details

- Tools are lazily loaded - they're only imported when needed.
- The parsing is done once and cached for performance.
- Tool function TypeScript files are parsed using [ts-morph](https://github.com/dsherret/ts-morph).
- Comments and type information are extracted to create the tool schema. 