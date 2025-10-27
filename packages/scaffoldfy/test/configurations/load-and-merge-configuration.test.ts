/**
 * Tests for loadAndMergeConfiguration functionality
 */

import type { TasksConfiguration } from '../../src/types.js';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearConfigurationCache,
  loadAndMergeConfiguration,
} from '../../src/configurations/index.js';

const testDir = path.join(process.cwd(), 'test-fixtures', 'load-and-merge-configuration');

// Helper to create test configuration files
function createConfigFile(name: string, config: TasksConfiguration): string {
  const filePath = path.join(testDir, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  return filePath;
}

describe('loadAndMergeConfiguration', () => {
  beforeEach(() => {
    // Clean up before each test
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    clearConfigurationCache();
  });

  afterEach(() => {
    // Clean up after each test
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it('should load configuration with only prompts/variables (no tasks) for extending', async () => {
    const baseConfig: TasksConfiguration = {
      name: 'test-config',
      prompts: [
        {
          id: 'sharedPrompt',
          type: 'input',
          message: 'Enter value',
        },
      ],
      variables: [
        {
          id: 'baseVar',
          value: 'baseValue',
        },
      ],
    };

    const childConfig: TasksConfiguration = {
      name: 'child-template',
      extends: 'base.json',
      tasks: [
        {
          id: 'child-task',
          name: 'Child Task',
          description: 'Task using base prompts/variables',
          required: true,
          enabled: true,
          type: 'write',
          config: {},
        },
      ],
    };

    createConfigFile('base.json', baseConfig);
    const childPath = createConfigFile('child.json', childConfig);

    const merged = await loadAndMergeConfiguration(childPath);

    expect(merged.tasks).toBeDefined();
    expect(merged.tasks).toHaveLength(1);
    expect(merged.tasks![0]?.id).toBe('child-task');
    expect(merged.prompts).toBeDefined();
    expect(merged.prompts).toHaveLength(1);
    expect(merged.prompts![0]?.id).toBe('sharedPrompt');
    expect(merged.variables).toBeDefined();
    expect(merged.variables).toHaveLength(1);
    expect(merged.variables![0]?.id).toBe('baseVar');
  });

  it('should load and merge configurations with extends', async () => {
    const baseConfig: TasksConfiguration = {
      name: 'test-config',
      tasks: [
        {
          id: 'base-task',
          name: 'Base Task',
          description: 'From base',
          required: true,
          enabled: true,
          type: 'write',
          config: { base: true },
        },
      ],
    };

    const childConfig: TasksConfiguration = {
      name: 'child-template',
      extends: 'base.json',
      tasks: [
        {
          id: 'child-task',
          name: 'Child Task',
          description: 'From child',
          required: false,
          enabled: true,
          type: 'delete',
          config: { child: true },
        },
      ],
    };

    createConfigFile('base.json', baseConfig);
    const childPath = createConfigFile('child.json', childConfig);

    const merged = await loadAndMergeConfiguration(childPath);

    expect(merged.tasks).toBeDefined();
    expect(merged.tasks).toHaveLength(2);
    expect(merged.tasks!.find((t) => t.id === 'base-task')).toBeDefined();
    expect(merged.tasks!.find((t) => t.id === 'child-task')).toBeDefined();
  });

  it('should support multiple extends', async () => {
    const base1: TasksConfiguration = {
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

    const base2: TasksConfiguration = {
      name: 'test-config',
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

    const child: TasksConfiguration = {
      name: 'child-template',
      extends: ['base1.json', 'base2.json'],
      tasks: [
        {
          id: 'task3',
          name: 'Task 3',
          description: 'Test',
          required: true,
          enabled: true,
          type: 'exec',
          config: {},
        },
      ],
    };

    createConfigFile('base1.json', base1);
    createConfigFile('base2.json', base2);
    const childPath = createConfigFile('child.json', child);

    const merged = await loadAndMergeConfiguration(childPath);

    expect(merged.tasks).toHaveLength(3);
  });

  it('should resolve relative paths correctly', async () => {
    fs.mkdirSync(path.join(testDir, 'subdir'), { recursive: true });

    const baseConfig: TasksConfiguration = {
      name: 'test-config',
      tasks: [
        {
          id: 'base',
          name: 'Base',
          description: 'Test',
          required: true,
          enabled: true,
          type: 'write',
          config: {},
        },
      ],
    };

    const childConfig: TasksConfiguration = {
      name: 'test-template-1',
      extends: '../base.json',
      tasks: [],
    };

    createConfigFile('base.json', baseConfig);
    const childPath = createConfigFile('subdir/child.json', childConfig);

    const merged = await loadAndMergeConfiguration(childPath);

    expect(merged.tasks).toBeDefined();
    expect(merged.tasks).toHaveLength(1);
    expect(merged.tasks![0]?.id).toBe('base');
  });

  it('should preserve enabled field from child configuration when extending', async () => {
    const baseConfig: TasksConfiguration = {
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

    const childConfig: TasksConfiguration = {
      name: 'child-template',
      extends: 'base.json',
      enabled: false, // This should be preserved AND its tasks should be skipped
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

    createConfigFile('base.json', baseConfig);
    const childPath = createConfigFile('child.json', childConfig);

    const merged = await loadAndMergeConfiguration(childPath);

    // The enabled field should be preserved from the child configuration
    expect(merged.enabled).toBe(false);
    // Only the base template's task should be included (child's task is skipped)
    expect(merged.tasks).toHaveLength(1);
    expect(merged.tasks![0]?.id).toBe('task1');
  });

  it('should preserve complex enabled field when extending', async () => {
    const baseConfig: TasksConfiguration = {
      name: 'base-template',
      enabled: true,
      tasks: [],
    };

    const childConfig: TasksConfiguration = {
      name: 'child-template',
      extends: 'base.json',
      enabled: { type: 'condition', value: 'projectType === "monorepo"' },
      tasks: [],
    };

    createConfigFile('base.json', baseConfig);
    const childPath = createConfigFile('child.json', childConfig);

    const merged = await loadAndMergeConfiguration(childPath);

    expect(merged.enabled).toEqual({
      type: 'condition',
      value: 'projectType === "monorepo"',
    });
  });
});
