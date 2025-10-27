/**
 * Tests for exec-file plugin index
 */

import { describe, expect, it } from 'vitest';
import { execFilePlugin } from '../../../src/plugins/exec-file';

describe('exec-file plugin index', () => {
  it('should export execFilePlugin', () => {
    expect(execFilePlugin).toBeDefined();
    expect(execFilePlugin.name).toBe('exec-file');
  });
});
