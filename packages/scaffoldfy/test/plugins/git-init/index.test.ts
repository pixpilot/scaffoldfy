/**
 * Tests for git-init plugin index
 */

import { describe, expect, it } from 'vitest';
import { gitInitPlugin } from '../../../src/plugins/git-init';

describe('git-init plugin index', () => {
  it('should export gitInitPlugin', () => {
    expect(gitInitPlugin).toBeDefined();
    expect(gitInitPlugin.name).toBe('git-init');
  });

  it('should skip execution in dry run mode', async () => {
    const task = {
      id: 'test-git-init',
      name: 'Test Git Init',
      type: 'git-init' as const,
      config: { removeExisting: true, initialCommit: true },
    };

    const config = {};
    const options = { dryRun: true };

    // Should not throw and should return without executing
    await expect(gitInitPlugin.execute(task, config, options)).resolves.toBeUndefined();
  });
});
