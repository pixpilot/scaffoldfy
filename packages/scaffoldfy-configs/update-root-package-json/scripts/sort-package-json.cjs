#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const process = require('node:process');

const INDENT_SPACES = 2;
const ROOT_PACKAGE_JSON_KEY_ORDER = [
  'name',
  'private',
  'packageManager',
  'prettier',
  'author',
  'license',
  'homepage',
  'repository',
  'bugs',
  'engines',
  'scripts',
  'devDependencies',
];

/** @param {string} prefix */
function getArg(prefix) {
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg?.slice(prefix.length);
}

const file = getArg('--file=');

if (!file) {
  console.error('Missing --file argument');
  process.exit(1);
}

let packageJson;

try {
  packageJson = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (error) {
  console.error(`Failed to read package.json: ${error.message}`);
  process.exit(1);
}

const orderedPackageJson = {};

for (const key of ROOT_PACKAGE_JSON_KEY_ORDER) {
  if (key in packageJson) {
    orderedPackageJson[key] = packageJson[key];
  }
}

for (const [key, value] of Object.entries(packageJson)) {
  if (!(key in orderedPackageJson)) {
    orderedPackageJson[key] = value;
  }
}

fs.writeFileSync(file, `${JSON.stringify(orderedPackageJson, null, INDENT_SPACES)}\n`);
