/**
 * Tests for task executors
 *
 * Note: These tests focus on the task type configurations and execution logic.
 * Actual file system operations are tested with mocked or temporary directories.
 */

import type { CurrentConfigurationContext, TaskDefinition } from '../src/types';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getTestTempFilesDir } from './test-utils';

const TEST_DIR = getTestTempFilesDir('__test_executors__');

describe('task Executors', () => {
  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    // Change to test directory
    process.chdir(TEST_DIR);
  });

  afterEach(async () => {
    // Change back to original directory
    process.chdir(path.join(TEST_DIR, '..'));

    // Small delay to ensure file handles are released on Windows
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 100);
    });

    // Clean up test directory with retry logic for Windows
    if (fs.existsSync(TEST_DIR)) {
      let retries = 3;
      while (retries > 0) {
        try {
          fs.rmSync(TEST_DIR, {
            recursive: true,
            force: true,
            maxRetries: 5,
            retryDelay: 100,
          });
          break;
        } catch (error) {
          retries--;
          if (retries === 0) {
            console.warn(
              `Failed to clean up test directory: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          } else {
            await new Promise<void>((resolve) => {
              setTimeout(() => {
                resolve();
              }, 200);
            });
          }
        }
      }
    }
  });

  describe('registerBuiltInPlugins', () => {
    it('should register all built-in plugins', async () => {
      const { registerBuiltInPlugins } = await import('../src/task-executors');

      // Reset any existing registrations for clean test
      // Note: This is hard to test directly since plugins are global

      expect(() => registerBuiltInPlugins()).not.toThrow();
    });
  });

  describe('executeTask', () => {
    it('should execute a plugin task', async () => {
      const { executeTask } = await import('../src/task-executors');

      const task: TaskDefinition = {
        id: 'test-task',
        name: 'Test Task',
        type: 'create',
        config: {
          file: 'output.txt',
          template: 'test content',
        },
      };

      const config: CurrentConfigurationContext = {
        projectName: 'test',
      };

      // This should not throw for a valid plugin task
      await expect(executeTask(task, config)).resolves.not.toThrow();
    });

    it('should handle dry run mode', async () => {
      const { executeTask } = await import('../src/task-executors');

      const task: TaskDefinition = {
        id: 'test-task',
        name: 'Test Task',
        type: 'create',
        config: {
          file: 'output.txt',
          template: 'test content',
        },
      };

      const config: CurrentConfigurationContext = {
        projectName: 'test',
      };

      // Dry run should not throw
      await expect(executeTask(task, config, true)).resolves.not.toThrow();
    });

    it('should throw error for unknown task type', async () => {
      const { executeTask } = await import('../src/task-executors');

      const task: TaskDefinition = {
        id: 'test-task',
        name: 'Test Task',
        type: 'unknown-type' as any,
        config: {},
      };

      const config: CurrentConfigurationContext = {
        projectName: 'test',
      };

      await expect(executeTask(task, config)).rejects.toThrow(
        'Unknown task type: unknown-type',
      );
    });
  });

  describe('runTask', () => {
    it('should run a task successfully', async () => {
      const { runTask } = await import('../src/task-executors');

      const task: TaskDefinition = {
        id: 'test-task',
        name: 'Test Task',
        type: 'create',
        config: {
          file: 'output.txt',
          template: 'test content',
        },
      };

      const config: CurrentConfigurationContext = {
        projectName: 'test',
      };

      const result = await runTask(task, config, 1, 1);
      expect(result).toBe(true);
    });

    it('should handle task failure', async () => {
      const { runTask } = await import('../src/task-executors');

      const task: TaskDefinition = {
        id: 'test-task',
        name: 'Test Task',
        type: 'unknown-type' as any,
        config: {},
      };

      const config: CurrentConfigurationContext = {
        projectName: 'test',
      };

      const result = await runTask(task, config, 1, 1);
      expect(result).toBe(false);
    });

    it('should handle dry run mode', async () => {
      const { runTask } = await import('../src/task-executors');

      const task: TaskDefinition = {
        id: 'test-task',
        name: 'Test Task',
        type: 'create',
        config: {
          file: 'output.txt',
          template: 'test content',
        },
      };

      const config: CurrentConfigurationContext = {
        projectName: 'test',
      };

      const result = await runTask(task, config, 1, 1, true);
      expect(result).toBe(true);
    });
  });
});
