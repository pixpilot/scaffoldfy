/**
 * Tests for configuration inheritance functionality
 */

import type { TaskDefinition, TasksConfiguration } from '../src/types.js';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearConfigurationCache,
  loadAndMergeConfiguration,
  loadConfiguration,
  loadTasksWithInheritance,
  mergeConfigurations,
} from '../src/config-inheritance.js';
import {
  CircularDependencyError,
  ConfigFetchError,
  ConfigParseError,
  ConfigurationFileNotFoundError,
} from '../src/errors/index.js';

const testDir = path.join(process.cwd(), 'test-fixtures', 'inheritance');

// Helper to create test configuration files
function createConfigFile(name: string, config: TasksConfiguration): string {
  const filePath = path.join(testDir, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  return filePath;
}

describe('configuration inheritance', () => {
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
    clearConfigurationCache();
  });

  describe('loadConfiguration', () => {
    it('should load a simple configuration file', async () => {
      const config: TasksConfiguration = {
        name: 'test-config',
        tasks: [
          {
            id: 'task1',
            name: 'Task 1',
            description: 'Test task',
            required: true,
            enabled: true,
            type: 'write',
            config: { file: 'test.txt', template: 'Hello {{name}}' },
          },
        ],
      };

      const filePath = createConfigFile('simple.json', config);
      const loaded = await loadConfiguration(filePath);

      // Tasks should be annotated with $sourceUrl
      expect(loaded.tasks).toBeDefined();
      expect(loaded.tasks).toHaveLength(1);
      expect(loaded.tasks![0]?.$sourceUrl).toBe(filePath);
      expect(loaded.tasks![0]?.id).toBe('task1');
      expect(loaded.tasks![0]?.name).toBe('Task 1');
    });

    it('should throw error for non-existent file', async () => {
      await expect(loadConfiguration('non-existent.json')).rejects.toThrow(
        ConfigurationFileNotFoundError,
      );
    });

    it('should throw error for invalid JSON', async () => {
      const filePath = path.join(testDir, 'invalid.json');
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(filePath, 'invalid json');

      await expect(loadConfiguration(filePath)).rejects.toThrow(ConfigParseError);
    });

    it('should allow missing tasks array (for configurations with only prompts/variables)', async () => {
      const filePath = path.join(testDir, 'no-tasks.json');
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(
        filePath,
        JSON.stringify({
          name: 'prompts-only-template',
          prompts: [
            {
              id: 'projectName',
              type: 'input',
              message: 'Project name?',
            },
          ],
        }),
      );

      const config = await loadConfiguration(filePath);
      expect(config.tasks).toEqual([]);
      expect(config.prompts).toBeDefined();
      expect(config.prompts).toHaveLength(1);
    });

    it('should detect circular dependencies', async () => {
      const config1: TasksConfiguration = {
        name: 'test-template-1',
        extends: 'template2.json',
        tasks: [],
      };
      const config2: TasksConfiguration = {
        name: 'test-template-2',
        extends: 'template1.json',
        tasks: [],
      };

      createConfigFile('template1.json', config1);
      createConfigFile('template2.json', config2);

      await expect(
        loadAndMergeConfiguration(path.join(testDir, 'template1.json')),
      ).rejects.toThrow(CircularDependencyError);
    });
  });

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

  describe('loadAndMergeConfiguration', () => {
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

  describe('loadTasksWithInheritance', () => {
    it('should load tasks with inheritance info', async () => {
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
        name: 'child-template',
        extends: 'base.json',
        tasks: [
          {
            id: 'child',
            name: 'Child',
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

      const result = await loadTasksWithInheritance(childPath);

      expect(result.tasks).toHaveLength(2);
    });
  });

  describe('url-based configuration loading', () => {
    // Mock fetch for testing
    const originalFetch = globalThis.fetch;
    let mockFetch: typeof fetch;

    beforeEach(() => {
      mockFetch = (async (input: any): Promise<Response> => {
        const url = typeof input === 'string' ? input : input.toString();

        // Mock different URLs
        if (url === 'https://example.com/base.json') {
          return new Response(
            JSON.stringify({
              name: 'test-config',
              tasks: [
                {
                  id: 'remote-task',
                  name: 'Remote Task',
                  description: 'Task from remote URL',
                  required: true,
                  enabled: true,
                  type: 'write',
                  config: { remote: true },
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (url === 'https://example.com/templates/child.json') {
          return new Response(
            JSON.stringify({
              name: 'child-template',
              extends: '../base.json',
              tasks: [
                {
                  id: 'child-task',
                  name: 'Child Task',
                  description: 'Child task',
                  required: true,
                  enabled: true,
                  type: 'write',
                  config: {},
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (url === 'https://example.com/invalid.json') {
          return new Response('invalid json', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (url === 'https://example.com/notfound.json') {
          return new Response('Not Found', { status: 404 });
        }

        if (url === 'https://example.com/circular1.json') {
          return new Response(
            JSON.stringify({
              name: 'circular-template-1',
              extends: 'https://example.com/circular2.json',
              tasks: [],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (url === 'https://example.com/circular2.json') {
          return new Response(
            JSON.stringify({
              name: 'circular-template-2',
              extends: 'https://example.com/circular1.json',
              tasks: [],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (url === 'https://example.com/with-local-extends.json') {
          return new Response(
            JSON.stringify({
              name: 'remote-with-local-extends',
              extends: './local-base.json',
              tasks: [
                {
                  id: 'remote-with-local',
                  name: 'Remote with local extends',
                  description: 'Test',
                  required: true,
                  enabled: true,
                  type: 'write',
                  config: {},
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (url === 'https://example.com/local-base.json') {
          return new Response(
            JSON.stringify({
              name: 'test-config',
              tasks: [
                {
                  id: 'local-base-task',
                  name: 'Local Base Task',
                  description: 'Base task',
                  required: true,
                  enabled: true,
                  type: 'write',
                  config: {},
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        return new Response('Not Found', { status: 404 });
      }) as typeof fetch;

      globalThis.fetch = mockFetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('should load configuration from HTTP URL', async () => {
      const config = await loadConfiguration('https://example.com/base.json');

      expect(config.tasks).toBeDefined();
      expect(config.tasks).toHaveLength(1);
      expect(config.tasks![0]?.id).toBe('remote-task');
      expect(config.tasks![0]?.name).toBe('Remote Task');
    });

    it('should cache remote configurations', async () => {
      const config1 = await loadConfiguration('https://example.com/base.json');
      const config2 = await loadConfiguration('https://example.com/base.json');

      expect(config1).toBe(config2); // Should be the same cached instance
    });

    it('should throw error for 404 responses', async () => {
      await expect(
        loadConfiguration('https://example.com/notfound.json'),
      ).rejects.toThrow(ConfigFetchError);
    });

    it('should throw error for invalid JSON from URL', async () => {
      await expect(loadConfiguration('https://example.com/invalid.json')).rejects.toThrow(
        ConfigParseError,
      );
    });

    it('should support configuration inheritance from URLs', async () => {
      const config = await loadAndMergeConfiguration(
        'https://example.com/templates/child.json',
      );

      expect(config.tasks).toBeDefined();
      expect(config.tasks).toHaveLength(2);
      expect(config.tasks!.some((t) => t.id === 'remote-task')).toBe(true);
      expect(config.tasks!.some((t) => t.id === 'child-task')).toBe(true);
    });

    it('should detect circular dependencies with URLs', async () => {
      await expect(
        loadAndMergeConfiguration('https://example.com/circular1.json'),
      ).rejects.toThrow(CircularDependencyError);
    });

    it('should support mixed local and remote templates', async () => {
      const localConfig: TasksConfiguration = {
        name: 'local-template',
        extends: 'https://example.com/base.json',
        tasks: [
          {
            id: 'local-task',
            name: 'Local Task',
            description: 'Local task extending remote',
            required: true,
            enabled: true,
            type: 'write',
            config: {},
          },
        ],
      };

      const localPath = createConfigFile('mixed.json', localConfig);
      const config = await loadAndMergeConfiguration(localPath);

      expect(config.tasks).toBeDefined();
      expect(config.tasks).toHaveLength(2);
      expect(config.tasks!.some((t) => t.id === 'remote-task')).toBe(true);
      expect(config.tasks!.some((t) => t.id === 'local-task')).toBe(true);
    });

    it('should resolve relative URLs correctly', async () => {
      const config = await loadAndMergeConfiguration(
        'https://example.com/with-local-extends.json',
      );

      expect(config.tasks).toBeDefined();
      expect(config.tasks).toHaveLength(2);
      expect(config.tasks!.some((t) => t.id === 'local-base-task')).toBe(true);
      expect(config.tasks!.some((t) => t.id === 'remote-with-local')).toBe(true);
    });

    it('should load tasks with inheritance from URL', async () => {
      const result = await loadTasksWithInheritance('https://example.com/base.json');

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]?.id).toBe('remote-task');
    });

    it('should support HTTPS URLs', async () => {
      const config = await loadConfiguration('https://example.com/base.json');

      expect(config.tasks).toHaveLength(1);
    });

    it('should handle remote templates with multiple extends', async () => {
      // Mock a template that extends multiple remote templates
      const multiExtendsFetch = (async (input: any): Promise<Response> => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url === 'https://example.com/multi.json') {
          return new Response(
            JSON.stringify({
              name: 'multi-extends-template',
              extends: [
                'https://example.com/base1.json',
                'https://example.com/base2.json',
              ],
              tasks: [
                {
                  id: 'multi-task',
                  name: 'Multi Task',
                  description: 'Task with multiple extends',
                  required: true,
                  enabled: true,
                  type: 'write',
                  config: {},
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (url === 'https://example.com/base1.json') {
          return new Response(
            JSON.stringify({
              name: 'test-config',
              tasks: [
                {
                  id: 'base1-task',
                  name: 'Base 1 Task',
                  description: 'Task from base 1',
                  required: true,
                  enabled: true,
                  type: 'write',
                  config: {},
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (url === 'https://example.com/base2.json') {
          return new Response(
            JSON.stringify({
              name: 'test-config',
              tasks: [
                {
                  id: 'base2-task',
                  name: 'Base 2 Task',
                  description: 'Task from base 2',
                  required: true,
                  enabled: true,
                  type: 'write',
                  config: {},
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        return new Response('Not Found', { status: 404 });
      }) as typeof fetch;

      globalThis.fetch = multiExtendsFetch;

      const config = await loadAndMergeConfiguration('https://example.com/multi.json');

      expect(config.tasks).toBeDefined();
      expect(config.tasks).toHaveLength(3);
      expect(config.tasks!.some((t) => t.id === 'base1-task')).toBe(true);
      expect(config.tasks!.some((t) => t.id === 'base2-task')).toBe(true);
      expect(config.tasks!.some((t) => t.id === 'multi-task')).toBe(true);
    });
  });

  describe('fetchConfigurationFile', () => {
    it('should fetch from remote URL', async () => {
      const { fetchConfigurationFile } = await import('../src/config-inheritance.js');
      const mockFetch = (async (url: string) => {
        if (url === 'https://example.com/template.hbs') {
          return Promise.resolve(
            new Response('# {{title}}\n\nWelcome to {{projectName}}', {
              status: 200,
              headers: { 'Content-Type': 'text/plain' },
            }),
          );
        }
        return Promise.resolve(new Response('Not Found', { status: 404 }));
      }) as typeof fetch;

      globalThis.fetch = mockFetch;

      const content = await fetchConfigurationFile('https://example.com/template.hbs');
      expect(content).toBe('# {{title}}\n\nWelcome to {{projectName}}');
    });

    it('should read from local file', async () => {
      const { fetchConfigurationFile } = await import('../src/config-inheritance.js');
      const templatePath = path.join(testDir, 'local-template.hbs');
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(templatePath, 'Local content: {{name}}');

      const content = await fetchConfigurationFile(templatePath);
      expect(content).toBe('Local content: {{name}}');
    });

    it('should throw error for non-existent local file', async () => {
      const { fetchConfigurationFile } = await import('../src/config-inheritance.js');
      const nonExistentPath = path.join(testDir, 'does-not-exist.hbs');
      await expect(fetchConfigurationFile(nonExistentPath)).rejects.toThrow(
        'Configuration file not found',
      );
    });
  });

  describe('$sourceUrl annotation', () => {
    it('should annotate tasks with source URL from remote configuration', async () => {
      const mockFetch = (async (url: string) => {
        if (url === 'https://example.com/remote-config.json') {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                name: 'test-config',
                tasks: [
                  {
                    id: 'remote-task',
                    name: 'Remote Task',
                    description: 'Task from remote',
                    required: true,
                    enabled: true,
                    type: 'write',
                    config: {
                      file: 'output.txt',
                      templateFile: './template.hbs',
                    },
                  },
                ],
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          );
        }
        return Promise.resolve(new Response('Not Found', { status: 404 }));
      }) as typeof fetch;

      globalThis.fetch = mockFetch;

      const config = await loadConfiguration('https://example.com/remote-config.json');
      expect(config.tasks).toBeDefined();
      expect(config.tasks![0]?.$sourceUrl).toBe('https://example.com/remote-config.json');
    });

    it('should annotate tasks with source path from local configuration', async () => {
      const config: TasksConfiguration = {
        name: 'test-config',
        tasks: [
          {
            id: 'local-task',
            name: 'Local Task',
            description: 'Task from local',
            required: true,
            enabled: true,
            type: 'write',
            config: { file: 'output.txt', templateFile: './template.hbs' },
          },
        ],
      };

      const filePath = createConfigFile('local-with-templatefile.json', config);
      const loaded = await loadConfiguration(filePath);

      expect(loaded.tasks).toBeDefined();
      expect(loaded.tasks![0]?.$sourceUrl).toBe(filePath);
    });

    it('should preserve $sourceUrl when merging templates', async () => {
      const baseConfig: TasksConfiguration = {
        name: 'test-config',
        tasks: [
          {
            id: 'task1',
            name: 'Base Task',
            description: 'Base',
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
        tasks: [
          {
            id: 'task1',
            name: 'Overridden Task',
            description: 'Overridden',
            required: false,
            enabled: true,
            type: 'write',
            config: { value: 'new' },
            override: 'merge',
          },
        ],
      };

      createConfigFile('base.json', baseConfig);
      const childPath = createConfigFile('child.json', childConfig);

      const merged = await loadAndMergeConfiguration(childPath);

      // The overridden task should have the child's source URL
      expect(merged.tasks).toBeDefined();
      expect(merged.tasks![0]?.$sourceUrl).toBe(childPath);
    });

    it('should annotate variables with source URL from local configuration', async () => {
      const config: TasksConfiguration = {
        name: 'test-config',
        variables: [
          {
            id: 'testVar',
            value: { type: 'exec-file', file: './script.js' },
          },
        ],
      };

      const filePath = createConfigFile('with-variables.json', config);
      const loaded = await loadConfiguration(filePath);

      expect(loaded.variables).toBeDefined();
      expect(loaded.variables).toHaveLength(1);
      expect(loaded.variables![0]?.$sourceUrl).toBe(filePath);
      expect(loaded.variables![0]?.id).toBe('testVar');
    });

    it('should preserve $sourceUrl when merging variables', async () => {
      const baseConfig: TasksConfiguration = {
        name: 'base-template',
        variables: [
          {
            id: 'var1',
            value: 'base-value',
          },
        ],
      };

      const childConfig: TasksConfiguration = {
        name: 'child-template',
        extends: 'base-vars.json',
        variables: [
          {
            id: 'var1',
            value: 'overridden-value',
            override: 'merge',
          },
        ],
      };

      createConfigFile('base-vars.json', baseConfig);
      const childPath = createConfigFile('child-vars.json', childConfig);

      const merged = await loadAndMergeConfiguration(childPath);

      // The overridden variable should have the child's source URL
      expect(merged.variables).toBeDefined();
      expect(merged.variables![0]?.$sourceUrl).toBe(childPath);
      expect(merged.variables![0]?.value).toBe('overridden-value');
    });
  });

  describe('duplicate ID validation', () => {
    it('should throw error when task ID duplicates variable ID', () => {
      const template: TasksConfiguration = {
        name: 'test-config',
        tasks: [
          {
            id: 'duplicate-id',
            name: 'Task',
            description: 'Test task',
            required: true,
            enabled: true,
            type: 'write',
            config: {},
          },
        ],
        variables: [
          {
            id: 'duplicate-id',
            value: 'test',
          },
        ],
      };

      expect(() => mergeConfigurations([template])).toThrow(
        'Duplicate ID "duplicate-id" found in variable. This ID is already used in task',
      );
    });

    it('should throw error when task ID duplicates prompt ID', () => {
      const template: TasksConfiguration = {
        name: 'test-config',
        tasks: [
          {
            id: 'duplicate-id',
            name: 'Task',
            description: 'Test task',
            required: true,
            enabled: true,
            type: 'write',
            config: {},
          },
        ],
        prompts: [
          {
            id: 'duplicate-id',
            type: 'input',
            message: 'Enter value',
          },
        ],
      };

      expect(() => mergeConfigurations([template])).toThrow(
        'Duplicate ID "duplicate-id" found in prompt. This ID is already used in task',
      );
    });

    it('should throw error when variable ID duplicates prompt ID', () => {
      const template: TasksConfiguration = {
        name: 'test-config',
        tasks: [],
        variables: [
          {
            id: 'duplicate-id',
            value: 'test',
          },
        ],
        prompts: [
          {
            id: 'duplicate-id',
            type: 'input',
            message: 'Enter value',
          },
        ],
      };

      expect(() => mergeConfigurations([template])).toThrow(
        'Duplicate ID "duplicate-id" found in prompt. This ID is already used in variable',
      );
    });

    it('should throw error when duplicate IDs exist after inheritance merge', async () => {
      const baseConfig: TasksConfiguration = {
        name: 'test-config',
        variables: [
          {
            id: 'shared-id',
            value: 'base-value',
          },
        ],
      };

      const childConfig: TasksConfiguration = {
        name: 'child-template',
        extends: 'base.json',
        tasks: [
          {
            id: 'shared-id',
            name: 'Task',
            description: 'Task with same ID as variable',
            required: true,
            enabled: true,
            type: 'write',
            config: {},
          },
        ],
      };

      createConfigFile('base.json', baseConfig);
      const childPath = createConfigFile('child.json', childConfig);

      await expect(loadAndMergeConfiguration(childPath)).rejects.toThrow(
        'Duplicate ID "shared-id"',
      );
    });

    it('should allow same ID when overriding (task to task)', async () => {
      const baseConfig: TasksConfiguration = {
        name: 'test-config',
        tasks: [
          {
            id: 'same-id',
            name: 'Base Task',
            description: 'Base',
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
        tasks: [
          {
            id: 'same-id',
            name: 'Overridden Task',
            description: 'Overridden',
            required: false,
            enabled: true,
            type: 'write',
            config: {},
            override: 'merge',
          },
        ],
      };

      createConfigFile('base.json', baseConfig);
      const childPath = createConfigFile('child.json', childConfig);

      // This should not throw - it's a valid override
      const merged = await loadAndMergeConfiguration(childPath);
      expect(merged.tasks).toHaveLength(1);
      expect(merged.tasks![0]?.name).toBe('Overridden Task');
    });

    it('should allow same ID when overriding variables', async () => {
      const baseConfig: TasksConfiguration = {
        name: 'test-config',
        variables: [
          {
            id: 'var-id',
            value: 'base',
          },
        ],
      };

      const childConfig: TasksConfiguration = {
        name: 'test-template-2',
        extends: 'base.json',
        variables: [
          {
            id: 'var-id',
            value: 'override',
            override: 'merge',
          },
        ],
      };

      createConfigFile('base.json', baseConfig);
      const childPath = createConfigFile('child.json', childConfig);

      // This should not throw - it's a valid override
      const merged = await loadAndMergeConfiguration(childPath);
      expect(merged.variables).toHaveLength(1);
      expect(merged.variables![0]?.value).toBe('override');
    });

    it('should allow same ID when overriding prompts', async () => {
      const baseConfig: TasksConfiguration = {
        name: 'test-config',
        prompts: [
          {
            id: 'prompt-id',
            type: 'input',
            message: 'Base message',
          },
        ],
      };

      const childConfig: TasksConfiguration = {
        name: 'test-template-3',
        extends: 'base.json',
        prompts: [
          {
            id: 'prompt-id',
            type: 'input',
            message: 'Override message',
            override: 'merge',
          },
        ],
      };

      createConfigFile('base.json', baseConfig);
      const childPath = createConfigFile('child.json', childConfig);

      // This should not throw - it's a valid override
      const merged = await loadAndMergeConfiguration(childPath);
      expect(merged.prompts).toHaveLength(1);
      expect(merged.prompts![0]?.message).toBe('Override message');
    });

    it('should allow same ID when overriding variables with replace strategy', async () => {
      const baseConfig: TasksConfiguration = {
        name: 'test-config',
        variables: [
          {
            id: 'var-id',
            value: 'base',
          },
        ],
      };

      const childConfig: TasksConfiguration = {
        name: 'test-template-4',
        extends: 'base.json',
        variables: [
          {
            id: 'var-id',
            value: 'replaced',
            override: 'replace',
          },
        ],
      };

      createConfigFile('base.json', baseConfig);
      const childPath = createConfigFile('child.json', childConfig);

      // This should not throw - it's a valid override
      const merged = await loadAndMergeConfiguration(childPath);
      expect(merged.variables).toHaveLength(1);
      expect(merged.variables![0]?.value).toBe('replaced');
      // Verify override field is removed
      expect(merged.variables![0]?.override).toBeUndefined();
    });

    it('should allow same ID when overriding prompts with replace strategy', async () => {
      const baseConfig: TasksConfiguration = {
        name: 'test-config',
        prompts: [
          {
            id: 'prompt-id',
            type: 'input',
            message: 'Base message',
            default: 'base default',
          },
        ],
      };

      const childConfig: TasksConfiguration = {
        name: 'test-template-5',
        extends: 'base.json',
        prompts: [
          {
            id: 'prompt-id',
            type: 'confirm',
            message: 'Replaced message',
            override: 'replace',
          },
        ],
      };

      createConfigFile('base.json', baseConfig);
      const childPath = createConfigFile('child.json', childConfig);

      // This should not throw - it's a valid override
      const merged = await loadAndMergeConfiguration(childPath);
      expect(merged.prompts).toHaveLength(1);
      expect(merged.prompts![0]?.message).toBe('Replaced message');
      expect(merged.prompts![0]?.type).toBe('confirm');
      // Verify override field is removed and base properties are completely replaced
      expect(merged.prompts![0]?.override).toBeUndefined();
      expect(merged.prompts![0]?.default).toBeUndefined(); // Should be completely replaced
    });

    it('should throw error when overriding variable without override strategy', () => {
      const baseConfig: TasksConfiguration = {
        name: 'test-config',
        variables: [
          {
            id: 'var-id',
            value: 'base',
          },
        ],
      };

      const childConfig: TasksConfiguration = {
        name: 'test-config',
        variables: [
          {
            id: 'var-id',
            value: 'override',
            // Missing override field - should throw error
          },
        ],
      };

      expect(() => mergeConfigurations([baseConfig, childConfig])).toThrow(
        'Variable ID conflict: "var-id" is defined in multiple templates.\n' +
          '  You must specify an override strategy: add "override": "merge" or "override": "replace" to the variable.\n' +
          '  Variable is being extended/overridden but no override strategy was specified.',
      );
    });

    it('should throw error when overriding prompt without override strategy', () => {
      const baseConfig: TasksConfiguration = {
        name: 'test-config',
        prompts: [
          {
            id: 'prompt-id',
            type: 'input',
            message: 'Base message',
          },
        ],
      };

      const childConfig: TasksConfiguration = {
        name: 'test-config',
        prompts: [
          {
            id: 'prompt-id',
            type: 'input',
            message: 'Override message',
            // Missing override field - should throw error
          },
        ],
      };

      expect(() => mergeConfigurations([baseConfig, childConfig])).toThrow(
        'Prompt ID conflict: "prompt-id" is defined in multiple templates.\n' +
          '  You must specify an override strategy: add "override": "merge" or "override": "replace" to the prompt.\n' +
          '  Prompt is being extended/overridden but no override strategy was specified.',
      );
    });

    it('should throw error with multiple templates having cross-type duplicates', () => {
      const base1: TasksConfiguration = {
        name: 'test-config',
        tasks: [
          {
            id: 'id1',
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
        variables: [
          {
            id: 'id1',
            value: 'test',
          },
        ],
      };

      expect(() => mergeConfigurations([base1, base2])).toThrow(
        'Duplicate ID "id1" found in variable. This ID is already used in task',
      );
    });

    it('should not throw when all IDs are unique across tasks, variables, and prompts', () => {
      const template: TasksConfiguration = {
        name: 'test-config',
        tasks: [
          {
            id: 'task-1',
            name: 'Task 1',
            description: 'Test task',
            required: true,
            enabled: true,
            type: 'write',
            config: {},
          },
        ],
        variables: [
          {
            id: 'var-1',
            value: 'test',
          },
        ],
        prompts: [
          {
            id: 'prompt-1',
            type: 'input',
            message: 'Enter value',
          },
        ],
      };

      expect(() => mergeConfigurations([template])).not.toThrow();
      const merged = mergeConfigurations([template]);
      expect(merged.tasks).toHaveLength(1);
      expect(merged.variables).toHaveLength(1);
      expect(merged.prompts).toHaveLength(1);
    });
  });
});
