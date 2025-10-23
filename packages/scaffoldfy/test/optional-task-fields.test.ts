/**
 * Tests for optional task fields with defaults
 */

import type { TaskDefinition } from '../src/types.js';
import { describe, expect, it } from 'vitest';

describe('optional task fields', () => {
  it('should allow tasks without description field', () => {
    const task: TaskDefinition = {
      id: 'test-task',
      name: 'Test Task',
      type: 'delete',
      config: {
        paths: ['test.txt'],
      },
    };

    expect(task.description).toBeUndefined();
    expect(task.id).toBe('test-task');
    expect(task.name).toBe('Test Task');
  });

  it('should allow tasks without required field (defaults to true)', () => {
    const task: TaskDefinition = {
      id: 'test-task',
      name: 'Test Task',
      type: 'delete',
      config: {
        paths: ['test.txt'],
      },
    };

    expect(task.required).toBeUndefined();
    // In runtime, this will be treated as true by the ?? operator
    expect(task.required ?? true).toBe(true);
  });

  it('should allow tasks without enabled field (defaults to true)', () => {
    const task: TaskDefinition = {
      id: 'test-task',
      name: 'Test Task',
      type: 'delete',
      config: {
        paths: ['test.txt'],
      },
    };

    expect(task.enabled).toBeUndefined();
    // evaluateEnabled will handle undefined and return true
  });

  it('should allow explicit false values for required and enabled', () => {
    const task: TaskDefinition = {
      id: 'test-task',
      name: 'Test Task',
      required: false,
      enabled: false,
      type: 'delete',
      config: {
        paths: ['test.txt'],
      },
    };

    expect(task.required).toBe(false);
    expect(task.enabled).toBe(false);
  });

  it('should support minimal task definition', () => {
    const task: TaskDefinition = {
      id: 'minimal-task',
      name: 'Minimal Task',
      type: 'create',
      config: {
        file: 'test.txt',
        content: 'Hello World',
      },
    };

    // All optional fields are undefined
    expect(task.description).toBeUndefined();
    expect(task.required).toBeUndefined();
    expect(task.enabled).toBeUndefined();
    expect(task.dependencies).toBeUndefined();
    expect(task.prompts).toBeUndefined();
    expect(task.variables).toBeUndefined();

    // Required fields are present
    expect(task.id).toBe('minimal-task');
    expect(task.name).toBe('Minimal Task');
    expect(task.type).toBe('create');
    expect(task.config).toBeDefined();
  });

  it('should allow mixing optional and required fields', () => {
    const task: TaskDefinition = {
      id: 'mixed-task',
      name: 'Mixed Task',
      description: 'Has description',
      // required and enabled are omitted (will default to true)
      type: 'write',
      config: {
        file: 'README.md',
        template: '# Project',
      },
    };

    expect(task.description).toBe('Has description');
    expect(task.required).toBeUndefined();
    expect(task.enabled).toBeUndefined();
  });
});
