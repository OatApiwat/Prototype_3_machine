module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
  settings: { react: { version: '18.3' } },
  extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:react-hooks/recommended'],
  rules: { 'react/prop-types': 'off', 'no-unused-vars': ['warn', { args: 'none' }] },
  ignorePatterns: ['dist', 'src/legacy/**'],
};
