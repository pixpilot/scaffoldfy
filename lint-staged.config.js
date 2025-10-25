module.exports = {
  '*.{ts,tsx}': () => ['pnpm run typecheck'],
  '*.{ts,tsx,js,jsx,yml,yaml,json}': () => ['pnpm run lint:fix', 'pnpm run format:fix'],
  'packages/scaffoldfy/**/*.json': (files) => [
    `pnpm --filter @pixpilot/scaffoldfy run validate-scaffoldfy-json ${files.map((f) => `--file "${f}"`).join(' ')}`,
  ],
};
