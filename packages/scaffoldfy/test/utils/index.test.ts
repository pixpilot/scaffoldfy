/**
 * Tests for utils index
 */

import { describe, expect, it } from 'vitest';
import * as utils from '../../src/utils';

describe('utils index', () => {
  it('should export functions', () => {
    expect(utils.evaluateCondition).toBeDefined();
    expect(typeof utils.evaluateCondition).toBe('function');
  });
});
