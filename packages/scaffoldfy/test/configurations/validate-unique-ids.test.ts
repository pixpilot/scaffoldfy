/**
 * Tests for validateUniqueIds function
 */

import type {
  PromptDefinition,
  TaskDefinition,
  VariableDefinition,
} from '../../src/types.js';
import { describe, expect, it } from 'vitest';
import { validateUniqueIds } from '../../src/configurations/validate-unique-ids';

describe('validateUniqueIds', () => {
  it('should throw error when task ID duplicates variable ID', () => {
    const tasks: TaskDefinition[] = [
      {
        id: 'duplicate-id',
        name: 'Task',
        description: 'Test task',
        required: true,
        enabled: true,
        type: 'write',
        config: {},
      },
    ];
    const variables: VariableDefinition[] = [
      {
        id: 'duplicate-id',
        value: 'test',
      },
    ];

    expect(() => validateUniqueIds(tasks, variables)).toThrow(
      'Duplicate ID "duplicate-id" found in variable. This ID is already used in task',
    );
  });

  it('should throw error when task ID duplicates prompt ID', () => {
    const tasks: TaskDefinition[] = [
      {
        id: 'duplicate-id',
        name: 'Task',
        description: 'Test task',
        required: true,
        enabled: true,
        type: 'write',
        config: {},
      },
    ];
    const prompts: PromptDefinition[] = [
      {
        id: 'duplicate-id',
        type: 'input',
        message: 'Enter value',
      },
    ];

    expect(() => validateUniqueIds(tasks, undefined, prompts)).toThrow(
      'Duplicate ID "duplicate-id" found in prompt. This ID is already used in task',
    );
  });

  it('should throw error when variable ID duplicates prompt ID', () => {
    const variables: VariableDefinition[] = [
      {
        id: 'duplicate-id',
        value: 'test',
      },
    ];
    const prompts: PromptDefinition[] = [
      {
        id: 'duplicate-id',
        type: 'input',
        message: 'Enter value',
      },
    ];

    expect(() => validateUniqueIds([], variables, prompts)).toThrow(
      'Duplicate ID "duplicate-id" found in prompt. This ID is already used in variable',
    );
  });

  it('should throw error when duplicate IDs exist across multiple arrays', () => {
    const tasks: TaskDefinition[] = [
      {
        id: 'id1',
        name: 'Task 1',
        description: 'Test',
        required: true,
        enabled: true,
        type: 'write',
        config: {},
      },
    ];
    const variables: VariableDefinition[] = [
      {
        id: 'id1',
        value: 'test',
      },
    ];

    expect(() => validateUniqueIds(tasks, variables)).toThrow(
      'Duplicate ID "id1" found in variable. This ID is already used in task',
    );
  });

  it('should not throw when all IDs are unique across tasks, variables, and prompts', () => {
    const tasks: TaskDefinition[] = [
      {
        id: 'task-1',
        name: 'Task 1',
        description: 'Test task',
        required: true,
        enabled: true,
        type: 'write',
        config: {},
      },
    ];
    const variables: VariableDefinition[] = [
      {
        id: 'var-1',
        value: 'test',
      },
    ];
    const prompts: PromptDefinition[] = [
      {
        id: 'prompt-1',
        type: 'input',
        message: 'Enter value',
      },
    ];

    expect(() => validateUniqueIds(tasks, variables, prompts)).not.toThrow();
  });

  it('should handle empty arrays', () => {
    expect(() => validateUniqueIds([], [], [])).not.toThrow();
  });

  it('should handle undefined variables and prompts', () => {
    const tasks: TaskDefinition[] = [
      {
        id: 'task-1',
        name: 'Task 1',
        description: 'Test task',
        required: true,
        enabled: true,
        type: 'write',
        config: {},
      },
    ];

    expect(() => validateUniqueIds(tasks)).not.toThrow();
  });
});
