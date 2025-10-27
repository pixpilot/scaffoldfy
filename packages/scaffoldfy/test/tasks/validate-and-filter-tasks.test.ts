/**
 * Tests for validate and filter tasks
 */

import { describe, expect, it } from 'vitest';
import { validateAndFilterTasks } from '../../src/tasks/validate-and-filter-tasks';

describe('validate and filter tasks', () => {
  it('should export validateAndFilterTasks function', () => {
    expect(validateAndFilterTasks).toBeDefined();
    expect(typeof validateAndFilterTasks).toBe('function');
  });
});
