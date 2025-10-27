/**
 * Tests for execution tasks
 */

import { describe, expect, it, vi } from 'vitest';
import { callHook } from '../../src/plugin-registry';
import { runTask } from '../../src/task-executors';
import { executeTasks } from '../../src/tasks/execution-tasks';
import { evaluateRequiredAsync, log, warn } from '../../src/utils';

// Mock dependencies
vi.mock('../../src/plugin-registry', () => ({
  callHook: vi.fn(),
}));

vi.mock('../../src/task-executors', () => ({
  runTask: vi.fn(),
}));

vi.mock('../../src/utils', () => ({
  evaluateRequiredAsync: vi.fn(),
  log: vi.fn(),
  warn: vi.fn(),
}));

// Mock process.exit
const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

describe('execution tasks', () => {
  const mockConfig = { test: 'config' };
  const mockOptions = { dryRun: false };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export executeTasks function', () => {
    expect(executeTasks).toBeDefined();
    expect(typeof executeTasks).toBe('function');
  });

  it('should execute all tasks successfully', async () => {
    const tasks = [
      { id: 'task1', name: 'task1', type: 'create' as const, config: {} },
      { id: 'task2', name: 'task2', type: 'write' as const, config: {} },
    ];

    vi.mocked(runTask).mockResolvedValue(true);
    vi.mocked(evaluateRequiredAsync).mockResolvedValue(true);

    await executeTasks(tasks, mockConfig, mockOptions);

    expect(callHook).toHaveBeenCalledWith('beforeAll', mockConfig);
    expect(callHook).toHaveBeenCalledWith('beforeTask', tasks[0], mockConfig);
    expect(callHook).toHaveBeenCalledWith('beforeTask', tasks[1], mockConfig);
    expect(callHook).toHaveBeenCalledWith('afterTask', tasks[0], mockConfig);
    expect(callHook).toHaveBeenCalledWith('afterTask', tasks[1], mockConfig);
    expect(callHook).toHaveBeenCalledWith('afterAll', mockConfig);

    expect(runTask).toHaveBeenCalledTimes(2);
    expect(runTask).toHaveBeenCalledWith(tasks[0], mockConfig, 1, 2, false);
    expect(runTask).toHaveBeenCalledWith(tasks[1], mockConfig, 2, 2, false);

    expect(log).toHaveBeenCalledWith('Completed: 2/2 tasks', 'success');
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('should handle task failure for required task', async () => {
    const tasks = [{ id: 'task1', name: 'task1', type: 'create' as const, config: {} }];

    vi.mocked(runTask).mockResolvedValue(false);
    vi.mocked(evaluateRequiredAsync).mockResolvedValue(true);

    await expect(executeTasks(tasks, mockConfig, mockOptions)).rejects.toThrow(
      'process.exit called',
    );

    expect(callHook).toHaveBeenCalledWith('beforeAll', mockConfig);
    expect(callHook).toHaveBeenCalledWith('beforeTask', tasks[0], mockConfig);
    expect(callHook).toHaveBeenCalledWith('onError', expect.any(Error), tasks[0]);
    expect(callHook).toHaveBeenCalledWith('afterAll', mockConfig);

    expect(runTask).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      '⚠️  Task "task1" failed, continuing with remaining tasks...',
    );
    expect(log).toHaveBeenCalledWith(
      '\n❌ Task execution completed with 1 error(s)',
      'error',
    );
    expect(log).toHaveBeenCalledWith('Completed: 0/1 tasks', 'info');
    expect(log).toHaveBeenCalledWith('Failed tasks: task1', 'error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should continue execution when non-required task fails', async () => {
    const tasks = [
      {
        id: 'task1',
        name: 'task1',
        type: 'create' as const,
        required: false,
        config: {},
      },
      { id: 'task2', name: 'task2', type: 'write' as const, config: {} },
    ];

    vi.mocked(runTask).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    vi.mocked(evaluateRequiredAsync).mockResolvedValue(false);

    await executeTasks(tasks, mockConfig, mockOptions);

    expect(callHook).toHaveBeenCalledWith('beforeAll', mockConfig);
    expect(callHook).toHaveBeenCalledWith('beforeTask', tasks[0], mockConfig);
    expect(callHook).toHaveBeenCalledWith('beforeTask', tasks[1], mockConfig);
    expect(callHook).toHaveBeenCalledWith('afterTask', tasks[1], mockConfig);
    expect(callHook).toHaveBeenCalledWith('afterAll', mockConfig);

    expect(runTask).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith(
      '⚠️  Task "task1" failed, continuing with remaining tasks...',
    );
    expect(log).toHaveBeenCalledWith('Completed: 1/2 tasks', 'success');
    expect(mockExit).not.toHaveBeenCalled();
  });

  it('should handle mixed task results', async () => {
    const tasks = [
      { id: 'task1', name: 'task1', type: 'create' as const, config: {} },
      { id: 'task2', name: 'task2', type: 'write' as const, required: false, config: {} },
      { id: 'task3', name: 'task3', type: 'mkdir' as const, config: {} },
    ];

    vi.mocked(runTask)
      .mockResolvedValueOnce(true) // task1 succeeds
      .mockResolvedValueOnce(false) // task2 fails (not required)
      .mockResolvedValueOnce(false); // task3 fails (required)

    vi.mocked(evaluateRequiredAsync)
      .mockResolvedValueOnce(false) // task2 not required
      .mockResolvedValueOnce(true); // task3 required

    await expect(executeTasks(tasks, mockConfig, mockOptions)).rejects.toThrow(
      'process.exit called',
    );

    expect(runTask).toHaveBeenCalledTimes(3);
    expect(callHook).toHaveBeenCalledWith('afterTask', tasks[0], mockConfig);
    expect(callHook).toHaveBeenCalledWith('onError', expect.any(Error), tasks[2]);
    expect(log).toHaveBeenCalledWith('Completed: 1/3 tasks', 'info');
    expect(log).toHaveBeenCalledWith('Failed tasks: task3', 'error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle dry run mode', async () => {
    const tasks = [{ id: 'task1', name: 'task1', type: 'create' as const, config: {} }];
    const dryRunOptions = { dryRun: true };

    vi.mocked(runTask).mockResolvedValue(true);

    await executeTasks(tasks, mockConfig, dryRunOptions);

    expect(runTask).toHaveBeenCalledWith(tasks[0], mockConfig, 1, 1, true);
  });

  it('should handle empty task list', async () => {
    await executeTasks([], mockConfig, mockOptions);

    expect(callHook).toHaveBeenCalledWith('beforeAll', mockConfig);
    expect(callHook).toHaveBeenCalledWith('afterAll', mockConfig);
    expect(runTask).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('Completed: 0/0 tasks', 'success');
  });
});
