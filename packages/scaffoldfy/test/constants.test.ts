/**
 * Tests for constants
 */

import { describe, expect, it } from 'vitest';
import { EXIT_CODE_ERROR, EXIT_CODE_SUCCESS } from '../src/constants';

describe('constants', () => {
  it('should export constants', () => {
    expect(EXIT_CODE_ERROR).toBe(1);
    expect(EXIT_CODE_SUCCESS).toBe(0);
  });
});
