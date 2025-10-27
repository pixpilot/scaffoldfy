/**
 * Tests for exec plugin index
 */

import { describe, expect, it } from 'vitest';
import { execPlugin } from '../../../src/plugins/exec';

describe('exec plugin index', () => {
  it('should export execPlugin', () => {
    expect(execPlugin).toBeDefined();
    expect(execPlugin.name).toBe('exec');
  });

  it('should skip execution in dry run mode', async () => {
    const task = {
      id: 'test-exec',
      name: 'Test Exec',
      type: 'exec' as const,
      config: { command: 'echo test' },
    };

    const config = {};
    const options = { dryRun: true };

    // Should not throw and should return without executing
    await expect(execPlugin.execute(task, config, options)).resolves.toBeUndefined();
  });
});
