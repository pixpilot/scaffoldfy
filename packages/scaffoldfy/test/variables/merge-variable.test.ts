/**
 * Tests for variables merge variable
 */

import { describe, expect, it } from 'vitest';
import { mergeVariable } from '../../src/variables/merge-variable';

describe('variables merge variable', () => {
  it('should export mergeVariable function', () => {
    expect(mergeVariable).toBeDefined();
    expect(typeof mergeVariable).toBe('function');
  });
});
