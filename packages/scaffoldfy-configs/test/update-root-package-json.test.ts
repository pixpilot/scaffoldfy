import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = path.join(
  __dirname,
  '..',
  'update-root-package-json',
  'scripts',
  'sort-package-json.cjs',
);
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

describe('sort-package-json', () => {
  it('should place root package.json fields in the configured order', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffoldfy-configs-'));
    temporaryDirectories.push(directory);
    const packageJsonPath = path.join(directory, 'package.json');

    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify({
        scripts: {},
        engines: { node: '>=24.15.0', pnpm: '>=9.6.0' },
        custom: true,
        private: true,
        name: 'pnpm-turbo-monorepo-template',
        devDependencies: {},
        repository: {
          type: 'git',
          url: 'https://github.com/pixpilot/pnpm-turbo-monorepo-template.git',
        },
        packageManager: 'pnpm@10.33.4',
        prettier: '@internal/prettier-config',
        author: 'Mo Doaie <m.doaie@hotmail.com>',
        license: 'NONE',
        homepage: 'https://github.com/pixpilot/pnpm-turbo-monorepo-template',
        bugs: { url: 'https://github.com/pixpilot/pnpm-turbo-monorepo-template/issues' },
      }),
    );

    execFileSync(process.execPath, [scriptPath, `--file=${packageJsonPath}`]);

    expect(Object.keys(JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')))).toEqual([
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
      'custom',
    ]);
  });
});
