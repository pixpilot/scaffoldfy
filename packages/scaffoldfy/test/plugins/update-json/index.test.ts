/**
 * Tests for update-json plugin index
 */

import { describe, expect, it } from 'vitest';
import { updateJsonPlugin } from '../../../src/plugins/update-json';

describe('update-json plugin index', () => {
  it('should export updateJsonPlugin', () => {
    expect(updateJsonPlugin).toBeDefined();
    expect(updateJsonPlugin.name).toBe('update-json');
  });

  it('should skip execution in dry run mode', async () => {
    const task = {
      id: 'test-update-json',
      name: 'Test Update JSON',
      type: 'update-json' as const,
      config: { file: 'test.json', updates: [] },
    };

    const config = {};
    const options = { dryRun: true };

    // Should not throw and should return without executing
    await expect(
      updateJsonPlugin.execute(task, config, options),
    ).resolves.toBeUndefined();
  });
});
