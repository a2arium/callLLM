import { LLMCaller } from '../src/core/caller/LLMCaller';
import { RequestProcessor } from '../src/core/caller/RequestProcessor';

async function main() {
    // Initialize LLMCaller
    const caller = new LLMCaller('openai', 'fast', 'You are a helpful assistant.');

    // Initialize RequestProcessor
    const processor = new RequestProcessor();

    // Example 1: Basic message
    console.log('\nExample 1: Basic message');
    const basicResult = processor.processRequest({
        message: 'What is the capital of France?',
        model: caller.getModel('fast')!
    });
    console.log('Processed message:', basicResult[0]);

    // Example 2: Message with string data
    console.log('\nExample 2: Message with string data');
    const stringDataResult = processor.processRequest({
        message: 'Analyze this text:',
        data: 'The quick brown fox jumps over the lazy dog.',
        model: caller.getModel('fast')!
    });
    console.log('Processed message:', stringDataResult[0]);

    // Example 3: Message with object data
    console.log('\nExample 3: Message with object data');
    const objectData = {
        user: {
            name: 'John Doe',
            age: 30,
            preferences: {
                color: 'blue',
                food: 'pizza'
            }
        }
    };
    const objectDataResult = processor.processRequest({
        message: 'Analyze this user profile:',
        data: objectData,
        model: caller.getModel('fast')!
    });
    console.log('Processed message:', objectDataResult[0]);

    // Example 4: Message with ending message
    console.log('\nExample 4: Message with ending message');
    const endingMessageResult = processor.processRequest({
        message: 'Tell me about the solar system.',
        endingMessage: 'Focus on the planets only.',
        model: caller.getModel('fast')!
    });
    console.log('Processed message:', endingMessageResult[0]);

    // Example 5: Complete example with all components
    console.log('\nExample 5: Complete example with all components');
    const completeResult = processor.processRequest({
        message: 'Analyze this weather data and provide insights:',
        data: {
            temperature: 25,
            humidity: 60,
            windSpeed: 15,
            conditions: 'partly cloudy'
        },
        endingMessage: 'Focus on how this weather affects outdoor activities.',
        model: caller.getModel('fast')!
    });
    console.log('Processed message:', completeResult[0]);
}

// Run the examples
main().catch(console.error); 