import { spawn } from 'child_process';
import { MCPConnectionError } from '../../../../core/mcp/MCPConfigTypes';
import { MCPTransportFactory } from '../../../../core/mcp/MCPTransportFactory';

// Mock child_process.spawn
jest.mock('child_process', () => ({
    spawn: jest.fn().mockReturnValue({
        stdin: {
            writable: true,
            write: jest.fn()
        },
        stdout: {},
        stderr: {},
        kill: jest.fn()
    })
}));

describe('MCPTransportFactory', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('inferTransportType', () => {
        it('should return explicit type if provided', () => {
            const config = { type: 'stdio' as const };
            expect(MCPTransportFactory.inferTransportType(config)).toBe('stdio');
        });

        it('should infer stdio from command', () => {
            const config = { command: 'npx' };
            expect(MCPTransportFactory.inferTransportType(config)).toBe('stdio');
        });

        it('should infer http from url', () => {
            const config = { url: 'https://example.com/mcp' };
            expect(MCPTransportFactory.inferTransportType(config)).toBe('http');
        });

        it('should throw error if type cannot be inferred', () => {
            const config = {};
            expect(() => MCPTransportFactory.inferTransportType(config)).toThrow(MCPConnectionError);
        });
    });

    describe('createTransport', () => {
        it('should create stdio transport when type is stdio', async () => {
            const serverKey = 'test-server';
            const config = {
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
                env: { TEST_VAR: 'test-value' }
            };

            const transport = await MCPTransportFactory.createTransport(serverKey, config);

            expect(transport).toBeDefined();
            expect(spawn).toHaveBeenCalledWith(
                'npx',
                ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
                expect.objectContaining({
                    env: expect.objectContaining({
                        TEST_VAR: 'test-value'
                    })
                })
            );
        });

        it('should throw error when stdio transport lacks command', async () => {
            const serverKey = 'test-server';
            const config = { type: 'stdio' as const };

            await expect(MCPTransportFactory.createTransport(serverKey, config))
                .rejects.toThrow(MCPConnectionError);
        });

        it('should create http transport when type is http', async () => {
            const serverKey = 'test-server';
            const config = {
                url: 'https://example.com/mcp',
                mode: 'sse' as const,
                headers: { 'Authorization': 'Bearer ${TOKEN}' }
            };

            const transport = await MCPTransportFactory.createTransport(serverKey, config);

            expect(transport).toBeDefined();
            // HTTP transport implementation is a placeholder, so we can't test much more
        });

        it('should throw error when http transport lacks url', async () => {
            const serverKey = 'test-server';
            const config = { type: 'http' as const };

            await expect(MCPTransportFactory.createTransport(serverKey, config))
                .rejects.toThrow(MCPConnectionError);
        });

        it('should throw error for non-https URLs outside localhost', async () => {
            const serverKey = 'test-server';
            const config = { url: 'http://example.com/mcp' };

            await expect(MCPTransportFactory.createTransport(serverKey, config))
                .rejects.toThrow(MCPConnectionError);
        });

        it('should allow http URLs for localhost', async () => {
            const serverKey = 'test-server';
            const config = { url: 'http://localhost:3000/mcp' };

            const transport = await MCPTransportFactory.createTransport(serverKey, config);
            expect(transport).toBeDefined();
        });

        it('should throw error for custom transport', async () => {
            const serverKey = 'test-server';
            const config = { type: 'custom' as const };

            await expect(MCPTransportFactory.createTransport(serverKey, config))
                .rejects.toThrow(MCPConnectionError);
        });
    });

    describe('environment variable substitution', () => {
        beforeEach(() => {
            process.env.TEST_ENV_VAR = 'env-value';
        });

        afterEach(() => {
            delete process.env.TEST_ENV_VAR;
        });

        it('should substitute env vars in stdio transport', async () => {
            const serverKey = 'test-server';
            const config = {
                command: 'npx',
                env: {
                    SUBSTITUTED_VAR: '${TEST_ENV_VAR}',
                    NORMAL_VAR: 'normal-value'
                }
            };

            await MCPTransportFactory.createTransport(serverKey, config);

            expect(spawn).toHaveBeenCalledWith(
                'npx',
                expect.any(Array),
                expect.objectContaining({
                    env: expect.objectContaining({
                        SUBSTITUTED_VAR: 'env-value',
                        NORMAL_VAR: 'normal-value'
                    })
                })
            );
        });

        it('should substitute env vars in http headers', async () => {
            const serverKey = 'test-server';
            const config = {
                url: 'https://example.com/mcp',
                headers: {
                    'Authorization': 'Bearer ${TEST_ENV_VAR}',
                    'Content-Type': 'application/json'
                }
            };

            // We can't easily check the internal state of the HTTP transport,
            // but we can at least ensure the function runs without errors
            const transport = await MCPTransportFactory.createTransport(serverKey, config);
            expect(transport).toBeDefined();
        });
    });
}); 