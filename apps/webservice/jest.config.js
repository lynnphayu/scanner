const path = require('path')
const fs = require('fs')
const {pathsToModuleNameMapper} = require('ts-jest')
const {compilerOptions} = require('./tsconfig.json')

const symLinksToModuleMapper = (directory, prefix = '') => {
  const normalized = path.join(__dirname, directory)
  const dirname = path.basename(normalized)
  const entries = fs
    .readdirSync(directory)
    .map((x) => [path.join(dirname, x), prefix + path.relative(__dirname, fs.realpathSync(path.join(normalized, x)))])
    .map(([name, path]) => [`^${name}/(.*)$`, `${path}/src/$1`])
  return Object.fromEntries(entries)
}

/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  collectCoverageFrom: ['**/*.(t|j)s'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    ...symLinksToModuleMapper('./node_modules/@gr-asmt', '<rootDir>'),
    ...pathsToModuleNameMapper(compilerOptions.paths, {prefix: '<rootDir>/'})
  },
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
  globalSetup: '<rootDir>/testSetup.ts',
  globalTeardown: '<rootDir>/testTeardown.ts',
  verbose: true
}
