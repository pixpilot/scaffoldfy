/**
 * Tests for create plugin index
 */

import { describe, expect, it } from 'vitest';
import { createPlugin } from '../../../src/plugins/create';

describe('create plugin index', () => {
  it('should export createPlugin', () => {
    expect(createPlugin).toBeDefined();
    expect(createPlugin.name).toBe('create');
  });

  it('should skip execution in dry run mode', async () => {
    const task = {
      id: 'test-create',
      name: 'Test Create',
      type: 'create' as const,
      config: { file: 'test.txt' },
    };

    const config = {};
    const options = { dryRun: true };

    // Should not throw and should return without executing
    await expect(createPlugin.execute(task, config, options)).resolves.toBeUndefined();
  });
});
