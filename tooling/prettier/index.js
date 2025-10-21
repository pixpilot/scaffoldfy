import prettierConfig from '@pixpilot/dev-config/prettier';

/** @typedef {import("prettier").Config} PrettierConfig */

/** @type { PrettierConfig } */
const config = {
  ...prettierConfig,
  overrides: [
    {
      files: '*.json.hbs',
      options: {
        parser: 'json',
      },
    },
    {
      files: '*.js.hbs',
      options: {
        parser: 'babel',
      },
    },
    {
      files: ['*.ts.hbs', '*.tsx.hbs'],
      options: {
        parser: 'typescript',
      },
    },
  ],
};

export default config;
