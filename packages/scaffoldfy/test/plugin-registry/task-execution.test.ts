/**
 * Tests for task execution functions
 */

import type {
  CurrentConfigurationContext,
  TaskDefinition,
  TaskPlugin,
} from '../../src/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPlugins,
  executePluginTask,
  getPluginTaskDiff,
  registerPlugin,
  validatePluginTask,
} from '../../src/plugin-registry';

describe('task execution', () => {
  beforeEach(() => {
    clearPlugins();
  });

  afterEach(() => {
    clearPlugins();
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

      const config: CurrentConfigurationContext = {
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

      const config: CurrentConfigurationContext = {
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

      const config: CurrentConfigurationContext = {
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

      const config: CurrentConfigurationContext = {
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

    it('should return undefined for unknown task type', async () => {
      const task: TaskDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        required: true,
        enabled: true,
        type: 'unknown' as 'write',
        config: {},
      };

      const config: CurrentConfigurationContext = {
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
});
