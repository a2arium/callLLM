/**
 * Get the current time for a specific location
 * 
 * @param params - Object containing location information
 * @param params.location - The city and country, e.g. "Tokyo, Japan"
 * @returns The current time at the specified location
 */
export function toolFunction(params: { location: string }): { time: string; timezone: string } {
    console.log(`getTime tool called with location: ${params.location}`);

    // In a real implementation, this would use a timezone API
    // This is a mock implementation for demonstration purposes
    const mockTimezones: Record<string, { offset: number; timezone: string }> = {
        'london': { offset: 1, timezone: 'BST' },  // British Summer Time
        'new york': { offset: -4, timezone: 'EDT' }, // Eastern Daylight Time
        'tokyo': { offset: 9, timezone: 'JST' }, // Japan Standard Time
        'paris': { offset: 2, timezone: 'CEST' }, // Central European Summer Time
        'sydney': { offset: 10, timezone: 'AEST' }, // Australian Eastern Standard Time
    };

    // Normalize location to lowercase and remove country part
    const normalizedLocation = params.location.toLowerCase().split(',')[0].trim();

    // Get timezone info for the location or use UTC
    const timezoneInfo = mockTimezones[normalizedLocation] || { offset: 0, timezone: 'UTC' };

    // Create a date object with the timezone offset
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const locationTime = new Date(utcTime + (3600000 * timezoneInfo.offset));

    // Format the time for the response
    const formattedTime = locationTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    return {
        time: formattedTime,
        timezone: timezoneInfo.timezone
    };
} 