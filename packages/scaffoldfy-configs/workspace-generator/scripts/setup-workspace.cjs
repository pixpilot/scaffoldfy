#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const process = require('node:process');

const BASE_TEMPLATE_REPOSITORY =
  'https://github.com/pixpilot/pnpm-turbo-monorepo-template.git';

const APP_TEMPLATES = {
  'nextjs-cloudflare': {
    repository: 'https://github.com/ccpu/nextjs-cloudflare-monorepo-template.git',
    sourceDirectory: 'apps/web',
    destinationDirectory: 'apps/web',
  },
  'chrome-extension': {
    repository: 'https://github.com/ccpu/chrome-extension-monorepo-template.git',
    sourceDirectory: 'apps/chrome-extension',
    destinationDirectory: 'apps/chrome-extension',
  },
  expo: {
    repository: 'https://github.com/ccpu/full-stack-starter.git',
    sourceDirectory: 'apps/expo',
    destinationDirectory: 'apps/expo',
  },
};

function runGit(args, cwd) {
  execFileSync('git', args, { cwd, stdio: 'inherit' });
}

function getSelectedApps() {
  return new Set(
    (process.env.WORKSPACE_APPS ?? '')
      .split(',')
      .map((app) => app.trim())
      .filter(Boolean),
  );
}

function ensureEmptyDirectory(directory) {
  if (fs.readdirSync(directory).length > 0) {
    throw new Error(`Workspace directory must be empty: ${directory}`);
  }
}

function copyDirectoryContents(sourceDirectory, destinationDirectory) {
  for (const entry of fs.readdirSync(sourceDirectory, { withFileTypes: true })) {
    fs.cpSync(
      path.join(sourceDirectory, entry.name),
      path.join(destinationDirectory, entry.name),
      { recursive: entry.isDirectory(), errorOnExist: true, force: false },
    );
  }
}

function addAppTemplate(template, workspaceDirectory) {
  const destinationDirectory = path.join(
    workspaceDirectory,
    template.destinationDirectory,
  );
  fs.mkdirSync(destinationDirectory, { recursive: true });

  if (fs.readdirSync(destinationDirectory).length > 0) {
    throw new Error(`App destination already exists: ${destinationDirectory}`);
  }

  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffoldfy-app-'));
  const repositoryDirectory = path.join(temporaryDirectory, 'repository');

  try {
    runGit(
      [
        'clone',
        '--depth',
        '1',
        '--filter=blob:none',
        '--sparse',
        template.repository,
        repositoryDirectory,
      ],
      workspaceDirectory,
    );
    runGit(['sparse-checkout', 'set', template.sourceDirectory], repositoryDirectory);

    const sourceDirectory = path.join(repositoryDirectory, template.sourceDirectory);
    if (!fs.existsSync(sourceDirectory)) {
      throw new Error(
        `Template directory "${template.sourceDirectory}" was not found in ${template.repository}`,
      );
    }

    copyDirectoryContents(sourceDirectory, destinationDirectory);
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function main() {
  const workspaceDirectory = process.cwd();
  const selectedApps = getSelectedApps();

  if (selectedApps.size === 0) {
    throw new Error('Select at least one workspace app.');
  }

  ensureEmptyDirectory(workspaceDirectory);
  runGit(['clone', '--depth', '1', BASE_TEMPLATE_REPOSITORY, '.'], workspaceDirectory);

  for (const app of selectedApps) {
    const template = APP_TEMPLATES[app];
    if (template) {
      addAppTemplate(template, workspaceDirectory);
    }
  }
}

main();
