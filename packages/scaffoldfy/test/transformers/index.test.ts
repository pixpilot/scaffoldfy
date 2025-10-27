/**
 * Tests for transformers index
 */

import { describe, expect, it } from 'vitest';
import * as transformers from '../../src/transformers';

describe('transformers index', () => {
  it('should export functions', () => {
    expect(transformers.TransformerManager).toBeDefined();
    expect(typeof transformers.TransformerManager).toBe('function');
  });
});
