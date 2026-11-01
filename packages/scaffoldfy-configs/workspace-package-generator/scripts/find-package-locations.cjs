'use strict';

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');

const root = process.cwd();
const name = process.env.SCAFFOLDFY_PACKAGE_NAME;
if (!name || !/^[a-z0-9][a-z0-9-]*$/u.test(name)) {
  throw new Error(
    'The package name must contain only lowercase letters, numbers, and hyphens',
  );
}
if (!fs.existsSync(path.join(root, 'pnpm-workspace.yaml'))) {
  throw new Error('Run the generator from the pnpm workspace root');
}

const patterns = JSON.parse(
  execSync('pnpm config get packages --json', { encoding: 'utf8' }),
);
if (
  !Array.isArray(patterns) ||
  !patterns.every((pattern) => typeof pattern === 'string')
) {
  throw new Error('Could not read the workspace package patterns');
}
const includes = patterns.filter((pattern) => !pattern.startsWith('!'));
const excludes = patterns
  .filter((pattern) => pattern.startsWith('!'))
  .map((pattern) => pattern.slice(1));
const locations = new Set();

function isExcluded(relative) {
  const parts = relative.split('/');
  return parts.some((_, index) =>
    excludes.some((pattern) =>
      path.matchesGlob(parts.slice(0, index + 1).join('/'), pattern),
    ),
  );
}

function visit(directory) {
  const relative = path.relative(root, directory).split(path.sep).join('/');
  if (
    relative &&
    (isExcluded(relative) || fs.existsSync(path.join(directory, 'package.json')))
  )
    return;
  const target = relative ? `${relative}/${name}` : name;
  if (
    !fs.existsSync(path.join(directory, name)) &&
    !isExcluded(target) &&
    includes.some((pattern) => path.matchesGlob(target, pattern))
  ) {
    locations.add(relative || '.');
  }
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      /^[\w-][\w.-]*$/u.test(entry.name) &&
      entry.name !== 'node_modules'
    ) {
      visit(path.join(directory, entry.name));
    }
  }
}

for (const pattern of includes) {
  const parts = pattern.split('/');
  const dynamicIndex = parts.findIndex((segment) => /[*?{}()[\]!]/u.test(segment));
  const prefix = parts.slice(0, dynamicIndex < 0 ? parts.length : dynamicIndex).join('/');
  const directory = path.resolve(root, prefix || '.');
  const relative = path.relative(root, directory);
  const realRelative = fs.existsSync(directory)
    ? path.relative(fs.realpathSync(root), fs.realpathSync(directory))
    : '..';
  if (
    !relative.startsWith('..') &&
    !path.isAbsolute(relative) &&
    fs.existsSync(directory) &&
    fs.statSync(directory).isDirectory() &&
    !realRelative.startsWith('..') &&
    !path.isAbsolute(realRelative) &&
    (!relative || relative.split(path.sep).every((part) => /^[\w-][\w.-]*$/u.test(part)))
  ) {
    visit(directory);
  }
}
if (locations.size === 0) {
  throw new Error(
    'No eligible package locations found. Create a matching group directory or choose a different package name.',
  );
}
process.stdout.write(
  JSON.stringify([...locations].sort().map((value) => ({ name: value, value }))),
);
