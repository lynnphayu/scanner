const path = require('path')
const fs = require('fs')

/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  collectCoverageFrom: ['**/*.(t|j)s'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/src/'],
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest'
  },
  transformIgnorePatterns: ['^.+\\.js$'],
  coverageDirectory: './coverage',
  coveragePathIgnorePatterns: ['main.ts'],
  verbose: true
}
