/**
 * Tests for replace-in-file plugin index
 */

import { describe, expect, it } from 'vitest';
import { replaceInFilePlugin } from '../../../src/plugins/replace-in-file';

describe('replace-in-file plugin index', () => {
  it('should export replaceInFilePlugin', () => {
    expect(replaceInFilePlugin).toBeDefined();
    expect(replaceInFilePlugin.name).toBe('replace-in-file');
  });

  it('should skip execution in dry run mode', async () => {
    const task = {
      id: 'test-replace-in-file',
      name: 'Test Replace In File',
      type: 'replace-in-file' as const,
      config: { file: 'test.txt', replacements: [] },
    };

    const config = {};
    const options = { dryRun: true };

    // Should not throw and should return without executing
    await expect(
      replaceInFilePlugin.execute(task, config, options),
    ).resolves.toBeUndefined();
  });
});
