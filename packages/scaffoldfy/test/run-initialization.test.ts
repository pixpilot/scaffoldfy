/**
 * Tests for run-initialization module
 */

import type { InitConfig, TaskDefinition } from '../src/types.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectConfig, validateConfig } from '../src/config.js';
import { displayTasksDiff } from '../src/dry-run.js';
import { runInitialization } from '../src/run-initialization.js';
import { loadInitializationState, saveInitializationState } from '../src/state.js';
import { runTask } from '../src/task-executors.js';
import { topologicalSort } from '../src/task-resolver.js';
import { promptYesNo } from '../src/utils.js';

// Mock dependencies
vi.mock('../src/state.js');
vi.mock('../src/config.js');
vi.mock('../src/task-executors.js');
vi.mock('../src/task-resolver.js');
vi.mock('../src/utils.js');
vi.mock('../src/dry-run.js');
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

const mockLoadState = vi.mocked(loadInitializationState);
const mockSaveState = vi.mocked(saveInitializationState);
const mockCollectConfig = vi.mocked(collectConfig);
const mockValidateConfig = vi.mocked(validateConfig);
const mockRunTask = vi.mocked(runTask);
const mockTopologicalSort = vi.mocked(topologicalSort);
const mockPromptYesNo = vi.mocked(promptYesNo);
const mockDisplayTasksDiff = vi.mocked(displayTasksDiff);

const mockConfig: InitConfig = {
  repoName: 'test-repo',
  repoOwner: 'test-owner',
  repoUrl: 'https://github.com/test-owner/test-repo.git',
  author: 'Test Author',
  baseRepoUrl: 'https://github.com/test-owner/test-repo',

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
    type: 'template',
    config: {},
    dependencies: ['task1'],
  },
];

describe('runInitialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadState.mockReturnValue(null);
    mockCollectConfig.mockResolvedValue(mockConfig);
    mockValidateConfig.mockReturnValue([]);
    mockTopologicalSort.mockReturnValue(mockTasks);
    mockRunTask.mockResolvedValue(true);
    mockPromptYesNo.mockResolvedValue(true);
    mockDisplayTasksDiff.mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be a function', () => {
    expect(typeof runInitialization).toBe('function');
  });

  it('should proceed when not previously initialized', async () => {
    mockLoadState.mockReturnValue(null);

    await runInitialization(mockTasks, {
      dryRun: false,
      force: false,
      keepTasksFile: false,
      tasksFilePath: undefined,
    });

    expect(mockCollectConfig).toHaveBeenCalledWith(false);
    expect(mockValidateConfig).toHaveBeenCalledWith(mockConfig);
    expect(mockTopologicalSort).toHaveBeenCalledWith(mockTasks);
    expect(mockRunTask).toHaveBeenCalledTimes(2);
    expect(mockSaveState).toHaveBeenCalledWith(mockConfig, ['task1', 'task2'], false);
  });

  it('should prompt user when already initialized and not forced', async () => {
    const existingState = {
      initializedAt: new Date().toISOString(),
      config: mockConfig,
      completedTasks: ['old-task'],
      version: '1.0.0',
    };
    mockLoadState.mockReturnValue(existingState);
    mockPromptYesNo.mockResolvedValue(false);

    await expect(
      runInitialization(mockTasks, {
        dryRun: false,
        force: false,
        keepTasksFile: false,
        tasksFilePath: undefined,
      }),
    ).rejects.toThrow('Process exit');

    expect(mockPromptYesNo).toHaveBeenCalledWith(
      'Do you want to re-initialize? This may cause issues',
      false,
    );
  });

  it('should continue when already initialized and forced', async () => {
    const existingState = {
      initializedAt: new Date().toISOString(),
      config: mockConfig,
      completedTasks: ['old-task'],
      version: '1.0.0',
    };
    mockLoadState.mockReturnValue(existingState);

    await runInitialization(mockTasks, {
      dryRun: true,
      force: true,
      keepTasksFile: false,
      tasksFilePath: undefined,
    });

    expect(mockCollectConfig).toHaveBeenCalledWith(true);
    // In dry-run mode, runTask is not called - displayTasksDiff is called instead
    expect(mockRunTask).toHaveBeenCalledTimes(0);
    // In dry-run mode, saveState is not called either
    expect(mockSaveState).not.toHaveBeenCalled();
  });

  it('should exit when config validation fails', async () => {
    mockValidateConfig.mockReturnValue(['Invalid repo name']);

    await expect(
      runInitialization(mockTasks, {
        dryRun: false,
        force: false,
        keepTasksFile: false,
        tasksFilePath: undefined,
      }),
    ).rejects.toThrow('Process exit');
  });

  it('should handle task execution failure for required task', async () => {
    mockRunTask.mockResolvedValueOnce(false); // First task fails and is required

    await expect(
      runInitialization(mockTasks, {
        dryRun: false,
        force: false,
        keepTasksFile: false,
        tasksFilePath: undefined,
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

    await runInitialization(tasksWithOptionalFailure, {
      dryRun: false,
      force: false,
      keepTasksFile: false,
      tasksFilePath: undefined,
    });

    expect(mockRunTask).toHaveBeenCalledTimes(3);
    expect(mockSaveState).toHaveBeenCalledWith(mockConfig, ['task1', 'task2'], false);
  });

  it('should handle dry run mode', async () => {
    await runInitialization(mockTasks, {
      dryRun: true,
      force: false,
      keepTasksFile: false,
      tasksFilePath: undefined,
    });

    expect(mockCollectConfig).toHaveBeenCalledWith(true);
    // In dry-run mode, runTask is not called - displayTasksDiff is called instead
    expect(mockRunTask).toHaveBeenCalledTimes(0);
    // In dry-run mode, saveState is not called
    expect(mockSaveState).not.toHaveBeenCalled();
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

    await runInitialization(tasksWithDisabled, {
      dryRun: false,
      force: false,
      keepTasksFile: false,
      tasksFilePath: undefined,
    });

    expect(mockTopologicalSort).toHaveBeenCalledWith(mockTasks); // Only enabled tasks
  });
});
