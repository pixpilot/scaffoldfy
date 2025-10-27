/**
 * Tests for delete plugin index
 */

import { describe, expect, it } from 'vitest';
import { deletePlugin } from '../../../src/plugins/delete';

describe('delete plugin index', () => {
  it('should export deletePlugin', () => {
    expect(deletePlugin).toBeDefined();
    expect(deletePlugin.name).toBe('delete');
  });

  it('should skip execution in dry run mode', async () => {
    const task = {
      id: 'test-delete',
      name: 'Test Delete',
      type: 'delete' as const,
      config: { paths: ['test.txt'] },
    };

    const config = {};
    const options = { dryRun: true };

    // Should not throw and should return without executing
    await expect(deletePlugin.execute(task, config, options)).resolves.toBeUndefined();
  });
});
