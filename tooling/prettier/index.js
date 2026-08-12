import prettierConfig from '@pixpilot/dev-config/prettier';

/** @typedef {import("prettier").Config} PrettierConfig */

/** @type { PrettierConfig } */
const config = {
  ...prettierConfig,
  overrides: [
    // Keep the shared overrides (e.g. `trailingComma: "none"` for JSON/JSONC),
    // otherwise declaring `overrides` here would replace them entirely.
    ...(prettierConfig.overrides ?? []),
    {
      files: '*.json.hbs',
      options: {
        parser: 'json',
      },
    },
    {
      files: ['*.js.hbs', '*.jsx.hbs'],
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
