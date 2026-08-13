import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT_PATH = path.join(
  __dirname,
  '..',
  'workspace-generator',
  'scripts',
  'setup-workspace.cjs',
);
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

function createFakeGit(testDirectory: string): string {
  const binDirectory = path.join(testDirectory, 'bin');
  const fakeGitPath = path.join(binDirectory, 'fake-git.cjs');
  const gitCommandPath = path.join(
    binDirectory,
    process.platform === 'win32' ? 'git.exe' : 'git',
  );

  fs.mkdirSync(binDirectory, { recursive: true });
  fs.writeFileSync(
    fakeGitPath,
    [
      "'use strict';",
      "const fs = require('node:fs');",
      "const Module = require('node:module');",
      "const path = require('node:path');",
      'function applyGitOperation(command, args) {',
      "  if (command === 'clone') {",
      '  const destination = args.at(-1);',
      "  if (destination === '.') {",
      "    fs.writeFileSync(path.join(process.cwd(), 'base-template.txt'), 'base');",
      '  } else {',
      '    fs.mkdirSync(destination, { recursive: true });',
      '  }',
      "  } else if (command === 'sparse-checkout') {",
      '  const sourceDirectory = args.at(-1);',
      '  const templateDirectory = path.join(process.cwd(), sourceDirectory);',
      '  fs.mkdirSync(templateDirectory, { recursive: true });',
      "  fs.writeFileSync(path.join(templateDirectory, 'template.txt'), sourceDirectory);",
      '}',
      '}',
      "if (process.env.SCAFFOLDFY_FAKE_GIT_MODE === 'preload') {",
      '  const resolveFilename = Module._resolveFilename;',
      '  Module._resolveFilename = function resolveFakeGit(request, ...args) {',
      '    const command = path.basename(request);',
      "    if (command === 'clone' || command === 'sparse-checkout') {",
      '      applyGitOperation(command, process.argv.slice(2));',
      "      return path.join(__dirname, 'noop.cjs');",
      '    }',
      '    return resolveFilename.call(this, request, ...args);',
      '  };',
      '} else {',
      '  const [command, ...args] = process.argv.slice(2);',
      '  applyGitOperation(command, args);',
      '}',
    ].join('\n'),
  );

  if (process.platform === 'win32') {
    fs.writeFileSync(path.join(binDirectory, 'noop.cjs'), "'use strict';\n");
    fs.copyFileSync(process.execPath, gitCommandPath);
  } else {
    fs.writeFileSync(
      gitCommandPath,
      `#!${process.execPath}\nrequire('./fake-git.cjs');\n`,
    );
    fs.chmodSync(gitCommandPath, 0o755);
  }

  return binDirectory;
}

function runSetup(workspaceApps: string): string {
  const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffoldfy-workspace-'));
  const workspaceDirectory = path.join(testDirectory, 'workspace');
  temporaryDirectories.push(testDirectory);
  fs.mkdirSync(workspaceDirectory);
  const gitBinDirectory = createFakeGit(testDirectory);
  const fakeGitPath = path.join(gitBinDirectory, 'fake-git.cjs');

  execFileSync(process.execPath, [SCRIPT_PATH], {
    cwd: workspaceDirectory,
    stdio: 'pipe',
    env: {
      ...process.env,
      PATH: `${gitBinDirectory}${path.delimiter}${process.env.PATH ?? ''}`,
      ...(process.platform === 'win32' && {
        NODE_OPTIONS: `--require=${fakeGitPath} ${process.env.NODE_OPTIONS ?? ''}`,
        Path: `${gitBinDirectory}${path.delimiter}${process.env.Path ?? ''}`,
        SCAFFOLDFY_FAKE_GIT_MODE: 'preload',
      }),
      WORKSPACE_APPS: workspaceApps,
    },
  });

  return workspaceDirectory;
}

describe('workspace-generator setup script', () => {
  it('should clone the base template when only Library is selected', () => {
    const workspaceDirectory = runSetup('library');

    expect(
      fs.readFileSync(path.join(workspaceDirectory, 'base-template.txt'), 'utf8'),
    ).toBe('base');
    expect(fs.existsSync(path.join(workspaceDirectory, 'apps'))).toBe(false);
  });

  it('should add every selected app to the base workspace', () => {
    const workspaceDirectory = runSetup(
      'library,nextjs-cloudflare,chrome-extension,expo',
    );

    expect(
      fs.readFileSync(path.join(workspaceDirectory, 'base-template.txt'), 'utf8'),
    ).toBe('base');
    expect(
      fs.readFileSync(
        path.join(workspaceDirectory, 'apps', 'web', 'template.txt'),
        'utf8',
      ),
    ).toBe('apps/web');
    expect(
      fs.readFileSync(
        path.join(workspaceDirectory, 'apps', 'chrome-extension', 'template.txt'),
        'utf8',
      ),
    ).toBe('apps/chrome-extension');
    expect(
      fs.readFileSync(
        path.join(workspaceDirectory, 'apps', 'expo', 'template.txt'),
        'utf8',
      ),
    ).toBe('apps/expo');
  });

  it('should fail when no workspace app is selected', () => {
    expect(() => runSetup('')).toThrow('Select at least one workspace app.');
  });
});
