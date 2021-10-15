export default {
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  transform: {},
  collectCoverage: true,
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/src/types/'
  ],
  testEnvironment: 'jest-environment-node',
  // https://kulshekhar.github.io/ts-jest/docs/next/guides/esm-support/
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  // https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c の設定をした後、
  // jest(ts-jest) が import で `.js` 付きを認識しない問題回避(これだけでも大丈夫そう).
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
}
