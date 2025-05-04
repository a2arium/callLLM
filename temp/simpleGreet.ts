
/**
 * A simple test function.
 * @param name - The name to greet
 * @param age - The age of the person
 */
export function toolFunction(params: { name: string; age: number }): string {
    return `Hello ${params.name}, you are ${params.age} years old!`;
}
        