/**
 * Tests for task dependency resolution
 */

import type { DeleteConfig, TaskDefinition } from '../src/types.js';
import { describe, expect, it } from 'vitest';
import { CircularDependencyError } from '../src/errors/index.js';
import { topologicalSort } from '../src/task-resolver.js';

describe('task Dependency Resolution', () => {
  it('should sort tasks with no dependencies', () => {
    const tasks: TaskDefinition[] = [
      {
        id: 'task1',
        name: 'Task 1',
        description: 'First task',
        required: true,
        enabled: true,
        type: 'delete',
        config: { paths: ['test'] } as DeleteConfig,
      },
      {
        id: 'task2',
        name: 'Task 2',
        description: 'Second task',
        required: true,
        enabled: true,
        type: 'delete',
        config: { paths: ['test'] } as DeleteConfig,
      },
    ];

    const sorted = topologicalSort(tasks);
    expect(sorted).toHaveLength(2);
    // Order doesn't matter when there are no dependencies
    expect(sorted.map((t) => t.id)).toContain('task1');
    expect(sorted.map((t) => t.id)).toContain('task2');
  });

  it('should sort tasks with dependencies', () => {
    const tasks: TaskDefinition[] = [
      {
        id: 'task2',
        name: 'Task 2',
        description: 'Second task',
        required: true,
        enabled: true,
        dependencies: ['task1'],
        type: 'delete',
        config: { paths: ['test'] } as DeleteConfig,
      },
      {
        id: 'task1',
        name: 'Task 1',
        description: 'First task',
        required: true,
        enabled: true,
        type: 'delete',
        config: { paths: ['test'] } as DeleteConfig,
      },
    ];

    const sorted = topologicalSort(tasks);

    expect(sorted[0]?.id).toBe('task1');
    expect(sorted[1]?.id).toBe('task2');
  });

  it('should handle complex dependency chains', () => {
    const tasks: TaskDefinition[] = [
      {
        id: 'task3',
        name: 'Task 3',
        description: 'Third task',
        required: true,
        enabled: true,
        dependencies: ['task2'],
        type: 'delete',
        config: { paths: ['test'] } as DeleteConfig,
      },
      {
        id: 'task1',
        name: 'Task 1',
        description: 'First task',
        required: true,
        enabled: true,
        type: 'delete',
        config: { paths: ['test'] } as DeleteConfig,
      },
      {
        id: 'task2',
        name: 'Task 2',
        description: 'Second task',
        required: true,
        enabled: true,
        dependencies: ['task1'],
        type: 'delete',
        config: { paths: ['test'] } as DeleteConfig,
      },
    ];

    const sorted = topologicalSort(tasks);

    expect(sorted[0]?.id).toBe('task1');
    expect(sorted[1]?.id).toBe('task2');
    expect(sorted[2]?.id).toBe('task3');
  });

  it('should handle multiple dependencies', () => {
    const tasks: TaskDefinition[] = [
      {
        id: 'task4',
        name: 'Task 4',
        description: 'Fourth task',
        required: true,
        enabled: true,
        dependencies: ['task2', 'task3'],
        type: 'delete',
        config: { paths: ['test'] } as DeleteConfig,
      },
      {
        id: 'task1',
        name: 'Task 1',
        description: 'First task',
        required: true,
        enabled: true,
        type: 'delete',
        config: { paths: ['test'] } as DeleteConfig,
      },
      {
        id: 'task2',
        name: 'Task 2',
        description: 'Second task',
        required: true,
        enabled: true,
        dependencies: ['task1'],
        type: 'delete',
        config: { paths: ['test'] } as DeleteConfig,
      },
      {
        id: 'task3',
        name: 'Task 3',
        description: 'Third task',
        required: true,
        enabled: true,
        dependencies: ['task1'],
        type: 'delete',
        config: { paths: ['test'] } as DeleteConfig,
      },
    ];

    const sorted = topologicalSort(tasks);

    expect(sorted[0]?.id).toBe('task1');
    // task2 and task3 can be in any order
    expect(
      sorted
        .slice(1, 3)
        .map((t) => t.id)
        .sort(),
    ).toEqual(['task2', 'task3']);
    // task4 must be last
    expect(sorted[3]?.id).toBe('task4');
  });

  it('should detect circular dependencies', () => {
    const tasks: TaskDefinition[] = [
      {
        id: 'task1',
        name: 'Task 1',
        description: 'First task',
        required: true,
        enabled: true,
        dependencies: ['task2'],
        type: 'delete',
        config: { paths: ['test'] } as DeleteConfig,
      },
      {
        id: 'task2',
        name: 'Task 2',
        description: 'Second task',
        required: true,
        enabled: true,
        dependencies: ['task1'],
        type: 'delete',
        config: { paths: ['test'] } as DeleteConfig,
      },
    ];

    expect(() => topologicalSort(tasks)).toThrow(CircularDependencyError);
  });

  it('should detect circular dependencies in larger chains', () => {
    const tasks: TaskDefinition[] = [
      {
        id: 'task1',
        name: 'Task 1',
        description: 'First task',
        required: true,
        enabled: true,
        dependencies: ['task3'],
        type: 'delete',
        config: { paths: ['test'] } as DeleteConfig,
      },
      {
        id: 'task2',
        name: 'Task 2',
        description: 'Second task',
        required: true,
        enabled: true,
        dependencies: ['task1'],
        type: 'delete',
        config: { paths: ['test'] } as DeleteConfig,
      },
      {
        id: 'task3',
        name: 'Task 3',
        description: 'Third task',
        required: true,
        enabled: true,
        dependencies: ['task2'],
        type: 'delete',
        config: { paths: ['test'] } as DeleteConfig,
      },
    ];

    // This should detect a circular dependency
    expect(() => topologicalSort(tasks)).toThrow(CircularDependencyError);
  });

  it('should throw error for missing dependency', () => {
    const tasks: TaskDefinition[] = [
      {
        id: 'task1',
        name: 'Task 1',
        description: 'First task',
        required: true,
        enabled: true,
        dependencies: ['non-existent'],
        type: 'delete',
        config: { paths: ['test'] } as DeleteConfig,
      },
    ];

    expect(() => topologicalSort(tasks)).toThrow('Task not found');
  });

  it('should handle empty task list', () => {
    const tasks: TaskDefinition[] = [];

    const sorted = topologicalSort(tasks);
    expect(sorted).toHaveLength(0);
  });

  it('should handle single task', () => {
    const tasks: TaskDefinition[] = [
      {
        id: 'task1',
        name: 'Task 1',
        description: 'Only task',
        required: true,
        enabled: true,
        type: 'delete',
        config: { paths: ['test'] } as DeleteConfig,
      },
    ];

    const sorted = topologicalSort(tasks);
    expect(sorted).toHaveLength(1);
    expect(sorted[0]?.id).toBe('task1');
  });

  it('should handle task with self-reference dependency gracefully', () => {
    const tasks: TaskDefinition[] = [
      {
        id: 'task1',
        name: 'Task 1',
        description: 'Self-referencing task',
        required: true,
        enabled: true,
        dependencies: ['task1'], // Self-reference
        type: 'delete',
        config: { paths: ['test'] } as DeleteConfig,
      },
    ];

    // This should detect a circular dependency
    expect(() => topologicalSort(tasks)).toThrow(CircularDependencyError);
  });

  it('should maintain task properties after sorting', () => {
    const tasks: TaskDefinition[] = [
      {
        id: 'task2',
        name: 'Task 2',
        description: 'Second task',
        required: false,
        enabled: true,
        dependencies: ['task1'],
        type: 'delete',
        config: { paths: ['test2'] } as DeleteConfig,
      },
      {
        id: 'task1',
        name: 'Task 1',
        description: 'First task',
        required: true,
        enabled: true,
        type: 'delete',
        config: { paths: ['test1'] } as DeleteConfig,
      },
    ];

    const sorted = topologicalSort(tasks);

    expect(sorted[0]).toEqual(tasks[1]);
    expect(sorted[1]).toEqual(tasks[0]);
  });
});
