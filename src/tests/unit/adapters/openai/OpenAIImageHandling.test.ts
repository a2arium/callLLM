import { jest , beforeAll} from '@jest/globals';
import { OpenAIResponseAdapter } from '../../../../adapters/openai/adapter.js';
// Declare variables for modules to be dynamically imported
let normalizeImageSource;
// Declare variables for modules to be dynamically imported
let ModelManager;

// Define types for the mocks
type MockOpenAIImageResponse = {
  created: number;
  data: Array<{
    b64_json?: string;
    url?: string | null;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
};

// Mock the dependencies
jest.unstable_mockModule('openai', () => {
  return { __esModule: true, __esModule: true, __esModule: true, __esModule: true, __esModule: true, __esModule: true,
    OpenAI: jest.fn().mockImplementation(() => ({
      images: {
        generate: jest.fn<() => Promise<MockOpenAIImageResponse>>().mockResolvedValue({
          created: Date.now(),
          data: [
          {
            b64_json: 'mock-base64-data',
            url: null
          }],

          usage: {
            input_tokens: 15,
            output_tokens: 1056,
            total_tokens: 1071
          }
        }),
        edit: jest.fn<() => Promise<MockOpenAIImageResponse>>().mockResolvedValue({
          created: Date.now(),
          data: [
          {
            b64_json: 'mock-edited-base64-data',
            url: null
          }]

        })
      }
    }))
  };
});

type NormalizedImageSource = {
  type: string;
  data: string;
  mime: string;
};

jest.unstable_mockModule('../../../../core/file-data/fileData.js', () => {
  return { __esModule: true, __esModule: true, __esModule: true, __esModule: true, __esModule: true, __esModule: true,
    normalizeImageSource: jest.fn<() => Promise<NormalizedImageSource>>().mockResolvedValue({
      type: 'base64',
      data: 'mock-normalized-base64',
      mime: 'image/png'
    }),
    saveBase64ToFile: jest.fn<() => Promise<string>>().mockResolvedValue('/path/to/saved/image.png')
  };
});

jest.unstable_mockModule('../../../../core/models/ModelManager.js', () => {
  return { __esModule: true, __esModule: true, __esModule: true, __esModule: true, __esModule: true, __esModule: true,
    ModelManager: jest.fn().mockImplementation(() => ({
      getModel: jest.fn().mockReturnValue({
        name: 'gpt-image-1',
        capabilities: {
          output: {
            image: {
              generate: true,
              edit: true,
              editWithMask: true
            }
          }
        }
      })
    }))
  };
});

// Mock fs module
jest.unstable_mockModule('fs', () => ({ __esModule: true,
  promises: {
    readFile: jest.fn<() => Promise<Buffer>>().mockResolvedValue(Buffer.from('mock-file-content')),
    writeFile: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
  }
}));

// Dynamically import modules after mocks are set up
beforeAll(async () => {
  const fileDataModule = await import('../../../../core/file-data/fileData.js');
  normalizeImageSource = fileDataModule.normalizeImageSource;

  const ModelManagerModule = await import('../../../../core/models/ModelManager.js');
  ModelManager = ModelManagerModule.ModelManager;
});


describe('OpenAI Image Handling', () => {
  let adapter: OpenAIResponseAdapter;
  let mockOpenAI: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup adapter
    adapter = new OpenAIResponseAdapter({
      apiKey: 'test-key'
    });

    // Get mock instances for spying
    mockOpenAI = (adapter as any).client;
  });

  describe('Image Generation Tests', () => {
    test('should include base64 image data in response when using b64_json format', async () => {
      // Arrange
      const mockBase64Data = 'mock-base64-data';
      const mockResponse = {
        created: Date.now(),
        data: [{
          b64_json: mockBase64Data
        }],
        usage: {
          input_tokens: 15,
          output_tokens: 1056,
          total_tokens: 1071
        }
      };

      mockOpenAI.images.generate.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await adapter.imageCall('gpt-image-1', 'generate', {
        prompt: 'A test image prompt'
      });

      // Assert
      expect(result.image).toBeDefined();
      expect(result.image?.data).toBe(mockBase64Data);
      expect(result.image?.dataSource).toBe('base64');
      expect(result.image?.operation).toBe('generate');
    });

    test('should include URL in response when using url format', async () => {
      // Arrange
      const mockUrl = 'https://example.com/image.png';
      const mockResponse = {
        created: Date.now(),
        data: [{
          url: mockUrl
        }],
        usage: {
          input_tokens: 15,
          output_tokens: 1056,
          total_tokens: 1071
        }
      };

      mockOpenAI.images.generate.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await adapter.imageCall('gpt-image-1', 'generate', {
        prompt: 'A test image prompt',
        response_format: 'url'
      });

      // Assert
      expect(result.image).toBeDefined();
      expect(result.image?.dataSource).toBe('url');
      expect(result.metadata?.imageUrl).toBe(mockUrl);
    });

    test('should calculate image dimensions from size parameter', async () => {
      // Arrange
      const mockBase64Data = 'mock-base64-data';
      const mockResponse = {
        created: Date.now(),
        data: [{
          b64_json: mockBase64Data
        }],
        usage: {
          input_tokens: 15,
          output_tokens: 1056,
          total_tokens: 1071
        }
      };

      mockOpenAI.images.generate.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await adapter.imageCall('gpt-image-1', 'generate', {
        prompt: 'A test image prompt',
        size: '512x512'
      });

      // Assert
      expect(result.image).toBeDefined();
      expect(result.image?.width).toBe(512);
      expect(result.image?.height).toBe(512);
    });

    test('should use default dimensions when size is not provided', async () => {
      // Arrange
      const mockBase64Data = 'mock-base64-data';
      const mockResponse = {
        created: Date.now(),
        data: [{
          b64_json: mockBase64Data
        }],
        usage: {
          input_tokens: 15,
          output_tokens: 1056,
          total_tokens: 1071
        }
      };

      mockOpenAI.images.generate.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await adapter.imageCall('gpt-image-1', 'generate', {
        prompt: 'A test image prompt'
        // No size provided
      });

      // Assert
      expect(result.image).toBeDefined();
      expect(result.image?.width).toBe(1024); // Default width
      expect(result.image?.height).toBe(1024); // Default height
    });
  });

  describe('End-to-End Image Flow Tests', () => {
    test('should correctly flow image data through LLMCaller', async () => {






      // This test would be implemented in the LLMCaller.images.test.ts file
      // by verifying the image data flows correctly through the entire chain
    });});});