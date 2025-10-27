/**
 * Tests for write plugin index
 */

import { describe, expect, it } from 'vitest';
import { writePlugin } from '../../../src/plugins/write';

describe('write plugin index', () => {
  it('should export writePlugin', () => {
    expect(writePlugin).toBeDefined();
    expect(writePlugin.name).toBe('write');
  });

  it('should skip execution in dry run mode', async () => {
    const task = {
      id: 'test-write',
      name: 'Test Write',
      type: 'write' as const,
      config: { file: 'test.txt', content: 'test' },
    };

    const config = {};
    const options = { dryRun: true };

    // Should not throw and should return without executing
    await expect(writePlugin.execute(task, config, options)).resolves.toBeUndefined();
  });
});
