import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

interface RegexReplaceTask {
  id: string;
  type: string;
  config: { file: string; pattern: string; flags?: string; replacement: string };
}

const configPath = path.join(
  __dirname,
  '..',
  'pixpilot-changesets-release',
  'scaffoldfy.json',
);

// Mirrors .github/workflows/ci.yml in pnpm-turbo-monorepo-template and ts-npm-package-template.
const templateCi = `name: CI

on:
  push:
    branches:
      - main
  workflow_call:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup project
        uses: pixpilot/github-actions/setup-pnpm-project@v1

      - name: Lint
        run: pnpm lint
`;

function applyCiTasks(content: string): string {
  const { tasks } = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as {
    tasks: RegexReplaceTask[];
  };
  return tasks
    .filter((task) => task.config.file === '.github/workflows/ci.yml')
    .reduce(
      (result, task) =>
        result.replace(
          new RegExp(task.config.pattern, task.config.flags ?? ''),
          task.config.replacement,
        ),
      content,
    );
}

describe('pixpilot-changesets-release', () => {
  it('should declare the registry token passed by release-github-packages.yml in ci.yml', () => {
    const releaseWorkflow = fs.readFileSync(
      path.join(path.dirname(configPath), 'release-github-packages.yml'),
      'utf-8',
    );
    expect(releaseWorkflow).toMatch(
      /PIXPILOT_PRIVATE_REGISTRY_TOKEN: \$\{\{ secrets\.PIXPILOT_PRIVATE_REGISTRY_TOKEN \}\}/u,
    );

    expect(applyCiTasks(templateCi)).toBe(`name: CI

on:
  push:
    branches:
      - main
  workflow_call:
    # Declared so release.yml can pass it; called workflows get no secrets otherwise.
    secrets:
      PIXPILOT_PRIVATE_REGISTRY_TOKEN:
        required: false

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup project
        uses: pixpilot/github-actions/setup-pnpm-project@v1
        env:
          # Read by setup-node's .npmrc to install @pixpilot-private dependencies.
          NODE_AUTH_TOKEN: \${{ secrets.PIXPILOT_PRIVATE_REGISTRY_TOKEN }}
        with:
          registry-url: 'https://npm.pkg.github.com'
          # Only route @pixpilot-private to GitHub Packages; @pixpilot stays on npmjs.
          scope: '@pixpilot-private'

      - name: Lint
        run: pnpm lint
`);
  });
});
