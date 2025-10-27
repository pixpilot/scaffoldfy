/**
 * Tests for merge config
 */

import { describe, expect, it } from 'vitest';
import { mergeConfig } from '../../src/configurations/merge-config';

describe('merge config', () => {
  it('should export mergeConfig function', () => {
    expect(mergeConfig).toBeDefined();
    expect(typeof mergeConfig).toBe('function');
  });
});
