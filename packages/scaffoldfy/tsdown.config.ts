import { defineConfig } from '@internal/tsdown-config';

const KB = 1024;
const MAX_BUNDLE_SIZE_KB = 80;

export default defineConfig({
  bundleSize: MAX_BUNDLE_SIZE_KB * KB,
  entry: ['src/index.ts', 'src/cli.ts', 'src/validate-scaffoldfy-json.ts'],
  dts: true,
  minify: true,
  clean: true,
  shims: true, // Add Node.js shims for bin script
});
