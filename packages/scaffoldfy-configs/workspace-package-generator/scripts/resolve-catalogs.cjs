#!/usr/bin/env node
/* eslint-disable no-continue */
/* eslint-disable node/prefer-global/process */
/**
 * Rewrites `catalog:<name>` references in a generated package.json so they
 * point at the catalog that actually defines each dependency in the root
 * pnpm-workspace.yaml. This lets the template use default catalog names while
 * each workspace is free to group its catalogs however it likes.
 *
 * Resolution order for every `catalog:<name>` dependency:
 *  1. Keep it when catalog <name> defines the dependency.
 *  2. Use the default catalog (`catalog:`) when it defines the dependency.
 *  3. Use the first named catalog (in file order) that defines it.
 *  4. Fall back to "*" so `pnpm install` does not fail on a missing catalog.
 *
 * When pnpm-workspace.yaml is missing or defines no catalogs, the file is left
 * untouched. Debug output is written to stderr.
 *
 * Usage:
 *   node resolve-catalogs.cjs --file=<path> [--workspace-file=<path>]
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const INDENT_SPACES = 2;
const CATALOG_PREFIX = 'catalog:';
const DEFAULT_CATALOG = '';
const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

/** @param {string} prefix */
function getArg(prefix) {
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

/** @param {string} message */
function log(message) {
  process.stderr.write(`[resolve-catalogs] ${message}\n`);
}

/**
 * Strip a trailing comment and surrounding quotes from a YAML scalar.
 * @param {string} raw
 */
function unquote(raw) {
  const value = raw.replace(/\s+#.*$/u, '').trim();
  const quoted = value.match(/^(?<quote>['"])(?<inner>.*)\k<quote>$/u);
  return quoted?.groups ? quoted.groups.inner : value;
}

/**
 * Parse the `catalog:` and `catalogs:` sections of pnpm-workspace.yaml.
 * Handles the flat key/value mappings pnpm uses for catalogs, which is all
 * this script needs — no YAML dependency is available when run remotely.
 *
 * @param {string} content
 * @returns {Map<string, Set<string>>} catalog name ('' = default) → package names
 */
function parseCatalogs(content) {
  /** @type {Map<string, Set<string>>} */
  const catalogs = new Map();
  /** @type {'catalog' | 'catalogs' | undefined} */
  let section;
  /** @type {number | undefined} */
  let catalogNameIndent;
  /** @type {string | undefined} */
  let currentCatalog;

  for (const line of content.split(/\r?\n/u)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = line.length - line.trimStart().length;
    const entry = line.trim().match(/^(?<key>'[^']+'|"[^"]+"|[^:\s]+):(?<rest>.*)$/u);

    if (indent === 0) {
      const key = entry?.groups?.key;
      section = key === 'catalog' || key === 'catalogs' ? key : undefined;
      catalogNameIndent = undefined;
      currentCatalog = section === 'catalog' ? DEFAULT_CATALOG : undefined;
      continue;
    }

    if (!section || !entry?.groups) continue;

    const key = unquote(entry.groups.key);
    const hasValue = unquote(entry.groups.rest) !== '';

    if (section === 'catalogs') {
      catalogNameIndent ??= indent;

      if (indent === catalogNameIndent) {
        currentCatalog = key;
        if (!catalogs.has(key)) catalogs.set(key, new Set());
        continue;
      }
    }

    if (currentCatalog === undefined || !hasValue) continue;

    if (!catalogs.has(currentCatalog)) catalogs.set(currentCatalog, new Set());
    catalogs.get(currentCatalog).add(key);
  }

  return catalogs;
}

/**
 * @param {Map<string, Set<string>>} catalogs
 * @param {string} dependency
 * @param {string} requested
 * @returns {string} the new specifier
 */
function resolveSpecifier(catalogs, dependency, requested) {
  if (catalogs.get(requested)?.has(dependency)) {
    return `${CATALOG_PREFIX}${requested}`;
  }

  if (catalogs.get(DEFAULT_CATALOG)?.has(dependency)) {
    return CATALOG_PREFIX;
  }

  for (const [name, packages] of catalogs) {
    if (packages.has(dependency)) return `${CATALOG_PREFIX}${name}`;
  }

  return '*';
}

const file = getArg('--file=');
const workspaceFile =
  getArg('--workspace-file=') ?? path.join(process.cwd(), 'pnpm-workspace.yaml');

if (!file) {
  console.error('Missing --file argument');
  process.exit(1);
}

if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

if (!fs.existsSync(workspaceFile)) {
  log(`${workspaceFile} not found — leaving catalog references unchanged`);
  process.exit(0);
}

const catalogs = parseCatalogs(fs.readFileSync(workspaceFile, 'utf8'));

if (catalogs.size === 0) {
  log('no catalogs defined — leaving catalog references unchanged');
  process.exit(0);
}

/** @type {Record<string, unknown>} */
let pkg;

try {
  pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`Failed to parse ${file}: ${err.message}`);
  process.exit(1);
}

let changed = false;

for (const field of DEPENDENCY_FIELDS) {
  const deps = pkg[field];
  if (!deps || typeof deps !== 'object') continue;

  for (const [dependency, specifier] of Object.entries(deps)) {
    if (typeof specifier !== 'string' || !specifier.startsWith(CATALOG_PREFIX)) {
      continue;
    }

    const requested = specifier.slice(CATALOG_PREFIX.length);
    const resolved = resolveSpecifier(catalogs, dependency, requested);

    if (resolved === specifier) continue;

    log(`${dependency}: ${specifier} → ${resolved}`);
    deps[dependency] = resolved;
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(file, JSON.stringify(pkg, null, INDENT_SPACES));
}
