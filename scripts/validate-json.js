#!/usr/bin/env node

/**
 * Convenience script to run JSON validation from the root of the repository
 *
 * Usage:
 *   node scripts/validate-json.js --file path/to/file.json
 *   node scripts/validate-json.js --dir path/to/directory
 *
 * Or via pnpm:
 *   pnpm validate:json --file path/to/file.json
 *   pnpm validate:json --dir path/to/directory
 */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const filename = fileURLToPath(import.meta.url);
const scriptDir = dirname(filename);
const rootDir = join(scriptDir, '..');

// Get all arguments after the script name
const ARGV_OFFSET = 2;
const args = process.argv.slice(ARGV_OFFSET);

if (args.length === 0) {
  console.error('Usage: pnpm validate:json --file <path> or --dir <path>');
  console.error('');
  console.error('Options:');
  console.error('  --file <path>  Validate a single JSON file');
  console.error('  --dir <path>   Validate all JSON files in a directory');
  console.error('');
  console.error('Examples:');
  console.error(
    '  pnpm validate:json --file packages/scaffoldfy/examples/template-tasks-with-prompts.json',
  );
  console.error('  pnpm validate:json --dir packages/scaffoldfy/examples');
  process.exit(1);
}

// Convert relative paths to absolute paths
const processedArgs = args.map((arg, index) => {
  // Check if the previous argument was --file or --dir
  if (
    index > 0 &&
    (args[index - 1] === '--file' ||
      args[index - 1] === '-f' ||
      args[index - 1] === '--dir' ||
      args[index - 1] === '-d')
  ) {
    // Convert to absolute path
    return join(rootDir, arg);
  }
  return arg;
});

// Run the validation command
const result = spawnSync(
  'pnpm',
  [
    '--filter',
    '@pixpilot/scaffoldfy',
    'exec',
    'node',
    'dist/validate-scaffoldfy-json.js',
    ...processedArgs,
  ],
  {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
  },
);

process.exit(result.status || 0);
