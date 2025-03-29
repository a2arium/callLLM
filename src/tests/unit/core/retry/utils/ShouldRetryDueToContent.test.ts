import { shouldRetryDueToContent, FORBIDDEN_PHRASES } from "../../../../../core/retry/utils/ShouldRetryDueToContent";

describe("shouldRetryDueToContent", () => {
    // Testing string inputs
    describe("with string inputs", () => {
        test("returns true if response is short and contains a forbidden phrase", () => {
            const response = "I cannot assist with that";
            expect(shouldRetryDueToContent(response, 200)).toBe(true);
        });

        test("returns true if response is short but does not contain a forbidden phrase", () => {
            const response = "This is a normal response.";
            expect(shouldRetryDueToContent(response, 200)).toBe(true);
        });

        test("returns true if response is long and contains a forbidden phrase", () => {
            const longResponse = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. I cannot provide that information. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Suspendisse potenti. Extra text to ensure the response exceeds the threshold.";
            expect(longResponse.length).toBeGreaterThan(200);
            expect(shouldRetryDueToContent(longResponse, 200)).toBe(true);
        });

        test("is case insensitive", () => {
            const response = "i CANNOT PROVIDE THIS information";
            expect(shouldRetryDueToContent(response, 200)).toBe(true);
        });

        test("returns false for long string response without forbidden phrases", () => {
            const longString = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
            expect(longString.length).toBeGreaterThan(200);
            expect(shouldRetryDueToContent(longString, 200)).toBe(false);
        });

        test("handles a string with only whitespace", () => {
            const whitespaceString = "    \t\n   ";
            expect(shouldRetryDueToContent(whitespaceString, 200)).toBe(true);
        });
    });

    // Testing object inputs
    describe("with object inputs", () => {
        test("returns false for response with tool calls", () => {
            const response = {
                content: "I cannot assist with that",
                toolCalls: [{ name: "search", arguments: { query: "test" } }]
            };
            expect(shouldRetryDueToContent(response, 200)).toBe(false);
        });

        test("returns true for response object with empty content", () => {
            const response = {
                content: "",
                toolCalls: []
            };
            expect(shouldRetryDueToContent(response, 200)).toBe(true);
        });

        test("returns false for response object with short content", () => {
            const response = {
                content: "Short response",
                toolCalls: []
            };
            expect(shouldRetryDueToContent(response, 200)).toBe(false);
        });

        test("returns true for response object with content containing a forbidden phrase", () => {
            const response = {
                content: "I cannot assist with that request",
                toolCalls: []
            };
            expect(shouldRetryDueToContent(response, 200)).toBe(true);
        });

        test("returns false for response object with long content and no forbidden phrases", () => {
            const longContent = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
            const response = {
                content: longContent,
                toolCalls: []
            };
            expect(longContent.length).toBeGreaterThan(200);
            expect(shouldRetryDueToContent(response, 200)).toBe(false);
        });

        test("returns false for response object with valid content after tool execution", () => {
            const response = {
                content: "This is a valid response after tool execution",
                toolCalls: []
            };
            expect(shouldRetryDueToContent(response, 200)).toBe(false);
        });

        test("returns true for response object with long content containing a forbidden phrase", () => {
            const longContent = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. I cannot assist with that request. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.";
            const response = {
                content: longContent,
                toolCalls: []
            };
            expect(longContent.length).toBeGreaterThan(200);
            expect(shouldRetryDueToContent(response, 200)).toBe(true);
        });

        test("handles edge case with empty toolCalls array but sufficient content", () => {
            // This test ensures full branch coverage for the last condition
            const validContent = "This is a completely valid response with sufficient length to pass the threshold check. It does not contain any forbidden phrases and is perfectly acceptable as a response from the AI. The content should be treated as valid.";
            expect(validContent.length).toBeGreaterThan(200);
            const response = {
                content: validContent,
                toolCalls: []
            };
            expect(shouldRetryDueToContent(response, 200)).toBe(false);
        });

        test("handles response object with empty tool calls array", () => {
            const response = {
                content: "Content",
                toolCalls: []
            };
            expect(shouldRetryDueToContent(response, 200)).toBe(false);
        });

        test("handles response object with whitespace-only content", () => {
            const response = {
                content: "   \t\n  ",
                toolCalls: []
            };
            expect(shouldRetryDueToContent(response, 200)).toBe(true);
        });
    });

    // Testing null/undefined
    describe("with null/undefined inputs", () => {
        test("returns true for null response", () => {
            const response = null;
            expect(shouldRetryDueToContent(response, 200)).toBe(true);
        });

        test("returns true for undefined response", () => {
            const response = undefined;
            expect(shouldRetryDueToContent(response, 200)).toBe(true);
        });
    });

    // Testing with different thresholds
    describe("with different thresholds", () => {
        test("uses default threshold when not specified", () => {
            const response = "Short response";
            expect(shouldRetryDueToContent(response)).toBe(true);
        });

        test("applies custom threshold for string input", () => {
            const response = "This is a response that is longer than 10 characters";
            expect(shouldRetryDueToContent(response, 10)).toBe(false);
        });

        test("applies custom threshold for object input", () => {
            const response = {
                content: "This is a response that is longer than 10 characters",
                toolCalls: []
            };
            expect(shouldRetryDueToContent(response, 10)).toBe(false);
        });
    });
}); 