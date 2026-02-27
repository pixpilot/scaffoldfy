#!/usr/bin/env node
/* eslint-disable prefer-named-capture-group */
/* eslint-disable regexp/no-super-linear-backtracking */
/* eslint-disable no-continue */
/* eslint-disable node/prefer-global/process */
/**
 * Checks whether a workspace package named @internal/tsdown-config exists.
 *
 * Strategy (tried in order):
 *  1. Scan workspace packages declared in pnpm-workspace.yaml — the most
 *     reliable approach for pnpm monorepos where private packages are NOT
 *     hoisted to the root node_modules.
 *  2. Fall back to checking common node_modules locations (covers npm/yarn
 *     workspaces and any hoisting configurations that do hoist the package).
 *
 * Outputs "true" or "false" to stdout.
 * Debug output is written to stderr so it never pollutes the captured stdout
 * that the scaffoldfy framework parses.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const TARGET_PACKAGE = '@internal/tsdown-config';
const cwd = process.cwd();

/**
 * Scan workspace package directories listed in pnpm-workspace.yaml and return
 * true if any package.json has `name === TARGET_PACKAGE`.
 *
 * Only looks one level deep inside each workspace glob base directory
 * (e.g. "packages/**" → scans packages/<*>/package.json).
 * This is sufficient for the flat monorepo layouts this config targets.
 *
 * @returns {boolean}
 */
function findInWorkspacePackages() {
  const workspaceYamlPath = path.join(cwd, 'pnpm-workspace.yaml');

  if (!fs.existsSync(workspaceYamlPath)) {
    process.stderr.write('[check-tsdown-config] pnpm-workspace.yaml not found\n');
    return false;
  }

  const content = fs.readFileSync(workspaceYamlPath, 'utf8');

  /*
   * Extract lines under the `packages:` key.
   * Handles a simple YAML list of strings — sufficient for pnpm-workspace.yaml.
   */
  const packagesBlockMatch = content.match(/^packages:\s*\n((?:\s+-\s+\S.*\n?)*)/mu);

  if (!packagesBlockMatch) {
    process.stderr.write(
      '[check-tsdown-config] no packages list in pnpm-workspace.yaml\n',
    );
    return false;
  }

  const patterns = packagesBlockMatch[1]
    .split('\n')
    .map((line) => line.trim().replace(/^-\s*['"]?(?<temp1>.+?)['"]?\s*$/u, '$1'))
    .filter(Boolean);

  process.stderr.write(
    `[check-tsdown-config] workspace patterns: ${JSON.stringify(patterns)}\n`,
  );

  for (const pattern of patterns) {
    /* Skip exclusion patterns. */
    if (pattern.startsWith('!')) continue;

    /*
     * Derive the base directory from the pattern.
     * "packages/**" → "packages", "tooling/**" → "tooling"
     */
    const baseDir = pattern.split('/')[0];
    const basePath = path.join(cwd, baseDir);

    if (!fs.existsSync(basePath)) continue;

    let entries;

    try {
      entries = fs.readdirSync(basePath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const pkgJsonPath = path.join(basePath, entry.name, 'package.json');

      if (!fs.existsSync(pkgJsonPath)) continue;

      try {
        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

        if (pkg.name === TARGET_PACKAGE) {
          process.stderr.write(
            `[check-tsdown-config] found ${TARGET_PACKAGE} at ${pkgJsonPath}\n`,
          );
          return true;
        }
      } catch {
        /* Ignore malformed package.json files. */
      }
    }
  }

  return false;
}

/*
 * Fallback: check common node_modules locations.
 * Covers npm/yarn workspaces and pnpm configs that do hoist private packages.
 */
const nodeModulesLocations = [
  path.join(cwd, 'node_modules', '@internal', 'tsdown-config'),
  path.join(cwd, '..', 'node_modules', '@internal', 'tsdown-config'),
  path.join(cwd, '..', '..', 'node_modules', '@internal', 'tsdown-config'),
];

const existsInNodeModules = nodeModulesLocations.some((loc) => {
  const found = fs.existsSync(loc);

  if (found) {
    process.stderr.write(
      `[check-tsdown-config] found ${TARGET_PACKAGE} in node_modules: ${loc}\n`,
    );
  }

  return found;
});

const exists = existsInNodeModules || findInWorkspacePackages();

process.stderr.write(`[check-tsdown-config] result: ${exists}\n`);

process.stdout.write(exists ? 'true' : 'false');
