/**
 * OAuthProvider implementation for the MCP SDK
 * 
 * This class implements the OAuthClientProvider interface from the MCP SDK.
 * It handles storing and retrieving tokens, verifiers, and client information,
 * which are necessary for the OAuth flow.
 */

import type {
    OAuthClientInformation,
    OAuthClientInformationFull,
    OAuthClientMetadata,
    OAuthTokens
} from '@modelcontextprotocol/sdk/shared/auth.d.ts';
import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.d.ts';
import { logger } from '../../utils/logger.ts';

/**
 * Options for the OAuthProvider
 */
export type OAuthProviderOptions = {
    /**
     * The URL to redirect to after authorization
     */
    redirectUrl: string | URL;

    /**
     * Client metadata for OAuth registration
     */
    clientMetadata: OAuthClientMetadata;

    /**
     * Optional client information if pre-registered
     */
    clientInformation?: OAuthClientInformation;

    /**
     * Optional storage implementation for persisting tokens and verifiers
     * If not provided, in-memory storage will be used
     */
    storage?: OAuthStorage;
};

/**
 * Interface for OAuth storage
 */
export interface OAuthStorage {
    /**
     * Save tokens for a specific server
     */
    saveTokens(serverKey: string, tokens: OAuthTokens): Promise<void>;

    /**
     * Retrieve tokens for a specific server
     */
    getTokens(serverKey: string): Promise<OAuthTokens | undefined>;

    /**
     * Save code verifier for a specific server
     */
    saveCodeVerifier(serverKey: string, codeVerifier: string): Promise<void>;

    /**
     * Retrieve code verifier for a specific server
     */
    getCodeVerifier(serverKey: string): Promise<string | undefined>;

    /**
     * Save client information for a specific server
     */
    saveClientInformation(serverKey: string, clientInfo: OAuthClientInformationFull): Promise<void>;

    /**
     * Retrieve client information for a specific server
     */
    getClientInformation(serverKey: string): Promise<OAuthClientInformation | undefined>;
}

/**
 * Simple in-memory implementation of OAuthStorage
 */
class InMemoryStorage implements OAuthStorage {
    private tokens = new Map<string, OAuthTokens>();
    private verifiers = new Map<string, string>();
    private clientInfos = new Map<string, OAuthClientInformation>();

    async saveTokens(serverKey: string, tokens: OAuthTokens): Promise<void> {
        this.tokens.set(serverKey, tokens);
    }

    async getTokens(serverKey: string): Promise<OAuthTokens | undefined> {
        return this.tokens.get(serverKey);
    }

    async saveCodeVerifier(serverKey: string, codeVerifier: string): Promise<void> {
        this.verifiers.set(serverKey, codeVerifier);
    }

    async getCodeVerifier(serverKey: string): Promise<string | undefined> {
        return this.verifiers.get(serverKey);
    }

    async saveClientInformation(serverKey: string, clientInfo: OAuthClientInformationFull): Promise<void> {
        this.clientInfos.set(serverKey, clientInfo);
    }

    async getClientInformation(serverKey: string): Promise<OAuthClientInformation | undefined> {
        return this.clientInfos.get(serverKey);
    }
}

/**
 * OAuthProvider implementation for MCP SDK
 */
export class OAuthProvider implements OAuthClientProvider {
    private serverKey: string;
    private options: OAuthProviderOptions;
    private storage: OAuthStorage;

    /**
     * Create a new OAuthProvider
     * @param serverKey Unique key for the MCP server
     * @param options OAuth provider options
     */
    constructor(serverKey: string, options: OAuthProviderOptions) {
        this.serverKey = serverKey;
        this.options = options;
        this.storage = options.storage || new InMemoryStorage();
    }

    /**
     * Get the redirect URL
     */
    get redirectUrl(): string | URL {
        return this.options.redirectUrl;
    }

    /**
     * Get the client metadata
     */
    get clientMetadata(): OAuthClientMetadata {
        return this.options.clientMetadata;
    }

    /**
     * Get client information if available
     */
    async clientInformation(): Promise<OAuthClientInformation | undefined> {
        const log = logger.createLogger({ prefix: 'OAuthProvider.clientInformation' });

        // First check if we have it in options (pre-registered)
        if (this.options.clientInformation) {
            log.debug(`Using pre-registered client information for server ${this.serverKey}`);
            return this.options.clientInformation;
        }

        // Otherwise check storage (dynamically registered)
        try {
            const clientInfo = await this.storage.getClientInformation(this.serverKey);
            if (clientInfo) {
                log.debug(`Retrieved client information for server ${this.serverKey} from storage`);
            } else {
                log.debug(`No client information available for server ${this.serverKey}`);
            }
            return clientInfo;
        } catch (error) {
            log.error(`Error retrieving client information for server ${this.serverKey}:`, error);
            return undefined;
        }
    }

    /**
     * Save client information after dynamic registration
     */
    async saveClientInformation(clientInformation: OAuthClientInformationFull): Promise<void> {
        const log = logger.createLogger({ prefix: 'OAuthProvider.saveClientInformation' });

        try {
            await this.storage.saveClientInformation(this.serverKey, clientInformation);
            log.info(`Saved client information for server ${this.serverKey}`);
        } catch (error) {
            log.error(`Error saving client information for server ${this.serverKey}:`, error);
            throw error;
        }
    }

    /**
     * Get current tokens if available
     */
    async tokens(): Promise<OAuthTokens | undefined> {
        const log = logger.createLogger({ prefix: 'OAuthProvider.tokens' });

        try {
            const tokens = await this.storage.getTokens(this.serverKey);
            if (tokens) {
                log.debug(`Retrieved tokens for server ${this.serverKey}`);
            } else {
                log.debug(`No tokens available for server ${this.serverKey}`);
            }
            return tokens;
        } catch (error) {
            log.error(`Error retrieving tokens for server ${this.serverKey}:`, error);
            return undefined;
        }
    }

    /**
     * Save tokens after successful authorization
     */
    async saveTokens(tokens: OAuthTokens): Promise<void> {
        const log = logger.createLogger({ prefix: 'OAuthProvider.saveTokens' });

        try {
            await this.storage.saveTokens(this.serverKey, tokens);
            log.info(`Saved tokens for server ${this.serverKey}`);
        } catch (error) {
            log.error(`Error saving tokens for server ${this.serverKey}:`, error);
            throw error;
        }
    }

    /**
     * Redirect to authorization URL to begin OAuth flow
     */
    redirectToAuthorization(authorizationUrl: URL): void {
        const log = logger.createLogger({ prefix: 'OAuthProvider.redirectToAuthorization' });

        log.info(`Redirecting to authorization URL for server ${this.serverKey}: ${authorizationUrl.toString()}`);

        // In a browser environment, this would redirect the user
        // In a Node.js environment, we would need to provide instructions to the user
        if (typeof window !== 'undefined') {
            window.location.href = authorizationUrl.toString();
        } else {
            // For Node.js environment, just log a message
            log.info(`Cannot automatically redirect in Node.js environment.`);
            log.info(`Please manually navigate to: ${authorizationUrl.toString()}`);
            // Implementations might throw an error or provide a callback mechanism here
        }
    }

    /**
     * Save code verifier for PKCE
     */
    async saveCodeVerifier(codeVerifier: string): Promise<void> {
        const log = logger.createLogger({ prefix: 'OAuthProvider.saveCodeVerifier' });

        try {
            await this.storage.saveCodeVerifier(this.serverKey, codeVerifier);
            log.debug(`Saved code verifier for server ${this.serverKey}`);
        } catch (error) {
            log.error(`Error saving code verifier for server ${this.serverKey}:`, error);
            throw error;
        }
    }

    /**
     * Get code verifier for PKCE
     */
    async codeVerifier(): Promise<string> {
        const log = logger.createLogger({ prefix: 'OAuthProvider.codeVerifier' });

        try {
            const verifier = await this.storage.getCodeVerifier(this.serverKey);
            if (!verifier) {
                const error = new Error(`No code verifier found for server ${this.serverKey}`);
                log.error('Code verifier not found:', error);
                throw error;
            }
            log.debug(`Retrieved code verifier for server ${this.serverKey}`);
            return verifier;
        } catch (error) {
            log.error(`Error retrieving code verifier for server ${this.serverKey}:`, error);
            throw error;
        }
    }
} 