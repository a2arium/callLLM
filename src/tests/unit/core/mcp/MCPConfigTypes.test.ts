import {
    MCPConnectionError,
    MCPToolCallError,
    MCPHttpMode,
    MCPTransportType
} from '../../../../core/mcp/MCPConfigTypes';

describe('MCPConfigTypes', () => {
    describe('MCPConnectionError', () => {
        it('should create error with correct message', () => {
            const serverKey = 'test-server';
            const errorMessage = 'connection failed';
            const error = new MCPConnectionError(serverKey, errorMessage);

            expect(error.name).toBe('MCPConnectionError');
            expect(error.message).toContain('test-server');
            expect(error.message).toContain('connection failed');
        });

        it('should handle cause error', () => {
            const serverKey = 'test-server';
            const errorMessage = 'connection failed';
            const causeError = new Error('network timeout');
            const error = new MCPConnectionError(serverKey, errorMessage, causeError);

            expect(error.cause).toBe(causeError);
        });
    });

    describe('MCPToolCallError', () => {
        it('should create error with correct message', () => {
            const serverKey = 'test-server';
            const toolName = 'get_weather';
            const errorMessage = 'tool call failed';
            const error = new MCPToolCallError(serverKey, toolName, errorMessage);

            expect(error.name).toBe('MCPToolCallError');
            expect(error.message).toContain('test-server');
            expect(error.message).toContain('get_weather');
            expect(error.message).toContain('tool call failed');
        });
    });

    describe('TypeScript types', () => {
        it('should define correct MCPTransportType values', () => {
            // This is a type test, just making sure the enum values exist
            const validTransports: MCPTransportType[] = ['stdio', 'http', 'custom'];
            expect(validTransports.length).toBe(3);
        });

        it('should define correct MCPHttpMode values', () => {
            // This is a type test, just making sure the enum values exist
            const validModes: MCPHttpMode[] = ['sse', 'streamable'];
            expect(validModes.length).toBe(2);
        });
    });
}); 