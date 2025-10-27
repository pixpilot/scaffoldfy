/**
 * Tests for utility functions
 */

import { describe, expect, it, vi } from 'vitest';
import { createTaskPlugin } from '../../src/plugin-registry';

describe('utils', () => {
  describe('createTaskPlugin', () => {
    it('should create a plugin', () => {
      const executeFn = vi.fn();
      const plugin = createTaskPlugin('test-plugin', 'custom-task', executeFn);

      expect(plugin.name).toBe('test-plugin');
      expect(plugin.taskTypes).toEqual(['custom-task']);
      expect(plugin.execute).toBe(executeFn);
    });

    it('should create plugin with version', () => {
      const executeFn = vi.fn();
      const plugin = createTaskPlugin('test-plugin', 'custom-task', executeFn, {
        version: '1.0.0',
      });

      expect(plugin.version).toBe('1.0.0');
    });

    it('should create plugin with getDiff function', () => {
      const executeFn = vi.fn();
      const getDiffFn = vi.fn();
      const plugin = createTaskPlugin('test-plugin', 'custom-task', executeFn, {
        getDiff: getDiffFn,
      });

      expect(plugin.getDiff).toBe(getDiffFn);
    });

    it('should create plugin with validate function', () => {
      const executeFn = vi.fn();
      const validateFn = vi.fn();
      const plugin = createTaskPlugin('test-plugin', 'custom-task', executeFn, {
        validate: validateFn,
      });

      expect(plugin.validate).toBe(validateFn);
    });

    it('should create plugin with all options', () => {
      const executeFn = vi.fn();
      const getDiffFn = vi.fn();
      const validateFn = vi.fn();

      const plugin = createTaskPlugin('test-plugin', 'custom-task', executeFn, {
        version: '1.0.0',
        getDiff: getDiffFn,
        validate: validateFn,
      });

      expect(plugin.name).toBe('test-plugin');
      expect(plugin.version).toBe('1.0.0');
      expect(plugin.taskTypes).toEqual(['custom-task']);
      expect(plugin.execute).toBe(executeFn);
      expect(plugin.getDiff).toBe(getDiffFn);
      expect(plugin.validate).toBe(validateFn);
    });

    it('should create plugin without optional properties when not provided', () => {
      const executeFn = vi.fn();
      const plugin = createTaskPlugin('test-plugin', 'custom-task', executeFn);

      expect(plugin).not.toHaveProperty('version');
      expect(plugin).not.toHaveProperty('getDiff');
      expect(plugin).not.toHaveProperty('validate');
    });
  });
});
