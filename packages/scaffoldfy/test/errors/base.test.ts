/**
 * Tests for base errors
 */

import { describe, expect, it } from 'vitest';
import { ScaffoldfyError } from '../../src/errors/base';

describe('scaffoldfy error', () => {
  it('should create an error with message', () => {
    const error = new ScaffoldfyError('test message');
    expect(error.message).toBe('test message');
    expect(error).toBeInstanceOf(Error);
  });
});
