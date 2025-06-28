module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'off', // Allow console.log in server
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
  },
}; 