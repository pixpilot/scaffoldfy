#!/usr/bin/env node
/* eslint-disable node/prefer-global/process */
/**
 * Checks whether @internal/tsdown-config exists in the monorepo's node_modules.
 * Outputs "true" or "false" to stdout.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const cwd = process.cwd();

/*
 * In a pnpm monorepo, the workspace packages may be hoisted to the root
 * node_modules or available via the workspace symlinks.
 * Check common locations relative to the current working directory.
 */
const locations = [
  path.join(cwd, 'node_modules', '@internal', 'tsdown-config'),
  path.join(cwd, '..', 'node_modules', '@internal', 'tsdown-config'),
  path.join(cwd, '..', '..', 'node_modules', '@internal', 'tsdown-config'),
];

const exists = locations.some((loc) => fs.existsSync(loc));

process.stdout.write(exists ? 'true' : 'false');
