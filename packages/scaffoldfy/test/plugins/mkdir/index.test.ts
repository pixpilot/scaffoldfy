/**
 * Tests for mkdir plugin index
 */

import { describe, expect, it } from 'vitest';
import { mkdirPlugin } from '../../../src/plugins/mkdir';

describe('mkdir plugin index', () => {
  it('should export mkdirPlugin', () => {
    expect(mkdirPlugin).toBeDefined();
    expect(mkdirPlugin.name).toBe('mkdir');
  });

  it('should skip execution in dry run mode', async () => {
    const task = {
      id: 'test-mkdir',
      name: 'Test Mkdir',
      type: 'mkdir' as const,
      config: { path: 'test-dir' },
    };

    const config = {};
    const options = { dryRun: true };

    // Should not throw and should return without executing
    await expect(mkdirPlugin.execute(task, config, options)).resolves.toBeUndefined();
  });
});
