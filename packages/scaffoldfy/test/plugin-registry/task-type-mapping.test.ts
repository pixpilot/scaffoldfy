/**
 * Tests for task type mapping functions
 */

import type { TaskPlugin } from '../../src/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPlugins,
  getPluginForTaskType,
  isPluginTaskType,
  registerPlugin,
} from '../../src/plugin-registry';

describe('task type mapping', () => {
  beforeEach(() => {
    clearPlugins();
  });

  afterEach(() => {
    clearPlugins();
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

    it('should handle multiple task types for one plugin', () => {
      const plugin: TaskPlugin = {
        name: 'test-plugin',
        taskTypes: ['task1', 'task2', 'task3'],
        execute: vi.fn(),
      };

      registerPlugin(plugin);

      expect(getPluginForTaskType('task1')).toBe(plugin);
      expect(getPluginForTaskType('task2')).toBe(plugin);
      expect(getPluginForTaskType('task3')).toBe(plugin);
    });
  });

  describe('isPluginTaskType', () => {
    it('should return true for registered task types', () => {
      const plugin: TaskPlugin = {
        name: 'test-plugin',
        taskTypes: ['custom-task'],
        execute: vi.fn(),
      };

      registerPlugin(plugin);

      expect(isPluginTaskType('custom-task')).toBe(true);
    });

    it('should return false for unknown task types', () => {
      expect(isPluginTaskType('unknown')).toBe(false);
    });

    it('should return false after plugin is unregistered', () => {
      const plugin: TaskPlugin = {
        name: 'test-plugin',
        taskTypes: ['custom-task'],
        execute: vi.fn(),
      };

      registerPlugin(plugin);
      expect(isPluginTaskType('custom-task')).toBe(true);

      clearPlugins();
      expect(isPluginTaskType('custom-task')).toBe(false);
    });

    it('should handle multiple task types', () => {
      const plugin: TaskPlugin = {
        name: 'test-plugin',
        taskTypes: ['task1', 'task2'],
        execute: vi.fn(),
      };

      registerPlugin(plugin);

      expect(isPluginTaskType('task1')).toBe(true);
      expect(isPluginTaskType('task2')).toBe(true);
      expect(isPluginTaskType('task3')).toBe(false);
    });
  });
});
