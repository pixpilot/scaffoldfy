#!/usr/bin/env node
/* eslint-disable node/prefer-global/process */
/**
 * Adds user-specified dependencies to a package.json file and sorts all
 * dependency maps alphabetically.
 *
 * Usage:
 *   node add-dependencies.js --file=<path> --deps="dep1 dep2 dep3"
 */

'use strict';

const fs = require('node:fs');

const INDENT_SPACES = 2;

/** @param {string} prefix */
function getArg(prefix) {
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

const file = getArg('--file=');
const depsRaw = getArg('--deps=');

if (!file) {
  console.error('Missing --file argument');
  process.exit(1);
}

if (!depsRaw || !depsRaw.trim()) {
  /* No dependencies to add — exit gracefully. */
  process.exit(0);
}

if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

/** @type {Record<string, unknown>} */
let pkg;

try {
  pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`Failed to parse ${file}: ${err.message}`);
  process.exit(1);
}

const deps = depsRaw.split(' ').filter(Boolean);

if (!pkg.dependencies || typeof pkg.dependencies !== 'object') {
  pkg.dependencies = {};
}

for (const dep of deps) {
  pkg.dependencies[dep] = '*';
}

/**
 * Sort a dependency map alphabetically by key.
 */
function sortDeps(map) {
  return Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
}

if (pkg.dependencies && typeof pkg.dependencies === 'object') {
  pkg.dependencies = sortDeps(pkg.dependencies);
}

if (pkg.devDependencies && typeof pkg.devDependencies === 'object') {
  pkg.devDependencies = sortDeps(pkg.devDependencies);
}

fs.writeFileSync(file, JSON.stringify(pkg, null, INDENT_SPACES));
