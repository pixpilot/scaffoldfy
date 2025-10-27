/**
 * Tests for merge prompt
 */

import { describe, expect, it } from 'vitest';
import { mergePrompt } from '../../src/configurations/merge-prompt';

describe('merge prompt', () => {
  it('should export mergePrompt function', () => {
    expect(mergePrompt).toBeDefined();
    expect(typeof mergePrompt).toBe('function');
  });
});
