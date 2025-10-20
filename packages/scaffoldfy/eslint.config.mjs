import baseConfig from '@internal/eslint-config/base';

// Uncomment to use the internal ESLint config if available
// /** @type {import('@internal/eslint-config').Config} */
/** @type {import('typescript-eslint').Config} */
export default await baseConfig({
  rules: {
    'no-console': 'off',
  },
}).then((config) => [
  ...config,
  {
    ignores: ['examples/**/*'],
  },
]);
