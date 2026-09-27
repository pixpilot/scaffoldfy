import path from 'node:path';
import {
  loadTasksWithInheritance,
  resolveConfigAnswers,
  validateScaffoldfyJsonFile,
} from '@pixpilot/scaffoldfy';
import { describe, expect, it } from 'vitest';

// The repo's own package generator (`pnpm gen:package`), which answers the prompts of
// workspace-package-generator in its `answers` field
const generatorPath = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'generators',
  'package',
  'scaffoldfy.jsonc',
);

describe('package generator answers', () => {
  it('should be a valid config', () => {
    expect(validateScaffoldfyJsonFile(generatorPath).valid).toBe(true);
  });

  it('should answer existing workspace-package-generator prompts', async () => {
    const { configs = [] } = await loadTasksWithInheritance(generatorPath, {
      sequential: true,
    });

    expect(resolveConfigAnswers(configs)).toEqual({
      workspace: 'packages',
      bundler: 'tsdown',
      author: 'PixPilot',
      authorEmail: 'm.doaie@hotmail.com',
      repoOwner: 'pixpilot',
      orgName: 'pixpilot',
      licenseType: 'MIT',
    });
  });
});
