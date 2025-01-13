// Mock external dependencies
jest.mock('@dqbd/tiktoken');

// Configure Jest environment
beforeAll(() => {
    // Add any global setup here
});

afterAll(() => {
    // Add any global cleanup here
    jest.restoreAllMocks();
}); 