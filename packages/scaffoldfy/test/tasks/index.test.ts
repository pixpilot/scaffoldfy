/**
 * Tests for tasks index
 */

import { describe, expect, it } from 'vitest';
import * as tasks from '../../src/tasks';

describe('tasks index', () => {
  it('should export functions', () => {
    expect(tasks.executeTasks).toBeDefined();
    expect(typeof tasks.executeTasks).toBe('function');

    expect(tasks.topologicalSort).toBeDefined();
    expect(typeof tasks.topologicalSort).toBe('function');

    expect(tasks.validateAllTasks).toBeDefined();
    expect(typeof tasks.validateAllTasks).toBe('function');

    expect(tasks.validateWriteTask).toBeDefined();
    expect(typeof tasks.validateWriteTask).toBe('function');

    expect(tasks.validateAndFilterTasks).toBeDefined();
    expect(typeof tasks.validateAndFilterTasks).toBe('function');

    expect(tasks.sortTasksByDependencies).toBeDefined();
    expect(typeof tasks.sortTasksByDependencies).toBe('function');
  });
});
