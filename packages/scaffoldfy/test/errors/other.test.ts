/**
 * Tests for other errors
 */

import { describe, expect, it } from 'vitest';
import { TaskNotFoundError } from '../../src/errors/other';

describe('other errors', () => {
  it('should create a task not found error', () => {
    const error = new TaskNotFoundError('task not found', 'test-task');
    expect(error.message).toBe('task not found');
    expect(error).toBeInstanceOf(Error);
  });
});
