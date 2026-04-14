/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@thms/shared$': '<rootDir>/../../packages/shared/src',
    '^@thms/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
    '^@paralleldrive/cuid2$': '/app/node_modules/@paralleldrive/cuid2',
    '^openai$': '<rootDir>/src/__tests__/__mocks__/openai.js',
    '^openai/(.*)$': '<rootDir>/src/__tests__/__mocks__/openai.js',
    '^googleapis$': '<rootDir>/src/__tests__/__mocks__/googleapis.js',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: false, isolatedModules: true }],
  },
  transformIgnorePatterns: ['node_modules/(?!(@paralleldrive)/)'],
};
