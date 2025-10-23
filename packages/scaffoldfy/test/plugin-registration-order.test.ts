/**
 * Test to verify that built-in plugins are registered before validation runs
 */

import type { TaskDefinition } from '../src/types.js';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearPlugins, isPluginTaskType } from '../src/plugin.js';
import { registerBuiltInPlugins } from '../src/task-executors.js';
import { validateAllTasks } from '../src/validation.js';

describe('plugin registration order', () => {
  beforeEach(() => {
    // Clear any previously registered plugins
    clearPlugins();
  });

  afterEach(() => {
    clearPlugins();
  });

  it('should fail validation when plugins are not registered', () => {
    const tasks: TaskDefinition[] = [
      {
        id: 'test-task',
        name: 'Test Task',
        description: 'A test task',
        required: true,
        enabled: true,
        type: 'write',
        config: {
          file: 'test.md',
          template: 'Test content',
        },
      },
    ];

    // Without registering plugins, validation should fail
    const errors = validateAllTasks(tasks);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Unknown task type "write"');
  });

  it('should pass validation when plugins are registered first', () => {
    // Register built-in plugins
    registerBuiltInPlugins();

    const tasks: TaskDefinition[] = [
      {
        id: 'test-task',
        name: 'Test Task',
        description: 'A test task',
        required: true,
        enabled: true,
        type: 'write',
        config: {
          file: 'test.md',
          template: 'Test content',
        },
      },
    ];

    // With plugins registered, validation should pass
    const errors = validateAllTasks(tasks);
    expect(errors).toHaveLength(0);
  });

  it('should recognize all built-in task types after registration', () => {
    // Register built-in plugins
    registerBuiltInPlugins();

    const builtInTaskTypes = [
      'write',
      'update-json',
      'create',
      'delete',
      'regex-replace',
      'replace-in-file',
      'rename',
      'git-init',
      'exec',
    ];

    for (const taskType of builtInTaskTypes) {
      expect(isPluginTaskType(taskType)).toBe(true);
    }
  });

  it('should validate multiple task types correctly', () => {
    // Register built-in plugins
    registerBuiltInPlugins();

    const tasks: TaskDefinition[] = [
      {
        id: 'update-package',
        name: 'Update package.json',
        description: 'Update package.json',
        required: true,
        enabled: true,
        type: 'update-json',
        config: {
          file: 'package.json',
          updates: {},
        },
      },
      {
        id: 'create-readme',
        name: 'Create README',
        description: 'Create README file',
        required: true,
        enabled: true,
        type: 'write',
        config: {
          file: 'README.md',
          template: 'Test',
        },
      },
      {
        id: 'delete-temp',
        name: 'Delete temp files',
        description: 'Delete temp files',
        required: false,
        enabled: true,
        type: 'delete',
        config: {
          patterns: ['*.tmp'],
        },
      },
      {
        id: 'run-command',
        name: 'Run command',
        description: 'Run a command',
        required: false,
        enabled: true,
        type: 'exec',
        config: {
          command: 'echo test',
        },
      },
    ];

    // All tasks should validate successfully
    const errors = validateAllTasks(tasks);
    expect(errors).toHaveLength(0);
  });

  it('should detect unknown task types even after registration', () => {
    // Register built-in plugins
    registerBuiltInPlugins();

    const tasks: TaskDefinition[] = [
      {
        id: 'unknown-task',
        name: 'Unknown Task',
        description: 'A task with unknown type',
        required: true,
        enabled: true,
        type: 'unknown-task-type' as any,
        config: {},
      },
    ];

    // Unknown task type should still fail validation
    const errors = validateAllTasks(tasks);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Unknown task type "unknown-task-type"');
  });
});
