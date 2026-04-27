/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globalSetup: '<rootDir>/src/test/globalSetup.ts',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@thms/shared$': '<rootDir>/../../packages/shared/src',
    '^@thms/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
    '^openai$': '<rootDir>/src/test/__mocks__/openai.js',
    '^openai/(.*)$': '<rootDir>/src/test/__mocks__/openai.js',
    '^googleapis$': '<rootDir>/src/test/__mocks__/googleapis.js',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: false, isolatedModules: true }],
  },
  transformIgnorePatterns: ['node_modules/(?!(@paralleldrive|@faker-js|fishery)/)'],
};
