/**
 * Tests for run-configuration-sequentially module
 */

import type { ScaffoldfyConfiguration } from '../../src/types';
import { describe, expect, it, vi } from 'vitest';
import { runConfigurationSequentially } from '../../src/configurations/run-configuration-sequentially';

// Mock dependencies
vi.mock('../../src/configurations/process-config');
vi.mock('../../src/tasks');
vi.mock('../../src/tasks/execution-tasks');
vi.mock('../../src/dry-run');

const mockProcessConfig = vi.mocked(
  await import('../../src/configurations/process-config'),
).processConfig;
const mockValidateAndFilterTasks = vi.mocked(
  await import('../../src/tasks'),
).validateAndFilterTasks;
const mockSortTasksByDependencies = vi.mocked(
  await import('../../src/tasks'),
).sortTasksByDependencies;
const mockExecuteTasks = vi.mocked(
  await import('../../src/tasks/execution-tasks'),
).executeTasks;
const mockDisplayTasksDiff = vi.mocked(
  await import('../../src/dry-run'),
).displayTasksDiff;

describe('runConfigurationSequentially', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should run configurations sequentially', async () => {
    const configs: ScaffoldfyConfiguration[] = [
      {
        name: 'config1',
        tasks: [
          {
            id: 'task1',
            name: 'Task 1',
            type: 'write',
            config: {
              file: 'test1.txt',
              content: 'content1',
            },
          },
        ],
      },
      {
        name: 'config2',
        tasks: [
          {
            id: 'task2',
            name: 'Task 2',
            type: 'write',
            config: {
              file: 'test2.txt',
              content: 'content2',
            },
          },
        ],
      },
    ];

    mockProcessConfig.mockResolvedValue(true);
    const config1 = configs[0]!;
    const tasks = config1.tasks!;
    mockValidateAndFilterTasks.mockResolvedValue(tasks);
    mockSortTasksByDependencies.mockReturnValue(tasks);
    mockExecuteTasks.mockResolvedValue();

    const options = {
      dryRun: false,
      force: false,
      configFilePath: 'test.json',
    };

    await expect(runConfigurationSequentially(configs, options)).resolves.not.toThrow();

    expect(mockProcessConfig).toHaveBeenCalledTimes(2);
    expect(mockValidateAndFilterTasks).toHaveBeenCalledTimes(1);
    expect(mockExecuteTasks).toHaveBeenCalledTimes(1);
  });

  it('should handle dry run mode', async () => {
    const configs: ScaffoldfyConfiguration[] = [
      {
        name: 'config1',
        tasks: [
          {
            id: 'task1',
            name: 'Task 1',
            type: 'write',
            config: {
              file: 'test1.txt',
              content: 'content1',
            },
          },
        ],
      },
    ];

    mockProcessConfig.mockResolvedValue(true);
    mockValidateAndFilterTasks.mockResolvedValue(configs[0]!.tasks!);
    mockSortTasksByDependencies.mockReturnValue(configs[0]!.tasks!);
    mockDisplayTasksDiff.mockResolvedValue();

    const options = {
      dryRun: true,
      force: false,
      configFilePath: 'test.json',
    };

    await expect(runConfigurationSequentially(configs, options)).resolves.not.toThrow();

    expect(mockDisplayTasksDiff).toHaveBeenCalledTimes(1);
    expect(mockExecuteTasks).not.toHaveBeenCalled();
  });

  it('should skip configs that are not enabled', async () => {
    const configs: ScaffoldfyConfiguration[] = [
      {
        name: 'config1',
        tasks: [
          {
            id: 'task1',
            name: 'Task 1',
            type: 'write',
            config: {
              file: 'test1.txt',
              content: 'content1',
            },
          },
        ],
      },
    ];

    mockProcessConfig.mockResolvedValue(false); // Config not enabled

    const options = {
      dryRun: false,
      force: false,
      configFilePath: 'test.json',
    };

    await expect(runConfigurationSequentially(configs, options)).resolves.not.toThrow();

    expect(mockValidateAndFilterTasks).not.toHaveBeenCalled();
    expect(mockExecuteTasks).not.toHaveBeenCalled();
  });

  it('should handle configs with no tasks', async () => {
    const configs: ScaffoldfyConfiguration[] = [
      {
        name: 'config1',
        tasks: [],
      },
    ];

    mockProcessConfig.mockResolvedValue(true);

    const options = {
      dryRun: false,
      force: false,
      configFilePath: 'test.json',
    };

    await expect(runConfigurationSequentially(configs, options)).resolves.not.toThrow();

    // When no tasks are found, it should log and return early without calling validateAndFilterTasks
    expect(mockValidateAndFilterTasks).not.toHaveBeenCalled();
  });
});
