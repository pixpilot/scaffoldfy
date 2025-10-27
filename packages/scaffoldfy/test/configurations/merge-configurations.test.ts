/**
 * Tests for mergeConfigurations functionality
 */

import type { TaskDefinition, TasksConfiguration } from '../../src/types.js';
import { describe, expect, it } from 'vitest';
import { mergeConfigurations } from '../../src/configurations/index.js';

describe('mergeConfigurations', () => {
  it('should merge tasks from multiple configurations', () => {
    const template1: TasksConfiguration = {
      name: 'test-config',
      tasks: [
        {
          id: 'task1',
          name: 'Task 1',
          description: 'First task',
          required: true,
          enabled: true,
          type: 'write',
          config: {},
        },
      ],
    };

    const template2: TasksConfiguration = {
      name: 'test-config',
      tasks: [
        {
          id: 'task2',
          name: 'Task 2',
          description: 'Second task',
          required: false,
          enabled: true,
          type: 'delete',
          config: {},
        },
      ],
    };

    const merged = mergeConfigurations([template1, template2]);

    expect(merged.tasks).toBeDefined();
    expect(merged.tasks).toHaveLength(2);
    expect(merged.tasks![0]?.id).toBe('task1');
    expect(merged.tasks![1]?.id).toBe('task2');
  });

  it('should override tasks with same ID', () => {
    const template1: TasksConfiguration = {
      name: 'test-config',
      tasks: [
        {
          id: 'task1',
          name: 'Original Name',
          description: 'Original',
          required: true,
          enabled: true,
          type: 'write',
          config: { value: 'old' },
        },
      ],
    };

    const template2: TasksConfiguration = {
      name: 'test-config',
      tasks: [
        {
          id: 'task1',
          name: 'Updated Name',
          description: 'Updated',
          required: false,
          enabled: false,
          type: 'delete',
          config: { value: 'new' },
          override: 'merge',
        },
      ],
    };

    const merged = mergeConfigurations([template1, template2]);

    expect(merged.tasks).toBeDefined();
    expect(merged.tasks).toHaveLength(1);
    expect(merged.tasks![0]?.name).toBe('Updated Name');
    expect(merged.tasks![0]?.description).toBe('Updated');
    expect(merged.tasks![0]?.required).toBe(false);
    expect(merged.tasks![0]?.type).toBe('delete');
  });

  it('should merge dependencies arrays', () => {
    const task1: TaskDefinition = {
      id: 'task1',
      name: 'Task 1',
      description: 'Test',
      required: true,
      enabled: true,
      type: 'write',
      config: {},
      dependencies: ['dep1'],
    };

    const task2: TaskDefinition = {
      id: 'task1',
      name: 'Task 1 Updated',
      description: 'Test',
      required: true,
      enabled: true,
      type: 'write',
      config: {},
      dependencies: ['dep2', 'dep3'],
      override: 'merge',
    };

    const merged = mergeConfigurations([
      { name: 'test-config', tasks: [task1] },
      { name: 'test-config', tasks: [task2] },
    ]);

    expect(merged.tasks).toBeDefined();
    expect(merged.tasks![0]?.dependencies).toEqual(['dep1', 'dep2', 'dep3']);
  });

  it('should handle empty configurations array', () => {
    const merged = mergeConfigurations([]);
    expect(merged.tasks).toHaveLength(0);
  });

  it('should merge configuration with only prompts/variables (no tasks)', () => {
    const baseTemplate: TasksConfiguration = {
      name: 'test-config',
      prompts: [
        {
          id: 'projectName',
          type: 'input',
          message: 'Project name?',
        },
        {
          id: 'author',
          type: 'input',
          message: 'Author name?',
        },
      ],
      variables: [
        {
          id: 'currentYear',
          value: '2024',
        },
      ],
    };

    const childTemplate: TasksConfiguration = {
      name: 'test-config',
      tasks: [
        {
          id: 'use-prompts',
          name: 'Use Prompts',
          description: 'Task using inherited prompts',
          required: true,
          enabled: true,
          type: 'write',
          config: {},
        },
      ],
    };

    const merged = mergeConfigurations([baseTemplate, childTemplate]);

    expect(merged.tasks).toBeDefined();
    expect(merged.tasks).toHaveLength(1);
    expect(merged.tasks![0]?.id).toBe('use-prompts');
    expect(merged.prompts).toBeDefined();
    expect(merged.prompts).toHaveLength(2);
    expect(merged.variables).toBeDefined();
    expect(merged.variables).toHaveLength(1);
  });

  it('should return single configuration as-is', () => {
    const template: TasksConfiguration = {
      name: 'test-config',
      tasks: [
        {
          id: 'task1',
          name: 'Task 1',
          description: 'Test',
          required: true,
          enabled: true,
          type: 'write',
          config: {},
        },
      ],
    };

    const merged = mergeConfigurations([template]);
    expect(merged).toEqual(template);
  });

  it('should preserve enabled field from last configuration when merging', () => {
    const template1: TasksConfiguration = {
      name: 'base-template',
      enabled: true,
      tasks: [
        {
          id: 'task1',
          name: 'Task 1',
          description: 'Test',
          required: true,
          enabled: true,
          type: 'write',
          config: {},
        },
      ],
    };

    const template2: TasksConfiguration = {
      name: 'child-template',
      enabled: false, // This should be preserved in the merged result
      tasks: [
        {
          id: 'task2',
          name: 'Task 2',
          description: 'Test',
          required: true,
          enabled: true,
          type: 'delete',
          config: {},
        },
      ],
    };

    const merged = mergeConfigurations([template1, template2]);

    expect(merged.enabled).toBe(false);
  });

  it('should preserve enabled field as undefined when not specified in last configuration', () => {
    const template1: TasksConfiguration = {
      name: 'base-template',
      enabled: false,
      tasks: [
        {
          id: 'task1',
          name: 'Task 1',
          description: 'Test',
          required: true,
          enabled: true,
          type: 'write',
          config: {},
        },
      ],
    };

    const template2: TasksConfiguration = {
      name: 'child-template',
      // enabled not specified, should be undefined
      tasks: [
        {
          id: 'task2',
          name: 'Task 2',
          description: 'Test',
          required: true,
          enabled: true,
          type: 'delete',
          config: {},
        },
      ],
    };

    const merged = mergeConfigurations([template1, template2]);

    expect(merged.enabled).toBeUndefined();
  });

  it('should preserve conditional enabled field', () => {
    const template1: TasksConfiguration = {
      name: 'base-template',
      enabled: true,
      tasks: [],
    };

    const template2: TasksConfiguration = {
      name: 'child-template',
      enabled: { type: 'condition', value: 'useTypeScript === true' },
      tasks: [],
    };

    const merged = mergeConfigurations([template1, template2]);

    expect(merged.enabled).toEqual({
      type: 'condition',
      value: 'useTypeScript === true',
    });
  });

  it('should preserve executable enabled field', () => {
    const template1: TasksConfiguration = {
      name: 'base-template',
      enabled: true,
      tasks: [],
    };

    const template2: TasksConfiguration = {
      name: 'child-template',
      enabled: { type: 'exec', value: 'node -e "console.log(true)"' },
      tasks: [],
    };

    const merged = mergeConfigurations([template1, template2]);

    expect(merged.enabled).toEqual({
      type: 'exec',
      value: 'node -e "console.log(true)"',
    });
  });

  it('should skip tasks from configurations with enabled: false', () => {
    const template1: TasksConfiguration = {
      name: 'enabled-template',
      enabled: true,
      tasks: [
        {
          id: 'task1',
          name: 'Task 1',
          description: 'From enabled template',
          required: true,
          enabled: true,
          type: 'write',
          config: {},
        },
      ],
    };

    const template2: TasksConfiguration = {
      name: 'disabled-template',
      enabled: false, // This template's tasks should be skipped
      tasks: [
        {
          id: 'task2',
          name: 'Task 2',
          description: 'From disabled template',
          required: true,
          enabled: true,
          type: 'delete',
          config: {},
        },
      ],
    };

    const template3: TasksConfiguration = {
      name: 'another-enabled-template',
      tasks: [
        {
          id: 'task3',
          name: 'Task 3',
          description: 'From another enabled template',
          required: true,
          enabled: true,
          type: 'write',
          config: {},
        },
      ],
    };

    const merged = mergeConfigurations([template1, template2, template3]);

    // Only tasks from template1 and template3 should be present
    expect(merged.tasks).toHaveLength(2);
    expect(merged.tasks!.find((t) => t.id === 'task1')).toBeDefined();
    expect(merged.tasks!.find((t) => t.id === 'task2')).toBeUndefined(); // task2 should be skipped
    expect(merged.tasks!.find((t) => t.id === 'task3')).toBeDefined();
  });

  it('should skip prompts and variables from configurations with enabled: false', () => {
    const template1: TasksConfiguration = {
      name: 'enabled-template',
      prompts: [
        {
          id: 'prompt1',
          type: 'input',
          message: 'Prompt 1',
        },
      ],
      variables: [
        {
          id: 'var1',
          value: 'value1',
        },
      ],
      tasks: [],
    };

    const template2: TasksConfiguration = {
      name: 'disabled-template',
      enabled: false,
      prompts: [
        {
          id: 'prompt2',
          type: 'input',
          message: 'Prompt 2',
        },
      ],
      variables: [
        {
          id: 'var2',
          value: 'value2',
        },
      ],
      tasks: [],
    };

    const merged = mergeConfigurations([template1, template2]);

    // Only prompts and variables from template1 should be present
    expect(merged.prompts).toHaveLength(1);
    expect(merged.prompts![0]?.id).toBe('prompt1');
    expect(merged.variables).toHaveLength(1);
    expect(merged.variables![0]?.id).toBe('var1');
  });
});
