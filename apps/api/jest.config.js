/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@thms/shared$': '<rootDir>/../../packages/shared/src',
    '^@thms/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: false }],
  },
  globalSetup: '<rootDir>/src/__tests__/globalSetup.ts',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/index.ts'],
};
