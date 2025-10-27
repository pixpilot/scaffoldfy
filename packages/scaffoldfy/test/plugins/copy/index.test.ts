/**
 * Tests for copy plugin index
 */

import { describe, expect, it } from 'vitest';
import { copyPlugin } from '../../../src/plugins/copy';

describe('copy plugin index', () => {
  it('should export copyPlugin', () => {
    expect(copyPlugin).toBeDefined();
    expect(copyPlugin.name).toBe('copy');
  });

  it('should skip execution in dry run mode', async () => {
    const task = {
      id: 'test-copy',
      name: 'Test Copy',
      type: 'copy' as const,
      config: { from: 'source.txt', to: 'dest.txt' },
    };

    const config = {};
    const options = { dryRun: true };

    // Should not throw and should return without executing
    await expect(copyPlugin.execute(task, config, options)).resolves.toBeUndefined();
  });
});
