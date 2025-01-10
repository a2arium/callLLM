// Define the parameters needed to create a chat completion
export interface ChatCompletionCreateParams {
    model: string;
    messages: Array<{ role: string; content: string }>;
    // Add other parameters as needed
    [key: string]: any;
}

// Define the response from a chat completion request
export interface ChatCompletion {
    id: string;
    choices: Array<{ message: { role: string; content: string } }>;
    created: number;
    model: string;
    object: string;
    // Add other response fields as needed
} 