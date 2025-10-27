/**
 * Tests for append plugin index
 */

import { describe, expect, it } from 'vitest';
import { appendPlugin } from '../../../src/plugins/append';

describe('append plugin index', () => {
  it('should export appendPlugin', () => {
    expect(appendPlugin).toBeDefined();
    expect(appendPlugin.name).toBe('append');
  });

  it('should skip execution in dry run mode', async () => {
    const task = {
      id: 'test-append',
      name: 'Test Append',
      type: 'append' as const,
      config: { file: 'test.txt', content: 'test' },
    };

    const config = {};
    const options = { dryRun: true };

    // Should not throw and should return without executing
    await expect(appendPlugin.execute(task, config, options)).resolves.toBeUndefined();
  });
});
