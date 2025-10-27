/**
 * Tests for plugin system
 */

import type { InitConfig, TaskDefinition, TaskPlugin } from '../src/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  callHook,
  clearPlugins,
  createTaskPlugin,
  executePluginTask,
  getPlugin,
  getPluginForTaskType,
  getPluginTaskDiff,
  isPluginTaskType,
  listPlugins,
  registerHooks,
  registerPlugin,
  unregisterPlugin,
  validatePluginTask,
} from '../src/plugin';

describe('plugin system', () => {
  beforeEach(() => {
    clearPlugins();
  });

  afterEach(() => {
    clearPlugins();
  });

  describe('registerPlugin', () => {
    it('should register a valid plugin', () => {
      const plugin: TaskPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        taskTypes: ['custom-task'],
        execute: vi.fn(),
      };

      registerPlugin(plugin);

      expect(listPlugins()).toContain('test-plugin');
      expect(isPluginTaskType('custom-task')).toBe(true);
    });

    it('should throw error for plugin without name', () => {
      const plugin = {
        name: '',
        taskTypes: ['test'],
        execute: vi.fn(),
      } as TaskPlugin;

      expect(() => registerPlugin(plugin)).toThrow('Plugin name is required');
    });

    it('should throw error for plugin without task types', () => {
      const plugin = {
        name: 'test',
        taskTypes: [],
        execute: vi.fn(),
      } as TaskPlugin;

      expect(() => registerPlugin(plugin)).toThrow('must define at least one task type');
    });

    it('should throw error for plugin without execute function', () => {
      const plugin = {
        name: 'test',
        taskTypes: ['test'],
      } as unknown as TaskPlugin;

      expect(() => registerPlugin(plugin)).toThrow('must provide an execute function');
    });

    it('should throw error for duplicate plugin names', () => {
      const plugin1: TaskPlugin = {
        name: 'test-plugin',
        taskTypes: ['task1'],
        execute: vi.fn(),
      };

      const plugin2: TaskPlugin = {
        name: 'test-plugin',
        taskTypes: ['task2'],
        execute: vi.fn(),
      };

      registerPlugin(plugin1);
      expect(() => registerPlugin(plugin2)).toThrow('already registered');
    });

    it('should throw error for duplicate task types', () => {
      const plugin1: TaskPlugin = {
        name: 'plugin1',
        taskTypes: ['custom-task'],
        execute: vi.fn(),
      };

      const plugin2: TaskPlugin = {
        name: 'plugin2',
        taskTypes: ['custom-task'],
        execute: vi.fn(),
      };

      registerPlugin(plugin1);
      expect(() => registerPlugin(plugin2)).toThrow('already registered by plugin');
    });
  });

  describe('unregisterPlugin', () => {
    it('should unregister a plugin', () => {
      const plugin: TaskPlugin = {
        name: 'test-plugin',
        taskTypes: ['custom-task'],
        execute: vi.fn(),
      };

      registerPlugin(plugin);
      expect(listPlugins()).toContain('test-plugin');

      unregisterPlugin('test-plugin');
      expect(listPlugins()).not.toContain('test-plugin');
      expect(isPluginTaskType('custom-task')).toBe(false);
    });

    it('should handle unregistering non-existent plugin', () => {
      expect(() => unregisterPlugin('non-existent')).not.toThrow();
    });
  });

  describe('getPlugin', () => {
    it('should get a registered plugin', () => {
      const plugin: TaskPlugin = {
        name: 'test-plugin',
        taskTypes: ['custom-task'],
        execute: vi.fn(),
      };

      registerPlugin(plugin);
      const retrieved = getPlugin('test-plugin');

      expect(retrieved).toBe(plugin);
    });

    it('should return undefined for non-existent plugin', () => {
      expect(getPlugin('non-existent')).toBeUndefined();
    });
  });

  describe('getPluginForTaskType', () => {
    it('should get plugin by task type', () => {
      const plugin: TaskPlugin = {
        name: 'test-plugin',
        taskTypes: ['custom-task'],
        execute: vi.fn(),
      };

      registerPlugin(plugin);
      const retrieved = getPluginForTaskType('custom-task');

      expect(retrieved).toBe(plugin);
    });

    it('should return undefined for unknown task type', () => {
      expect(getPluginForTaskType('unknown')).toBeUndefined();
    });
  });

  describe('executePluginTask', () => {
    it('should execute a plugin task', async () => {
      const executeFn = vi.fn();
      const plugin: TaskPlugin = {
        name: 'test-plugin',
        taskTypes: ['custom-task'],
        execute: executeFn,
      };

      registerPlugin(plugin);

      const task: TaskDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Test task',
        required: true,
        enabled: true,
        type: 'custom-task' as 'write',
        config: { test: true },
      };

      const config: InitConfig = {
        repoName: 'test',
        repoOwner: 'owner',
        repoUrl: 'url',
        author: 'author',
        baseRepoUrl: 'base',
        orgName: 'org',
      };

      await executePluginTask(task, config, { dryRun: false });

      expect(executeFn).toHaveBeenCalledWith(task, config, { dryRun: false });
    });

    it('should throw error for unknown task type', async () => {
      const task: TaskDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        required: true,
        enabled: true,
        type: 'unknown' as 'write',
        config: {},
      };

      const config: InitConfig = {
        repoName: 'test',
        repoOwner: 'owner',
        repoUrl: 'url',
        author: 'author',
        baseRepoUrl: 'base',
        orgName: 'org',
      };

      await expect(executePluginTask(task, config, { dryRun: false })).rejects.toThrow(
        'No plugin found for task type',
      );
    });
  });

  describe('getPluginTaskDiff', () => {
    it('should get diff from plugin', async () => {
      const getDiffFn = vi.fn().mockResolvedValue('Test diff');
      const plugin: TaskPlugin = {
        name: 'test-plugin',
        taskTypes: ['custom-task'],
        execute: vi.fn(),
        getDiff: getDiffFn,
      };

      registerPlugin(plugin);

      const task: TaskDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        required: true,
        enabled: true,
        type: 'custom-task' as 'write',
        config: {},
      };

      const config: InitConfig = {
        repoName: 'test',
        repoOwner: 'owner',
        repoUrl: 'url',
        author: 'author',
        baseRepoUrl: 'base',
        orgName: 'org',
      };

      const diff = await getPluginTaskDiff(task, config);

      expect(diff).toBe('Test diff');
      expect(getDiffFn).toHaveBeenCalledWith(task, config);
    });

    it('should return undefined if plugin has no getDiff', async () => {
      const plugin: TaskPlugin = {
        name: 'test-plugin',
        taskTypes: ['custom-task'],
        execute: vi.fn(),
      };

      registerPlugin(plugin);

      const task: TaskDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        required: true,
        enabled: true,
        type: 'custom-task' as 'write',
        config: {},
      };

      const config: InitConfig = {
        repoName: 'test',
        repoOwner: 'owner',
        repoUrl: 'url',
        author: 'author',
        baseRepoUrl: 'base',
        orgName: 'org',
      };

      const diff = await getPluginTaskDiff(task, config);

      expect(diff).toBeUndefined();
    });
  });

  describe('validatePluginTask', () => {
    it('should validate plugin task', () => {
      const validateFn = vi.fn().mockReturnValue(['Error 1', 'Error 2']);
      const plugin: TaskPlugin = {
        name: 'test-plugin',
        taskTypes: ['custom-task'],
        execute: vi.fn(),
        validate: validateFn,
      };

      registerPlugin(plugin);

      const task: TaskDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        required: true,
        enabled: true,
        type: 'custom-task' as 'write',
        config: {},
      };

      const errors = validatePluginTask(task);

      expect(errors).toEqual(['Error 1', 'Error 2']);
      expect(validateFn).toHaveBeenCalledWith(task);
    });

    it('should return error for unknown task type', () => {
      const task: TaskDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        required: true,
        enabled: true,
        type: 'unknown' as 'write',
        config: {},
      };

      const errors = validatePluginTask(task);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('No plugin found');
    });

    it('should return empty array if no validate function', () => {
      const plugin: TaskPlugin = {
        name: 'test-plugin',
        taskTypes: ['custom-task'],
        execute: vi.fn(),
      };

      registerPlugin(plugin);

      const task: TaskDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        required: true,
        enabled: true,
        type: 'custom-task' as 'write',
        config: {},
      };

      const errors = validatePluginTask(task);

      expect(errors).toEqual([]);
    });
  });

  describe('createTaskPlugin', () => {
    it('should create a plugin', () => {
      const executeFn = vi.fn();
      const plugin = createTaskPlugin('test-plugin', 'custom-task', executeFn);

      expect(plugin.name).toBe('test-plugin');
      expect(plugin.taskTypes).toEqual(['custom-task']);
      expect(plugin.execute).toBe(executeFn);
    });

    it('should create plugin with options', () => {
      const executeFn = vi.fn();
      const getDiffFn = vi.fn();
      const validateFn = vi.fn();

      const plugin = createTaskPlugin('test-plugin', 'custom-task', executeFn, {
        version: '1.0.0',
        getDiff: getDiffFn,
        validate: validateFn,
      });

      expect(plugin.version).toBe('1.0.0');
      expect(plugin.getDiff).toBe(getDiffFn);
      expect(plugin.validate).toBe(validateFn);
    });
  });

  describe('lifecycle hooks', () => {
    it('should call beforeAll hook', async () => {
      const beforeAllFn = vi.fn();
      registerHooks({ beforeAll: beforeAllFn });

      const config: InitConfig = {
        repoName: 'test',
        repoOwner: 'owner',
        repoUrl: 'url',
        author: 'author',
        baseRepoUrl: 'base',
        orgName: 'org',
      };

      await callHook('beforeAll', config);

      expect(beforeAllFn).toHaveBeenCalledWith(config);
    });

    it('should call beforeTask hook', async () => {
      const beforeTaskFn = vi.fn();
      registerHooks({ beforeTask: beforeTaskFn });

      const task: TaskDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        required: true,
        enabled: true,
        type: 'write',
        config: {},
      };

      const config: InitConfig = {
        repoName: 'test',
        repoOwner: 'owner',
        repoUrl: 'url',
        author: 'author',
        baseRepoUrl: 'base',
        orgName: 'org',
      };

      await callHook('beforeTask', task, config);

      expect(beforeTaskFn).toHaveBeenCalledWith(task, config);
    });

    it('should call onError hook', async () => {
      const onErrorFn = vi.fn();
      registerHooks({ onError: onErrorFn });

      const error = new Error('Test error');
      const task: TaskDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        required: true,
        enabled: true,
        type: 'write',
        config: {},
      };

      await callHook('onError', error, task);

      expect(onErrorFn).toHaveBeenCalledWith(error, task);
    });

    it('should handle hooks that throw errors', async () => {
      const errorThrowingHook = vi.fn().mockRejectedValue(new Error('Hook error'));
      registerHooks({ beforeAll: errorThrowingHook });

      const config: InitConfig = {
        repoName: 'test',
        repoOwner: 'owner',
        repoUrl: 'url',
        author: 'author',
        baseRepoUrl: 'base',
        orgName: 'org',
      };

      // Should not throw
      await expect(callHook('beforeAll', config)).resolves.toBeUndefined();
    });
  });
});
