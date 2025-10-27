/**
 * Tests for merge task
 */

import { describe, expect, it } from 'vitest';
import { mergeTask } from '../../src/configurations/merge-task';

describe('merge task', () => {
  it('should export mergeTask function', () => {
    expect(mergeTask).toBeDefined();
    expect(typeof mergeTask).toBe('function');
  });
});
