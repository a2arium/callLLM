/** @type {import('ts-jest').JestConfigWithTsEsm} */
export default {
  // preset: 'ts-jest/presets/default-esm', // Defining manually for more control
  extensionsToTreatAsEsm: ['.ts'], // Treat .ts files as ESM
  modulePathIgnorePatterns: ['<rootDir>/dist'], // Stop Haste map warnings
  moduleNameMapper: {
    // Map relative .js imports to extensionless (ESM specific)
    '^(\\.{1,2}/.*)\\.js$': '$1',

    // Handle common absolute path patterns
    '^@/(.*)$': '<rootDir>/src/$1',

    // Correctly map external imports in Jest internals
    '^../collections$': '<rootDir>/node_modules/pretty-format/build/collections',
    '^../package.json$': '<rootDir>/node_modules/@jest/transform/package.json',

    // Handle deep relative paths from test files to src files (but exclude node_modules)
    '^(?!.*node_modules).*../../../../(.*)$': '<rootDir>/src/$1',
    '^(?!.*node_modules).*../../../(.*)$': '<rootDir>/src/$1', 
    '^(?!.*node_modules).*../../(.*)$': '<rootDir>/src/$1',
    '^(?!.*node_modules).*../(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true, // Important for ESM support
        tsconfig: 'tsconfig.test.json', // Use relaxed TypeScript config for tests
      },
    ],
  },
  transformIgnorePatterns: [
    // Transform any ESM modules in node_modules that need to be processed
    'node_modules/(?!(@dqbd/tiktoken|dotenv|detect-libc|sharp)/)'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Add other Jest configurations as needed
  // For example:
  // coverageProvider: 'v8',
}; 