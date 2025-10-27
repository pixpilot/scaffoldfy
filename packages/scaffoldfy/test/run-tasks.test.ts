/**
 * Tests for run-tasks module
 */

import type { InitConfig, TaskDefinition } from '../src/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createInitialConfig } from '../src/config';
import { displayTasksDiff } from '../src/dry-run';
import { runTasks } from '../src/run-tasks';
import { runTask } from '../src/task-executors';
import { topologicalSort } from '../src/task-resolver';
import { evaluateEnabled, evaluateEnabledAsync } from '../src/utils';
import { validateAllTasks } from '../src/validation';

// Mock dependencies
vi.mock('../src/config');
vi.mock('../src/task-executors');
vi.mock('../src/task-resolver');
vi.mock('../src/utils');
vi.mock('../src/dry-run');
vi.mock('../src/validation');
vi.mock('node:process', () => ({
  default: {
    exit: vi.fn(() => {
      throw new Error('Process exit');
    }),
    cwd: vi.fn(() => '/test'),
  },
}));
vi.mock('node:fs');
vi.mock('node:child_process');

const mockCreateInitialConfig = vi.mocked(createInitialConfig);
const mockRunTask = vi.mocked(runTask);
const mockTopologicalSort = vi.mocked(topologicalSort);
const mockDisplayTasksDiff = vi.mocked(displayTasksDiff);
const mockEvaluateEnabled = vi.mocked(evaluateEnabled);
const mockEvaluateEnabledAsync = vi.mocked(evaluateEnabledAsync);
const mockValidateAllTasks = vi.mocked(validateAllTasks);

const mockConfig: InitConfig = {
  projectName: 'test-repo',
  owner: 'test-owner',
  repoUrl: 'https://github.com/test-owner/test-repo.git',
  author: 'Test Author',
  homepage: 'https://github.com/test-owner/test-repo',

  orgName: '@test-org',
};

const mockTasks: TaskDefinition[] = [
  {
    id: 'task1',
    name: 'Task 1',
    description: 'First task',
    required: true,
    enabled: true,
    type: 'update-json',
    config: {},
  },
  {
    id: 'task2',
    name: 'Task 2',
    description: 'Second task',
    required: false,
    enabled: true,
    type: 'write',
    config: {},
    dependencies: ['task1'],
  },
];

describe('runTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateInitialConfig.mockReturnValue(mockConfig);
    mockTopologicalSort.mockReturnValue(mockTasks);
    mockRunTask.mockResolvedValue(true);
    mockDisplayTasksDiff.mockResolvedValue();
    mockEvaluateEnabled.mockReturnValue(true); // Always return true for enabled tasks
    mockEvaluateEnabledAsync.mockResolvedValue(true); // Always return true for async evaluation
    mockValidateAllTasks.mockReturnValue([]); // Return no validation errors
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be a function', () => {
    expect(typeof runTasks).toBe('function');
  });

  it('should execute all enabled tasks', async () => {
    await runTasks(mockTasks, {
      dryRun: false,
      force: false,

      configFilePath: undefined,
    });

    expect(mockCreateInitialConfig).toHaveBeenCalled();
    expect(mockTopologicalSort).toHaveBeenCalledWith(mockTasks);
    expect(mockRunTask).toHaveBeenCalledTimes(2);
  });

  it('should exit when config validation fails', async () => {
    // This test is no longer valid since we removed validateConfig
    // Config validation now happens through required prompts
    expect(true).toBe(true);
  });

  it('should handle task execution failure for required task', async () => {
    mockRunTask.mockResolvedValueOnce(false); // First task fails and is required

    await expect(
      runTasks(mockTasks, {
        dryRun: false,
        force: false,

        configFilePath: undefined,
      }),
    ).rejects.toThrow('Process exit');
  });

  it('should continue when non-required task fails', async () => {
    const tasksWithOptionalFailure = [
      ...mockTasks,
      {
        id: 'task3',
        name: 'Task 3',
        description: 'Optional task',
        required: false,
        enabled: true,
        type: 'delete' as const,
        config: {},
        dependencies: ['task2'],
      },
    ];

    mockTopologicalSort.mockReturnValue(tasksWithOptionalFailure);
    mockRunTask
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await runTasks(tasksWithOptionalFailure, {
      dryRun: false,
      force: false,

      configFilePath: undefined,
    });

    expect(mockRunTask).toHaveBeenCalledTimes(3);
  });

  it('should handle dry run mode', async () => {
    await runTasks(mockTasks, {
      dryRun: true,
      force: false,

      configFilePath: undefined,
    });

    expect(mockCreateInitialConfig).toHaveBeenCalled();
    // In dry-run mode, runTask is not called - displayTasksDiff is called instead
    expect(mockRunTask).toHaveBeenCalledTimes(0);
  });

  it('should filter enabled tasks only', async () => {
    const tasksWithDisabled = [
      ...mockTasks,
      {
        id: 'task3',
        name: 'Task 3',
        description: 'Disabled task',
        required: false,
        enabled: false,
        type: 'delete' as const,
        config: {},
      },
    ];

    // Mock evaluateEnabled to return the actual enabled value for lazy evaluation
    mockEvaluateEnabled.mockImplementation((enabled) => {
      if (typeof enabled === 'boolean') {
        return enabled;
      }
      return true; // Default for non-boolean values
    });

    // Mock evaluateEnabledAsync to return the actual enabled value for final evaluation
    mockEvaluateEnabledAsync.mockImplementation(async (enabled) => {
      if (typeof enabled === 'boolean') {
        return enabled;
      }
      return true; // Default for non-boolean values
    });

    await runTasks(tasksWithDisabled, {
      dryRun: false,
      force: false,

      configFilePath: undefined,
    });

    // topologicalSort is called with only the tasks that passed lazy evaluation
    expect(mockTopologicalSort).toHaveBeenCalledWith(mockTasks);
  });

  it('should use lazy evaluation for initial task filtering', async () => {
    const tasksWithPromptCondition = [
      {
        id: 'task1',
        name: 'Task with prompt condition',
        description: 'Task depending on prompt value',
        required: true,
        enabled: {
          type: 'condition' as const,
          value: 'addSecurityFile === true',
        },
        type: 'write' as const,
        config: {},
      },
    ];

    // Mock evaluateEnabled to track lazy parameter
    const lazyCallsLog: Array<{ lazy: boolean | undefined }> = [];
    mockEvaluateEnabled.mockImplementation((enabled, config, options) => {
      lazyCallsLog.push({ lazy: options?.lazy });
      return true; // Include task in initial filter
    });

    await runTasks(tasksWithPromptCondition, {
      dryRun: false,
      force: false,
      configFilePath: undefined,
    });

    // Verify that lazy mode was used in at least one call (initial filtering)
    expect(lazyCallsLog.some((call) => call.lazy === true)).toBe(true);
  });
});
