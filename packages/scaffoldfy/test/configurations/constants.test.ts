/**
 * Tests for configuration constants
 */

import { describe, expect, it } from 'vitest';
import { CONFLICTING_FIELDS } from '../../src/configurations/constants';

describe('configuration constants', () => {
  it('should export CONFLICTING_FIELDS', () => {
    expect(CONFLICTING_FIELDS).toBeDefined();
    expect(typeof CONFLICTING_FIELDS).toBe('object');
  });
});
