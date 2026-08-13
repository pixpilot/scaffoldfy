import baseConfig from '@internal/eslint-config/base';

// Uncomment to use the internal ESLint config if available
// /** @type {import('@internal/eslint-config').Config} */
/** @type {import('typescript-eslint').Config} */
export default [
  ...(await baseConfig()),
  {
    files: ['test/**/*.test.ts'],
    rules: {
      'dot-notation': 'off',
      'ts/dot-notation': 'off',
    },
  },
];
