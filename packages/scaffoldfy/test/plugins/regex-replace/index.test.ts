/**
 * Tests for regex-replace plugin index
 */

import { describe, expect, it } from 'vitest';
import { regexReplacePlugin } from '../../../src/plugins/regex-replace';

describe('regex-replace plugin index', () => {
  it('should export regexReplacePlugin', () => {
    expect(regexReplacePlugin).toBeDefined();
    expect(regexReplacePlugin.name).toBe('regex-replace');
  });

  it('should skip execution in dry run mode', async () => {
    const task = {
      id: 'test-regex-replace',
      name: 'Test Regex Replace',
      type: 'regex-replace' as const,
      config: { file: 'test.txt', pattern: 'old', replacement: 'new' },
    };

    const config = {};
    const options = { dryRun: true };

    // Should not throw and should return without executing
    await expect(
      regexReplacePlugin.execute(task, config, options),
    ).resolves.toBeUndefined();
  });
});
