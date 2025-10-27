/**
 * Tests for plugin registration functions
 */

import type { TaskPlugin } from '../../src/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPlugins,
  getPlugin,
  listPlugins,
  registerPlugin,
  unregisterPlugin,
} from '../../src/plugin-registry';

describe('plugin registration', () => {
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

  describe('listPlugins', () => {
    it('should list all registered plugins', () => {
      const plugin1: TaskPlugin = {
        name: 'plugin1',
        taskTypes: ['task1'],
        execute: vi.fn(),
      };

      const plugin2: TaskPlugin = {
        name: 'plugin2',
        taskTypes: ['task2'],
        execute: vi.fn(),
      };

      registerPlugin(plugin1);
      registerPlugin(plugin2);

      const plugins = listPlugins();
      expect(plugins).toContain('plugin1');
      expect(plugins).toContain('plugin2');
      expect(plugins).toHaveLength(2);
    });

    it('should return empty array when no plugins registered', () => {
      expect(listPlugins()).toEqual([]);
    });
  });

  describe('clearPlugins', () => {
    it('should clear all registered plugins', () => {
      const plugin: TaskPlugin = {
        name: 'test-plugin',
        taskTypes: ['custom-task'],
        execute: vi.fn(),
      };

      registerPlugin(plugin);
      expect(listPlugins()).toHaveLength(1);

      clearPlugins();
      expect(listPlugins()).toHaveLength(0);
    });
  });
});
