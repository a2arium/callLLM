import { shouldRetryDueToContent, FORBIDDEN_PHRASES } from "../../../../../core/retry/utils/ShouldRetryDueToContent";

describe("shouldRetryDueToContent", () => {
    test("returns true if response is short and contains a forbidden phrase", () => {
        const response = "I cannot assist with that";
        expect(shouldRetryDueToContent(response, 200)).toBe(true);
    });

    test("returns false if response is short but does not contain a forbidden phrase", () => {
        const response = "This is a normal response.";
        expect(shouldRetryDueToContent(response, 200)).toBe(false);
    });

    test("returns false if response is long even if it contains a forbidden phrase", () => {
        const longResponse = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. I cannot provide that information. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Suspendisse potenti. Extra text to ensure the response exceeds the threshold.";
        expect(longResponse.length).toBeGreaterThan(200);
        expect(shouldRetryDueToContent(longResponse, 200)).toBe(false);
    });

    test("is case insensitive", () => {
        const response = "i CANNOT PROVIDE THIS information";
        expect(shouldRetryDueToContent(response, 200)).toBe(true);
    });
}); 