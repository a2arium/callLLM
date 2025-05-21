import { jest , beforeAll} from '@jest/globals';
/**
 * Unit tests for OAuthProvider
 */
import { OAuthProvider, OAuthStorage } from '../../../../core/mcp/OAuthProvider.js';
import { OAuthClientInformation, OAuthClientInformationFull, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
// Declare variables for modules to be dynamically imported
let logger;

// Add a mock at the top of the file to mock logger
jest.unstable_mockModule('../../../../utils/logger.js', () => {
  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    createLogger: jest.fn().mockReturnValue({
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    })
  };
  return { __esModule: true, logger: mockLogger };
});

// Dynamically import modules after mocks are set up
beforeAll(async () => {
  const loggerModule = await import('../../../../utils/logger.js');
  logger = loggerModule.logger;
});


// Mock implementation of storage for testing
class MockStorage implements OAuthStorage {
  private tokens: Record<string, OAuthTokens> = {};
  private verifiers: Record<string, string> = {};
  private clientInfos: Record<string, OAuthClientInformation> = {};

  async saveTokens(serverKey: string, tokens: OAuthTokens): Promise<void> {
    this.tokens[serverKey] = tokens;
  }

  async getTokens(serverKey: string): Promise<OAuthTokens | undefined> {
    return this.tokens[serverKey];
  }

  async saveCodeVerifier(serverKey: string, codeVerifier: string): Promise<void> {
    this.verifiers[serverKey] = codeVerifier;
  }

  async getCodeVerifier(serverKey: string): Promise<string | undefined> {
    return this.verifiers[serverKey];
  }

  async saveClientInformation(serverKey: string, clientInfo: OAuthClientInformationFull): Promise<void> {
    this.clientInfos[serverKey] = clientInfo;
  }

  async getClientInformation(serverKey: string): Promise<OAuthClientInformation | undefined> {
    return this.clientInfos[serverKey];
  }
}

describe('OAuthProvider', () => {
  // Test data
  const serverKey = 'test-server';
  const redirectUrl = 'https://example.com/callback';
  const mockClientMetadata = {
    redirect_uris: [redirectUrl],
    client_name: 'Test Client'
  };
  const mockClientInfo: OAuthClientInformation = {
    client_id: 'test-client-id',
    client_secret: 'test-client-secret'
  };
  const mockFullClientInfo: OAuthClientInformationFull = {
    ...mockClientInfo,
    ...mockClientMetadata
  };
  const mockTokens: OAuthTokens = {
    access_token: 'test-access-token',
    token_type: 'Bearer',
    expires_in: 3600
  };
  const mockCodeVerifier = 'test-code-verifier';
  const mockAuthUrl = new URL('https://auth.example.com/authorize');

  // Test with in-memory storage
  describe('with in-memory storage', () => {
    let provider: OAuthProvider;

    beforeEach(() => {
      provider = new OAuthProvider(serverKey, {
        redirectUrl,
        clientMetadata: mockClientMetadata
      });
    });

    test('returns the correct redirectUrl', () => {
      expect(provider.redirectUrl).toBe(redirectUrl);
    });

    test('returns the correct clientMetadata', () => {
      expect(provider.clientMetadata).toEqual(mockClientMetadata);
    });

    test('returns undefined when no client information exists', async () => {
      const result = await provider.clientInformation();
      expect(result).toBeUndefined();
    });

    test('returns undefined when no tokens exist', async () => {
      const result = await provider.tokens();
      expect(result).toBeUndefined();
    });

    test('can save and retrieve code verifier', async () => {
      await provider.saveCodeVerifier(mockCodeVerifier);
      const result = await provider.codeVerifier();
      expect(result).toBe(mockCodeVerifier);
    });

    test('throws error when code verifier not found', async () => {
      // Create a new provider to ensure no verifier is set
      const newProvider = new OAuthProvider('another-server', {
        redirectUrl,
        clientMetadata: mockClientMetadata
      });

      await expect(newProvider.codeVerifier()).rejects.toThrow();
    });

    test('can save and retrieve tokens', async () => {
      await provider.saveTokens(mockTokens);
      const result = await provider.tokens();
      expect(result).toEqual(mockTokens);
    });

    test('can save and retrieve client information', async () => {
      await provider.saveClientInformation(mockFullClientInfo);
      const result = await provider.clientInformation();
      expect(result).toEqual(mockFullClientInfo);
    });
  });

  // Test with custom storage
  describe('with custom storage', () => {
    let storage: MockStorage;
    let provider: OAuthProvider;

    beforeEach(() => {
      storage = new MockStorage();
      provider = new OAuthProvider(serverKey, {
        redirectUrl,
        clientMetadata: mockClientMetadata,
        storage
      });
    });

    test('uses provided client information', async () => {
      const providerWithClient = new OAuthProvider(serverKey, {
        redirectUrl,
        clientMetadata: mockClientMetadata,
        clientInformation: mockClientInfo,
        storage
      });

      const result = await providerWithClient.clientInformation();
      expect(result).toEqual(mockClientInfo);
    });

    test('can save and retrieve tokens through custom storage', async () => {
      await provider.saveTokens(mockTokens);

      // Verify it's in the storage
      const storageTokens = await storage.getTokens(serverKey);
      expect(storageTokens).toEqual(mockTokens);

      // Verify we can retrieve it from the provider
      const result = await provider.tokens();
      expect(result).toEqual(mockTokens);
    });

    test('can save and retrieve code verifier through custom storage', async () => {
      await provider.saveCodeVerifier(mockCodeVerifier);

      // Verify it's in the storage
      const storageVerifier = await storage.getCodeVerifier(serverKey);
      expect(storageVerifier).toBe(mockCodeVerifier);

      // Verify we can retrieve it from the provider
      const result = await provider.codeVerifier();
      expect(result).toBe(mockCodeVerifier);
    });

    test('can save and retrieve client information through custom storage', async () => {
      await provider.saveClientInformation(mockFullClientInfo);

      // Verify it's in the storage
      const storageClientInfo = await storage.getClientInformation(serverKey);
      expect(storageClientInfo).toEqual(mockFullClientInfo);

      // Verify we can retrieve it from the provider
      const result = await provider.clientInformation();
      expect(result).toEqual(mockFullClientInfo);
    });
  });

  // Test the redirection behavior
  describe('authorization redirection', () => {
    let provider: OAuthProvider;

    beforeEach(() => {
      provider = new OAuthProvider(serverKey, {
        redirectUrl,
        clientMetadata: mockClientMetadata
      });
    });

    test('logs instructions in Node environment where automatic redirect is not possible', () => {
      // Make sure window is undefined to simulate Node environment 
      const originalWindow = global.window;
      global.window = undefined as any;

      // Reset and capture our mock logger
      const mockCreateLogger = logger.createLogger as jest.Mock;
      const mockLoggerInstance = mockCreateLogger.mock.results[0]?.value || mockCreateLogger();

      // Clear previous calls
      mockLoggerInstance.info.mockClear();

      try {
        // Call the method that should log instructions
        provider.redirectToAuthorization(mockAuthUrl);

        // Verify logging happened
        expect(mockLoggerInstance.info).toHaveBeenCalled();

        // Verify the correct message was logged (at least one call should match)
        expect(mockLoggerInstance.info).toHaveBeenCalledWith(
          expect.stringContaining('Please manually navigate to:')
        );
      } finally {
        // Restore global window
        global.window = originalWindow;
      }
    });
  });
});