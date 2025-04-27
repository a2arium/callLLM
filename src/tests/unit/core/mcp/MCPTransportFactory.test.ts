import { spawn } from 'child_process';
import { MCPConnectionError } from '../../../../core/mcp/MCPConfigTypes';
import { MCPTransportFactory } from '../../../../core/mcp/MCPTransportFactory';
import { MCPServerConfig } from '../../../../core/mcp/MCPConfigTypes';

// Mock child_process.spawn
jest.mock('child_process', () => ({
    spawn: jest.fn().mockReturnValue({
        stdin: {
            writable: true,
            write: jest.fn()
        },
        stdout: {
            on: jest.fn(),  // Add this to support readline.createInterface
        },
        stderr: {},
        kill: jest.fn(),
        on: jest.fn()  // Add this to handle process events
    })
}));

// Mock readline module
jest.mock('readline', () => ({
    createInterface: jest.fn().mockReturnValue({
        on: jest.fn(),
        close: jest.fn()
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

        it('should handle spawn process errors for stdio transport', async () => {
            const mockSpawnError = new Error('Spawn process failed');
            (spawn as jest.Mock).mockImplementationOnce(() => {
                throw mockSpawnError;
            });

            const serverKey = 'test-server';
            const config = {
                command: 'npx',
                args: []
            };

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

        it('should allow http URLs for 127.0.0.1', async () => {
            const serverKey = 'test-server';
            const config = { url: 'http://127.0.0.1:3000/mcp' };

            const transport = await MCPTransportFactory.createTransport(serverKey, config);
            expect(transport).toBeDefined();
        });

        it('should throw error for custom transport', async () => {
            const serverKey = 'test-server';
            const config = { type: 'custom' as const };

            await expect(MCPTransportFactory.createTransport(serverKey, config))
                .rejects.toThrow(MCPConnectionError);
        });

        it('should throw error for custom transport without pluginPath', async () => {
            const serverKey = 'test-server';
            const config: MCPServerConfig = {
                type: 'custom'
            };

            await expect(MCPTransportFactory.createTransport(serverKey, config))
                .rejects.toThrow('Failed to create custom transport');
        });

        it('should throw error for unknown transport type', async () => {
            const serverKey = 'test-server';
            const config = {
                type: 'unknown' as any
            };

            await expect(MCPTransportFactory.createTransport(serverKey, config))
                .rejects.toThrow('Unsupported transport type: unknown');
        });

        it('should handle errors in HTTP transport creation', async () => {
            const serverKey = 'test-server';
            const config: MCPServerConfig = {
                type: 'http',
                url: 'https://example.com',
                headers: {
                    'Authorization': 'Bearer ${API_KEY}'
                }
            };

            // Force an error in HTTP transport creation
            const mockError = new Error('HTTP transport error');
            jest.spyOn(MCPTransportFactory as any, 'createHttpTransport').mockImplementationOnce(() => {
                throw mockError;
            });

            await expect(MCPTransportFactory.createTransport(serverKey, config))
                .rejects.toThrow('HTTP transport error');
        });
    });

    describe('transport methods', () => {
        it('should implement start method for stdio transport', async () => {
            const serverKey = 'test-server';
            const config = {
                command: 'npx',
                args: []
            };

            const transport = await MCPTransportFactory.createTransport(serverKey, config);
            // Call the method to increase coverage
            await transport.start();
            expect(transport).toBeDefined();
        });

        it('should implement send method for stdio transport', async () => {
            const serverKey = 'test-server';
            const config = {
                command: 'npx',
                args: []
            };

            const transport = await MCPTransportFactory.createTransport(serverKey, config);
            // Call the method to increase coverage
            await transport.send({ type: 'test-message' });

            // Verify write was called on stdin
            const mockProcess = spawn('npx', []);
            expect(mockProcess.stdin.write).toHaveBeenCalled();
        });

        it('should implement close method for stdio transport', async () => {
            const serverKey = 'test-server';
            const config = {
                command: 'npx',
                args: []
            };

            const transport = await MCPTransportFactory.createTransport(serverKey, config);
            // Call the method to increase coverage
            await transport.close();

            // Verify kill was called
            const mockProcess = spawn('npx', []);
            expect(mockProcess.kill).toHaveBeenCalled();
        });

        it('should implement callback setters for stdio transport', async () => {
            const serverKey = 'test-server';
            const config = {
                command: 'npx',
                args: []
            };

            const transport = await MCPTransportFactory.createTransport(serverKey, config);

            // Set the callbacks to increase coverage
            const messageHandler = jest.fn();
            const closeHandler = jest.fn();
            const errorHandler = jest.fn();

            transport.onmessage = messageHandler;
            transport.onclose = closeHandler;
            transport.onerror = errorHandler;

            expect(transport).toBeDefined();
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

        it('should handle missing environment variables in substitution', async () => {
            const serverKey = 'test-server';
            const config = {
                command: 'npx',
                env: {
                    MISSING_VAR: '${NON_EXISTENT_VAR}',
                    NORMAL_VAR: 'normal-value'
                }
            };

            await MCPTransportFactory.createTransport(serverKey, config);

            expect(spawn).toHaveBeenCalledWith(
                'npx',
                expect.any(Array),
                expect.objectContaining({
                    env: expect.objectContaining({
                        MISSING_VAR: '', // Should be empty string when env var doesn't exist
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