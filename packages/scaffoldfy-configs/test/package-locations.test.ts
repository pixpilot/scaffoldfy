import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const scripts = path.join(__dirname, '..', 'workspace-package-generator', 'scripts');

describe('workspace package locations', () => {
  it('finds eligible flat and grouped locations and excludes existing or forbidden destinations', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffoldfy-locations-'));
    try {
      fs.writeFileSync(path.join(root, 'package.json'), '{"private":true}');
      fs.writeFileSync(
        path.join(root, 'pnpm-workspace.yaml'),
        "packages:\n  - '*'\n  - 'packages/*/*'\n  - 'tooling/*'\n  - '!packages/private/**'\n",
      );
      for (const dir of [
        'packages/core/existing',
        'packages/features',
        'packages/private',
        'packages/platform',
        'tooling',
      ]) {
        fs.mkdirSync(path.join(root, dir), { recursive: true });
      }
      fs.writeFileSync(
        path.join(root, 'packages/core/existing/package.json'),
        '{"name":"existing"}',
      );
      fs.mkdirSync(path.join(root, 'packages/features/new-package'));
      const output = execFileSync(
        process.execPath,
        [path.join(scripts, 'find-package-locations.cjs')],
        {
          cwd: root,
          encoding: 'utf8',
          env: { ...process.env, SCAFFOLDFY_PACKAGE_NAME: 'new-package' },
        },
      );
      expect(JSON.parse(output)).toEqual([
        { name: '.', value: '.' },
        { name: 'packages/core', value: 'packages/core' },
        { name: 'packages/platform', value: 'packages/platform' },
        { name: 'tooling', value: 'tooling' },
      ]);
      const relative = execFileSync(
        process.execPath,
        [path.join(scripts, 'relative-root-path.cjs')],
        {
          cwd: root,
          encoding: 'utf8',
          env: { ...process.env, SCAFFOLDFY_WORKSPACE: 'packages/core' },
        },
      );
      expect(relative).toBe('../../../');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
