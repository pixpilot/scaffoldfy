/**
 * Tests for errors index
 */

import { describe, expect, it } from 'vitest';
import * as errors from '../../src/errors';

describe('errors index', () => {
  it('should export error classes', () => {
    expect(errors.ScaffoldfyError).toBeDefined();
    expect(typeof errors.ScaffoldfyError).toBe('function');
  });
});
