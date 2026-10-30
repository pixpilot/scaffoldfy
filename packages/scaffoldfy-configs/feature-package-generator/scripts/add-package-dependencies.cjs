#!/usr/bin/env node
/* eslint-disable node/prefer-global/process */
/**
 * Adds dependencies an extending config lists to a generated package.json and
 * sorts every dependency map alphabetically.
 *
 * Each entry is `name` or `name@spec`; without a spec it gets `catalog:`, which
 * resolve-catalogs.cjs then points at the catalog that defines it.
 *
 * Usage:
 *   node add-package-dependencies.cjs --file=<path>
 *     [--dependencies="@internal/shared@workspace:* zod"]
 *     [--dev-dependencies="@electric-sql/pglite-pgvector"]
 */

'use strict';

const fs = require('node:fs');

const INDENT_SPACES = 2;
const DEFAULT_SPEC = 'catalog:';
const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies'];

/** @param {string} prefix */
function getArg(prefix) {
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

/**
 * Split `name@spec` into its parts; a leading `@` belongs to the scope.
 * @param {string} entry
 * @returns {[string, string]}
 */
function parseEntry(entry) {
  const separator = entry.lastIndexOf('@');
  if (separator <= 0) return [entry, DEFAULT_SPEC];
  return [entry.slice(0, separator), entry.slice(separator + 1)];
}

/** @param {string | undefined} raw */
function parseList(raw) {
  return (raw ?? '').split(/\s+/u).filter(Boolean).map(parseEntry);
}

/** @param {Record<string, string>} map */
function sortMap(map) {
  return Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
}

const file = getArg('--file=');
if (!file || !fs.existsSync(file)) {
  console.error(`package.json not found: ${file ?? '(missing --file)'}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
const additions = {
  dependencies: parseList(getArg('--dependencies=')),
  devDependencies: parseList(getArg('--dev-dependencies=')),
};

for (const [field, entries] of Object.entries(additions)) {
  if (entries.length > 0) {
    pkg[field] = pkg[field] ?? {};
    for (const [name, spec] of entries) pkg[field][name] = spec;
  }
}

for (const field of DEPENDENCY_FIELDS) {
  if (pkg[field] && typeof pkg[field] === 'object') pkg[field] = sortMap(pkg[field]);
}

fs.writeFileSync(file, `${JSON.stringify(pkg, null, INDENT_SPACES)}\n`);
