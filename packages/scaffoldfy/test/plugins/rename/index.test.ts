/**
 * Tests for rename plugin index
 */

import { describe, expect, it } from 'vitest';
import { renamePlugin } from '../../../src/plugins/rename';

describe('rename plugin index', () => {
  it('should export renamePlugin', () => {
    expect(renamePlugin).toBeDefined();
    expect(renamePlugin.name).toBe('rename');
  });

  it('should skip execution in dry run mode', async () => {
    const task = {
      id: 'test-rename',
      name: 'Test Rename',
      type: 'rename' as const,
      config: { from: 'old.txt', to: 'new.txt' },
    };

    const config = {};
    const options = { dryRun: true };

    // Should not throw and should return without executing
    await expect(renamePlugin.execute(task, config, options)).resolves.toBeUndefined();
  });
});
