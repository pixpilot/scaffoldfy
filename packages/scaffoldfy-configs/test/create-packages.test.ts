import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT_PATH = path.join(
  __dirname,
  '..',
  'workspace-initializer',
  'scripts',
  'create-packages.cjs',
);
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

/**
 * Put a fake `pnpm` on PATH that appends its arguments to a log file
 */
function createFakePnpm(): { binDirectory: string; logPath: string } {
  const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'create-packages-'));
  temporaryDirectories.push(testDirectory);

  const binDirectory = path.join(testDirectory, 'bin');
  const logPath = path.join(testDirectory, 'calls.log');
  const fakePnpmScript = path.join(binDirectory, 'fake-pnpm.cjs');
  fs.mkdirSync(binDirectory, { recursive: true });
  fs.writeFileSync(
    fakePnpmScript,
    `require('node:fs').appendFileSync(${JSON.stringify(logPath)}, process.argv.slice(2).join(' ') + '\\n');`,
  );

  if (process.platform === 'win32') {
    fs.writeFileSync(
      path.join(binDirectory, 'pnpm.cmd'),
      `@"${process.execPath}" "${fakePnpmScript}" %*\r\n`,
    );
  } else {
    const pnpmPath = path.join(binDirectory, 'pnpm');
    fs.writeFileSync(
      pnpmPath,
      `#!/bin/sh\n"${process.execPath}" "${fakePnpmScript}" "$@"\n`,
    );
    fs.chmodSync(pnpmPath, 0o755);
  }

  return { binDirectory, logPath };
}

function runScript(packageNames: string, binDirectory: string) {
  const pathKey =
    Object.keys(process.env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
  return spawnSync(process.execPath, [SCRIPT_PATH], {
    encoding: 'utf8',
    env: {
      ...process.env,
      [pathKey]: `${binDirectory}${path.delimiter}${process.env[pathKey] ?? ''}`,
      PACKAGE_NAMES: packageNames,
    },
  });
}

describe('workspace-initializer create-packages script', () => {
  it('runs the package generator once per comma separated name', () => {
    const { binDirectory, logPath } = createFakePnpm();

    const result = runScript(' pkg-a, pkg-b ,,@scope/pkg-c ', binDirectory);

    expect(result.status).toBe(0);
    expect(fs.readFileSync(logPath, 'utf8').trim().split(/\r?\n/u)).toEqual([
      'run gen:package --set packageBaseName=pkg-a',
      'run gen:package --set packageBaseName=pkg-b',
      'run gen:package --set packageBaseName=@scope/pkg-c',
    ]);
  });

  it('skips when no names are given', () => {
    const { binDirectory, logPath } = createFakePnpm();

    const result = runScript(' , ', binDirectory);

    expect(result.status).toBe(0);
    expect(fs.existsSync(logPath)).toBe(false);
  });

  it('rejects names with shell characters', () => {
    const { binDirectory, logPath } = createFakePnpm();

    const result = runScript('pkg-a, bad;rm -rf', binDirectory);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Invalid package name(s): bad;rm -rf');
    expect(fs.existsSync(logPath)).toBe(false);
  });
});
