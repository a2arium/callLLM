/** @type {import('ts-jest').JestConfigWithTsEsm} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.test.json'
    }],
  },
  moduleNameMapper: {
    // Alias for src directory (mimics tsconfig @/*)
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock tiktoken for all tests
    '^@dqbd/tiktoken$': '<rootDir>/src/tests/__mocks__/@dqbd/tiktoken.ts'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@dqbd/tiktoken|dotenv|detect-libc|sharp)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  rootDir: '.',
}; 