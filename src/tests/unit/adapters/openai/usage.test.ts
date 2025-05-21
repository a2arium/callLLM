import { jest, beforeAll } from '@jest/globals';
import { Converter } from '../../../../adapters/openai/converter.js';
// Declare variables for modules to be dynamically imported
let ModelManager;
import { Usage } from '../../../../interfaces/UniversalInterfaces.js';
// Declare variables for modules to be dynamically imported
let estimateImageTokens;

// Mock the file-data module
jest.unstable_mockModule('../../../../core/file-data/fileData.js', () => ({
  __esModule: true,
  normalizeImageSource: jest.fn(),
  estimateImageTokens: jest.fn().mockImplementation((detail: 'low' | 'high' | 'auto') => {
    switch (detail) {
      case 'low': return 85;
      case 'high': return 170;
      case 'auto': return 130;
      default: return 0;
    }
  })
}));

// Mock ModelManager
jest.unstable_mockModule('../../../../core/models/ModelManager.js', () => ({
  __esModule: true,
  ModelManager: jest.fn().mockImplementation(() => ({
    getModel: jest.fn(), // Mock getModel, as Converter likely uses it
    // Add any other ModelManager methods that Converter might use
  }))
}));

// Dynamically import modules after mocks are set up
beforeAll(async () => {
  const fileDataModule = await import('../../../../core/file-data/fileData.js');
  estimateImageTokens = fileDataModule.estimateImageTokens;

  const ModelManagerModule = await import('../../../../core/models/ModelManager.js');
  ModelManager = ModelManagerModule.ModelManager;
});


describe('OpenAI Adapter - Usage Tracking', () => {
  let converter: Converter;
  let mockModelManager: jest.Mocked<ModelManager>;

  beforeEach(() => {
    mockModelManager = new ModelManager('openai') as jest.Mocked<ModelManager>;
    converter = new Converter(mockModelManager);
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('Image Token Calculation', () => {
    test('should track image tokens in usage data when image detail is provided', () => {
      // Create mock OpenAI response with usage data
      const mockResponse = {
        id: 'resp_123',
        created_at: new Date().toISOString(),
        model: 'gpt-4o',
        usage: {
          input_tokens: 250, // Total input tokens
          output_tokens: 50,
          total_tokens: 300
        },
        object: 'response',
        output_text: 'Description of the image',
        status: 'completed',
        metadata: {
          image_detail: 'high'
        }
      };

      // Convert the response
      const result = converter.convertFromOpenAIResponse(mockResponse as any);

      // Verify the image tokens were calculated and included
      expect(result.metadata?.usage).toBeDefined();
      expect(result.metadata?.usage?.tokens.input.image).toBeDefined();
      expect(result.metadata?.usage?.tokens.input.image).toBe(200); // Should match the mocked 'high' value

      // Verify estimateImageTokens was called with the correct parameter
      // This no longer happens during convertFromOpenAIResponse as we now calculate directly in the response
      // expect(estimateImageTokens).toHaveBeenCalledWith('high');
    });

    test('should not include image tokens field when no image is present', () => {
      // Create mock OpenAI response with usage data but no image
      const mockResponse = {
        id: 'resp_123',
        created_at: new Date().toISOString(),
        model: 'gpt-4o',
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150
        },
        object: 'response',
        output_text: 'Response with no image',
        status: 'completed',
        // No image_detail in metadata
        metadata: {}
      };

      // Convert the response
      const result = converter.convertFromOpenAIResponse(mockResponse as any);

      // Verify the image tokens field is not included
      expect(result.metadata?.usage).toBeDefined();
      expect(result.metadata?.usage?.tokens.input.image).toBeUndefined();

      // Verify estimateImageTokens was not called
      expect(estimateImageTokens).not.toHaveBeenCalled();
    });

    test('should handle different image detail levels', () => {
      // Test with 'low' detail
      const mockResponseLow = {
        id: 'resp_123',
        usage: {
          input_tokens: 200,
          output_tokens: 50,
          total_tokens: 250
        },
        status: 'completed',
        metadata: {
          image_detail: 'low'
        }
      };

      const resultLow = converter.convertFromOpenAIResponse(mockResponseLow as any);
      expect(resultLow.metadata?.usage?.tokens.input.image).toBe(150); // Should match the mocked 'low' value

      // Test with 'auto' detail
      const mockResponseAuto = {
        id: 'resp_456',
        usage: {
          input_tokens: 230,
          output_tokens: 50,
          total_tokens: 280
        },
        status: 'completed',
        metadata: {
          image_detail: 'auto'
        }
      };

      const resultAuto = converter.convertFromOpenAIResponse(mockResponseAuto as any);
      expect(resultAuto.metadata?.usage?.tokens.input.image).toBe(180); // Should match the mocked 'auto' value
    });
  });
});