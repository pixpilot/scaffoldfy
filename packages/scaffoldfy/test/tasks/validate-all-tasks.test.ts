/**
 * Tests for validate all tasks
 */

import { describe, expect, it } from 'vitest';
import { validateAllTasks } from '../../src/tasks/validate-all-tasks';

describe('validate all tasks', () => {
  it('should export validateAllTasks function', () => {
    expect(validateAllTasks).toBeDefined();
    expect(typeof validateAllTasks).toBe('function');
  });
});
