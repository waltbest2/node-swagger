module.exports = {
  preset: 'ts-jest',
  roots: ['<rootDir>/test'],
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node', 'mjs'],
  moduleDirectories: ['node_modules', 'src'],
  modulePaths: ['<rootDir>'],
  moduleNameMapper: {
    '@mock/(.*)': '<rootDir>/mock/$1',
  },
  coverageReporters: ['html'],
  collectCoverageFrom: ['<rootDir>/src'],
  extensionsToTreatAsEsm: ['.ts'],
  setupFiles: ['jest-canvas-mock', '<rootDir>/setupJest.ts'],
  transform: {
    '^.+\\.(js|mjs)$': 'babel-jest',
    '^.+\\.ts$': [
      'ts-jest', {
        tsconfg: '<rootDir>/tsconfig.jest.json',
        useESM: true,
      },
    ],
  },
  transformIgnorePatterns: [],
  reporters: [
    'default', [
      'jest-junit', {
        outputDirectory: 'reports',
        outputName: 'report.xml',
      }
    ]
  ]
}