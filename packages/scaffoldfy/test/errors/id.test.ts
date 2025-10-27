/**
 * Tests for id errors
 */

import { describe, expect, it } from 'vitest';
import { DuplicateIdError } from '../../src/errors/id';

describe('id errors', () => {
  it('should create a duplicate id error', () => {
    const error = new DuplicateIdError('duplicate id found', 'test-id', 'task');
    expect(error.message).toBe('duplicate id found');
    expect(error).toBeInstanceOf(Error);
  });
});
