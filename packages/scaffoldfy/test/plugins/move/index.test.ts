/**
 * Tests for move plugin index
 */

import { describe, expect, it } from 'vitest';
import { movePlugin } from '../../../src/plugins/move';

describe('move plugin index', () => {
  it('should export movePlugin', () => {
    expect(movePlugin).toBeDefined();
    expect(movePlugin.name).toBe('move');
  });

  it('should skip execution in dry run mode', async () => {
    const task = {
      id: 'test-move',
      name: 'Test Move',
      type: 'move' as const,
      config: { from: 'source.txt', to: 'dest.txt' },
    };

    const config = {};
    const options = { dryRun: true };

    // Should not throw and should return without executing
    await expect(movePlugin.execute(task, config, options)).resolves.toBeUndefined();
  });
});
