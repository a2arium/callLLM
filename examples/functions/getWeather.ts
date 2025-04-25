/**
 * Get the current weather for a location
 * 
 * @param params - Object containing location information
 * @param params.location - The city and country, e.g. "London, UK"
 * @returns Weather information for the location
 */
export function toolFunction(params: { location: string }): { temperature: number; conditions: string; humidity: number } {
    console.log(`getWeather tool called with location: ${params.location}`);

    // In a real implementation, this would call a weather API
    // This is a mock implementation for demonstration purposes
    const mockWeatherData: Record<string, { temperature: number; conditions: string; humidity: number }> = {
        'san francisco': { temperature: 18, conditions: 'Foggy', humidity: 76 },
        'new york': { temperature: 24, conditions: 'Partly Cloudy', humidity: 65 },
        'london': { temperature: 16, conditions: 'Rainy', humidity: 82 },
        'tokyo': { temperature: 26, conditions: 'Sunny', humidity: 70 },
        'paris': { temperature: 22, conditions: 'Clear', humidity: 60 },
    };

    // Normalize location to lowercase and remove country part
    const normalizedLocation = params.location.toLowerCase().split(',')[0].trim();

    // Get weather for the location or return default data
    const weatherData = mockWeatherData[normalizedLocation] || {
        temperature: 20,
        conditions: 'Clear',
        humidity: 65
    };

    return weatherData;
} 