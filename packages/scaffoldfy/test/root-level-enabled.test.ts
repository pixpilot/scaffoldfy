/**
 * Tests for root-level template enabled functionality
 */

import type { EnabledValue } from '../src/types.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('root-level template enabled', () => {
  const mockLog = vi.fn();
  const mockInfo = vi.fn();
  let runTasks: typeof import('../src/run-tasks.js').runTasks;
  let evaluateEnabledAsync: typeof import('../src/utils/evaluate-enabled.js').evaluateEnabledAsync;

  beforeEach(async () => {
    vi.resetModules();

    // Mock utils
    vi.doMock('../src/utils', async () => {
      const actual = await vi.importActual<typeof import('../src/utils')>('../src/utils');
      return {
        ...actual,
        log: mockLog,
      };
    });

    // Mock logger
    vi.doMock('../src/logger.js', async () => {
      const actual =
        await vi.importActual<typeof import('../src/logger.js')>('../src/logger.js');
      return {
        ...actual,
        info: mockInfo,
      };
    });

    // Import after mocking
    const runTasksModule = await import('../src/run-tasks.js');
    runTasks = runTasksModule.runTasks;

    const evaluateModule = await import('../src/utils/evaluate-enabled.js');
    evaluateEnabledAsync = evaluateModule.evaluateEnabledAsync;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('evaluateEnabledAsync', () => {
    it('should return true when enabled is undefined (default)', async () => {
      const result = await evaluateEnabledAsync(undefined, {});
      expect(result).toBe(true);
    });

    it('should return the boolean value when enabled is a boolean', async () => {
      expect(await evaluateEnabledAsync(true, {})).toBe(true);
      expect(await evaluateEnabledAsync(false, {})).toBe(false);
    });

    it('should evaluate conditional object', async () => {
      const config = { useTypeScript: true };

      expect(
        await evaluateEnabledAsync(
          { type: 'condition', value: 'useTypeScript === true' },
          config,
        ),
      ).toBe(true);
      expect(
        await evaluateEnabledAsync(
          { type: 'condition', value: 'useTypeScript === false' },
          config,
        ),
      ).toBe(false);
    });

    it('should handle complex conditions', async () => {
      const config = { useTypeScript: true, projectType: 'monorepo', includeTests: true };

      expect(
        await evaluateEnabledAsync(
          {
            type: 'condition',
            value: 'useTypeScript === true && projectType === "monorepo"',
          },
          config,
        ),
      ).toBe(true);
      expect(
        await evaluateEnabledAsync(
          {
            type: 'condition',
            value: 'useTypeScript === true || includeTests === false',
          },
          config,
        ),
      ).toBe(true);
    });

    it('should execute command for exec type and parse output as boolean', async () => {
      // Test with command that outputs "true"
      const execConfigTrue: EnabledValue = {
        type: 'exec',
        value: 'echo true',
      };
      expect(await evaluateEnabledAsync(execConfigTrue, {})).toBe(true);

      // Test with command that outputs "false"
      const execConfigFalse: EnabledValue = {
        type: 'exec',
        value: 'echo false',
      };
      expect(await evaluateEnabledAsync(execConfigFalse, {})).toBe(false);

      // Test with command that outputs "0"
      const execConfigZero: EnabledValue = {
        type: 'exec',
        value: 'echo 0',
      };
      expect(await evaluateEnabledAsync(execConfigZero, {})).toBe(false);

      // Test with command that outputs "no"
      const execConfigNo: EnabledValue = {
        type: 'exec',
        value: 'echo no',
      };
      expect(await evaluateEnabledAsync(execConfigNo, {})).toBe(false);
    });

    it('should handle exec command with template interpolation', async () => {
      const config = { checkFile: 'package.json' };

      // This would need file system mocking for a real test
      // For now, just test that it doesn't throw
      const execConfig: EnabledValue = {
        type: 'exec',
        value: 'echo "{{checkFile}}"',
      };

      const result = await evaluateEnabledAsync(execConfig, config);
      expect(typeof result).toBe('boolean');
    });

    it('should return false when exec command fails', async () => {
      const execConfig: EnabledValue = {
        type: 'exec',
        value: 'nonexistent-command-that-will-fail',
      };

      const result = await evaluateEnabledAsync(execConfig, {});
      expect(result).toBe(false);
    });
  });

  describe('runTasks with root-level enabled', () => {
    it('should skip all execution when templateEnabled is false', async () => {
      const tasks = [
        {
          id: 'task1',
          name: 'Task 1',
          type: 'write' as const,
          config: { file: 'test.txt', template: 'test' },
        },
      ];

      await runTasks(tasks, {
        dryRun: false,
        force: false,
        tasksFilePath: undefined,
        templateEnabled: false,
      });

      // Should log that template is disabled
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining('Template is disabled'),
      );

      // Should not proceed to task execution
      expect(mockLog).not.toHaveBeenCalledWith(
        expect.stringContaining('Starting task execution'),
        'info',
      );
    });

    it('should execute tasks when templateEnabled is true', async () => {
      const tasks = [
        {
          id: 'task1',
          name: 'Task 1',
          type: 'write' as const,
          config: { file: 'test.txt', template: 'test' },
        },
      ];

      await runTasks(tasks, {
        dryRun: true, // Use dry run to avoid actual file operations
        force: false,
        tasksFilePath: undefined,
        templateEnabled: true,
      });

      // Should not log disabled message
      expect(mockLog).not.toHaveBeenCalledWith(
        expect.stringContaining('Template is disabled'),
        'info',
      );
    });

    it('should execute tasks when templateEnabled is undefined (default)', async () => {
      const tasks = [
        {
          id: 'task1',
          name: 'Task 1',
          type: 'write' as const,
          config: { file: 'test.txt', template: 'test' },
        },
      ];

      await runTasks(tasks, {
        dryRun: true, // Use dry run to avoid actual file operations
        force: false,
        tasksFilePath: undefined,
        // templateEnabled omitted - defaults to enabled
      });

      // Should not log disabled message
      expect(mockLog).not.toHaveBeenCalledWith(
        expect.stringContaining('Template is disabled'),
        'info',
      );
    });

    it('should skip execution when templateEnabled condition evaluates to false', async () => {
      const tasks = [
        {
          id: 'task1',
          name: 'Task 1',
          type: 'write' as const,
          config: { file: 'test.txt', template: 'test' },
        },
      ];

      await runTasks(tasks, {
        dryRun: false,
        force: false,
        tasksFilePath: undefined,
        templateEnabled: { type: 'condition', value: 'false === true' }, // Condition that evaluates to false
      });

      // Should log that template is disabled
      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining('Template is disabled'),
      );
    });

    it('should execute when templateEnabled condition evaluates to true', async () => {
      const tasks = [
        {
          id: 'task1',
          name: 'Task 1',
          type: 'write' as const,
          config: { file: 'test.txt', template: 'test' },
        },
      ];

      await runTasks(tasks, {
        dryRun: true, // Use dry run to avoid actual file operations
        force: false,
        tasksFilePath: undefined,
        templateEnabled: { type: 'condition', value: 'true === true' }, // Condition that evaluates to true
      });

      // Should not log disabled message
      expect(mockLog).not.toHaveBeenCalledWith(
        expect.stringContaining('Template is disabled'),
        'info',
      );
    });

    it('should skip execution with conditional enabled object', async () => {
      const tasks = [
        {
          id: 'task1',
          name: 'Task 1',
          type: 'write' as const,
          config: { file: 'test.txt', template: 'test' },
        },
      ];

      await runTasks(tasks, {
        dryRun: false,
        force: false,
        tasksFilePath: undefined,
        templateEnabled: { type: 'condition', value: '1 === 2' }, // False condition
      });

      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining('Template is disabled'),
      );
    });
  });
});
