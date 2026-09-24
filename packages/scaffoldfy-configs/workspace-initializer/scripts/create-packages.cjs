#!/usr/bin/env node
/* eslint-disable node/prefer-global/process */
/**
 * Runs the workspace package generator once per package name, pre-filling
 * the package name prompt so only the remaining prompts are asked.
 *
 * Usage:
 *   PACKAGE_NAMES="pkg-a, pkg-b" node create-packages.cjs
 */

'use strict';

const { spawnSync } = require('node:child_process');

const SAFE_NAME = /^[\w.@/-]+$/u;

const names = (process.env.PACKAGE_NAMES || '')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);

if (names.length === 0) {
  console.log('No package names provided, skipping package creation.');
  process.exit(0);
}

const invalid = names.filter((name) => !SAFE_NAME.test(name));
if (invalid.length > 0) {
  console.error(`Invalid package name(s): ${invalid.join(', ')}`);
  process.exit(1);
}

for (const [index, name] of names.entries()) {
  console.log(`\nCreating package ${index + 1}/${names.length}: ${name}\n`);

  const result = spawnSync(
    'pnpm',
    ['run', 'gen:package', '--set', `packageBaseName=${name}`],
    { stdio: 'inherit', shell: true },
  );

  if (result.status !== 0) {
    console.error(`Failed to create package: ${name}`);
    process.exit(result.status ?? 1);
  }
}
