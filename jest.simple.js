/** @type {import('ts-jest').JestConfigWithTsEsm} */
export default {
  // Use a very minimalist configuration
  extensionsToTreatAsEsm: ['.ts'],
  modulePathIgnorePatterns: ['<rootDir>/dist'],
  moduleNameMapper: {
    // Only map .js extensions for ESM imports
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.test.json'
      },
    ],
  },
  // Add global mocks for problematic modules
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Disable strict resolver 
  resolver: undefined
}; 