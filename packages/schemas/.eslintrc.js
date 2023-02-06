/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ['@onecp'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json']
  },
  ignorePatterns: ['**/*.js', '**/*.cjs', '**/*.mjs']
}
