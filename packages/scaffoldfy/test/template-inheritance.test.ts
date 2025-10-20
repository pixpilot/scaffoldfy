/**
 * Tests for template inheritance functionality
 */

import type { TaskDefinition, TasksConfiguration } from '../src/types.js';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearTemplateCache,
  loadAndMergeTemplate,
  loadTasksWithInheritance,
  loadTemplate,
  mergeTemplates,
} from '../src/template-inheritance.js';

const testDir = path.join(process.cwd(), 'test-fixtures', 'inheritance');

// Helper to create test template files
function createTemplateFile(name: string, config: TasksConfiguration): string {
  const filePath = path.join(testDir, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  return filePath;
}

describe('template inheritance', () => {
  beforeEach(() => {
    // Clean up before each test
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    clearTemplateCache();
  });

  afterEach(() => {
    // Clean up after each test
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    clearTemplateCache();
  });

  describe('loadTemplate', () => {
    it('should load a simple template file', async () => {
      const config: TasksConfiguration = {
        tasks: [
          {
            id: 'task1',
            name: 'Task 1',
            description: 'Test task',
            required: true,
            enabled: true,
            type: 'template',
            config: { file: 'test.txt', template: 'Hello {{name}}' },
          },
        ],
      };

      const filePath = createTemplateFile('simple.json', config);
      const loaded = await loadTemplate(filePath);

      expect(loaded).toEqual(config);
    });

    it('should throw error for non-existent file', async () => {
      await expect(loadTemplate('non-existent.json')).rejects.toThrow(
        'Template file not found',
      );
    });

    it('should throw error for invalid JSON', async () => {
      const filePath = path.join(testDir, 'invalid.json');
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(filePath, 'invalid json');

      await expect(loadTemplate(filePath)).rejects.toThrow(
        'Failed to parse template file',
      );
    });

    it('should throw error for missing tasks array', async () => {
      const filePath = path.join(testDir, 'no-tasks.json');
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify({ other: 'data' }));

      await expect(loadTemplate(filePath)).rejects.toThrow("'tasks' array is required");
    });

    it('should detect circular dependencies', async () => {
      const config1: TasksConfiguration = {
        extends: 'template2.json',
        tasks: [],
      };
      const config2: TasksConfiguration = {
        extends: 'template1.json',
        tasks: [],
      };

      createTemplateFile('template1.json', config1);
      createTemplateFile('template2.json', config2);

      await expect(
        loadAndMergeTemplate(path.join(testDir, 'template1.json')),
      ).rejects.toThrow('Circular dependency detected');
    });
  });

  describe('mergeTemplates', () => {
    it('should merge tasks from multiple templates', () => {
      const template1: TasksConfiguration = {
        tasks: [
          {
            id: 'task1',
            name: 'Task 1',
            description: 'First task',
            required: true,
            enabled: true,
            type: 'template',
            config: {},
          },
        ],
      };

      const template2: TasksConfiguration = {
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

      const merged = mergeTemplates([template1, template2]);

      expect(merged.tasks).toHaveLength(2);
      expect(merged.tasks[0]?.id).toBe('task1');
      expect(merged.tasks[1]?.id).toBe('task2');
    });

    it('should override tasks with same ID', () => {
      const template1: TasksConfiguration = {
        tasks: [
          {
            id: 'task1',
            name: 'Original Name',
            description: 'Original',
            required: true,
            enabled: true,
            type: 'template',
            config: { value: 'old' },
          },
        ],
      };

      const template2: TasksConfiguration = {
        tasks: [
          {
            id: 'task1',
            name: 'Updated Name',
            description: 'Updated',
            required: false,
            enabled: false,
            type: 'delete',
            config: { value: 'new' },
          },
        ],
      };

      const merged = mergeTemplates([template1, template2]);

      expect(merged.tasks).toHaveLength(1);
      expect(merged.tasks[0]?.name).toBe('Updated Name');
      expect(merged.tasks[0]?.description).toBe('Updated');
      expect(merged.tasks[0]?.required).toBe(false);
      expect(merged.tasks[0]?.type).toBe('delete');
    });

    it('should merge dependencies arrays', () => {
      const task1: TaskDefinition = {
        id: 'task1',
        name: 'Task 1',
        description: 'Test',
        required: true,
        enabled: true,
        type: 'template',
        config: {},
        dependencies: ['dep1'],
      };

      const task2: TaskDefinition = {
        id: 'task1',
        name: 'Task 1 Updated',
        description: 'Test',
        required: true,
        enabled: true,
        type: 'template',
        config: {},
        dependencies: ['dep2', 'dep3'],
      };

      const merged = mergeTemplates([{ tasks: [task1] }, { tasks: [task2] }]);

      expect(merged.tasks[0]?.dependencies).toEqual(['dep1', 'dep2', 'dep3']);
    });

    it('should handle empty templates array', () => {
      const merged = mergeTemplates([]);
      expect(merged.tasks).toHaveLength(0);
    });

    it('should return single template as-is', () => {
      const template: TasksConfiguration = {
        tasks: [
          {
            id: 'task1',
            name: 'Task 1',
            description: 'Test',
            required: true,
            enabled: true,
            type: 'template',
            config: {},
          },
        ],
      };

      const merged = mergeTemplates([template]);
      expect(merged).toEqual(template);
    });
  });

  describe('loadAndMergeTemplate', () => {
    it('should load and merge templates with extends', async () => {
      const baseConfig: TasksConfiguration = {
        tasks: [
          {
            id: 'base-task',
            name: 'Base Task',
            description: 'From base',
            required: true,
            enabled: true,
            type: 'template',
            config: { base: true },
          },
        ],
      };

      const childConfig: TasksConfiguration = {
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

      createTemplateFile('base.json', baseConfig);
      const childPath = createTemplateFile('child.json', childConfig);

      const merged = await loadAndMergeTemplate(childPath);

      expect(merged.tasks).toHaveLength(2);
      expect(merged.tasks.find((t) => t.id === 'base-task')).toBeDefined();
      expect(merged.tasks.find((t) => t.id === 'child-task')).toBeDefined();
    });

    it('should support multiple extends', async () => {
      const base1: TasksConfiguration = {
        tasks: [
          {
            id: 'task1',
            name: 'Task 1',
            description: 'Test',
            required: true,
            enabled: true,
            type: 'template',
            config: {},
          },
        ],
      };

      const base2: TasksConfiguration = {
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

      createTemplateFile('base1.json', base1);
      createTemplateFile('base2.json', base2);
      const childPath = createTemplateFile('child.json', child);

      const merged = await loadAndMergeTemplate(childPath);

      expect(merged.tasks).toHaveLength(3);
    });

    it('should resolve relative paths correctly', async () => {
      fs.mkdirSync(path.join(testDir, 'subdir'), { recursive: true });

      const baseConfig: TasksConfiguration = {
        tasks: [
          {
            id: 'base',
            name: 'Base',
            description: 'Test',
            required: true,
            enabled: true,
            type: 'template',
            config: {},
          },
        ],
      };

      const childConfig: TasksConfiguration = {
        extends: '../base.json',
        tasks: [],
      };

      createTemplateFile('base.json', baseConfig);
      const childPath = createTemplateFile('subdir/child.json', childConfig);

      const merged = await loadAndMergeTemplate(childPath);

      expect(merged.tasks).toHaveLength(1);
      expect(merged.tasks[0]?.id).toBe('base');
    });
  });

  describe('loadTasksWithInheritance', () => {
    it('should load tasks with inheritance info', async () => {
      const baseConfig: TasksConfiguration = {
        tasks: [
          {
            id: 'base',
            name: 'Base',
            description: 'Test',
            required: true,
            enabled: true,
            type: 'template',
            config: {},
          },
        ],
      };

      const childConfig: TasksConfiguration = {
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

      createTemplateFile('base.json', baseConfig);
      const childPath = createTemplateFile('child.json', childConfig);

      const tasks = await loadTasksWithInheritance(childPath);

      expect(tasks).toHaveLength(2);
    });
  });

  describe('url-based template loading', () => {
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
              tasks: [
                {
                  id: 'remote-task',
                  name: 'Remote Task',
                  description: 'Task from remote URL',
                  required: true,
                  enabled: true,
                  type: 'template',
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
              extends: '../base.json',
              tasks: [
                {
                  id: 'child-task',
                  name: 'Child Task',
                  description: 'Child task',
                  required: true,
                  enabled: true,
                  type: 'template',
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
              extends: 'https://example.com/circular2.json',
              tasks: [],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (url === 'https://example.com/circular2.json') {
          return new Response(
            JSON.stringify({
              extends: 'https://example.com/circular1.json',
              tasks: [],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (url === 'https://example.com/with-local-extends.json') {
          return new Response(
            JSON.stringify({
              extends: './local-base.json',
              tasks: [
                {
                  id: 'remote-with-local',
                  name: 'Remote with local extends',
                  description: 'Test',
                  required: true,
                  enabled: true,
                  type: 'template',
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
              tasks: [
                {
                  id: 'local-base-task',
                  name: 'Local Base Task',
                  description: 'Base task',
                  required: true,
                  enabled: true,
                  type: 'template',
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

    it('should load template from HTTP URL', async () => {
      const config = await loadTemplate('https://example.com/base.json');

      expect(config.tasks).toHaveLength(1);
      expect(config.tasks[0]?.id).toBe('remote-task');
      expect(config.tasks[0]?.name).toBe('Remote Task');
    });

    it('should cache remote templates', async () => {
      const config1 = await loadTemplate('https://example.com/base.json');
      const config2 = await loadTemplate('https://example.com/base.json');

      expect(config1).toBe(config2); // Should be the same cached instance
    });

    it('should throw error for 404 responses', async () => {
      await expect(loadTemplate('https://example.com/notfound.json')).rejects.toThrow(
        'Failed to fetch template from https://example.com/notfound.json: 404',
      );
    });

    it('should throw error for invalid JSON from URL', async () => {
      await expect(loadTemplate('https://example.com/invalid.json')).rejects.toThrow(
        'Failed to parse template file',
      );
    });

    it('should support template inheritance from URLs', async () => {
      const config = await loadAndMergeTemplate(
        'https://example.com/templates/child.json',
      );

      expect(config.tasks).toHaveLength(2);
      expect(config.tasks.some((t) => t.id === 'remote-task')).toBe(true);
      expect(config.tasks.some((t) => t.id === 'child-task')).toBe(true);
    });

    it('should detect circular dependencies with URLs', async () => {
      await expect(
        loadAndMergeTemplate('https://example.com/circular1.json'),
      ).rejects.toThrow('Circular dependency detected');
    });

    it('should support mixed local and remote templates', async () => {
      const localConfig: TasksConfiguration = {
        extends: 'https://example.com/base.json',
        tasks: [
          {
            id: 'local-task',
            name: 'Local Task',
            description: 'Local task extending remote',
            required: true,
            enabled: true,
            type: 'template',
            config: {},
          },
        ],
      };

      const localPath = createTemplateFile('mixed.json', localConfig);
      const config = await loadAndMergeTemplate(localPath);

      expect(config.tasks).toHaveLength(2);
      expect(config.tasks.some((t) => t.id === 'remote-task')).toBe(true);
      expect(config.tasks.some((t) => t.id === 'local-task')).toBe(true);
    });

    it('should resolve relative URLs correctly', async () => {
      const config = await loadAndMergeTemplate(
        'https://example.com/with-local-extends.json',
      );

      expect(config.tasks).toHaveLength(2);
      expect(config.tasks.some((t) => t.id === 'local-base-task')).toBe(true);
      expect(config.tasks.some((t) => t.id === 'remote-with-local')).toBe(true);
    });

    it('should load tasks with inheritance from URL', async () => {
      const tasks = await loadTasksWithInheritance('https://example.com/base.json');

      expect(tasks).toHaveLength(1);
      expect(tasks[0]?.id).toBe('remote-task');
    });

    it('should support HTTPS URLs', async () => {
      const config = await loadTemplate('https://example.com/base.json');

      expect(config.tasks).toHaveLength(1);
    });

    it('should handle remote templates with multiple extends', async () => {
      // Mock a template that extends multiple remote templates
      const multiExtendsFetch = (async (input: any): Promise<Response> => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url === 'https://example.com/multi.json') {
          return new Response(
            JSON.stringify({
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
                  type: 'template',
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
              tasks: [
                {
                  id: 'base1-task',
                  name: 'Base 1 Task',
                  description: 'Task from base 1',
                  required: true,
                  enabled: true,
                  type: 'template',
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
              tasks: [
                {
                  id: 'base2-task',
                  name: 'Base 2 Task',
                  description: 'Task from base 2',
                  required: true,
                  enabled: true,
                  type: 'template',
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

      const config = await loadAndMergeTemplate('https://example.com/multi.json');

      expect(config.tasks).toHaveLength(3);
      expect(config.tasks.some((t) => t.id === 'base1-task')).toBe(true);
      expect(config.tasks.some((t) => t.id === 'base2-task')).toBe(true);
      expect(config.tasks.some((t) => t.id === 'multi-task')).toBe(true);
    });
  });
});
