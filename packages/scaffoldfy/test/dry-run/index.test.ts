/**
 * Tests for dry-run module
 */

import type { InitConfig, TaskDefinition } from '../../src/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { displayTasksDiff, getTaskDiff } from '../../src/dry-run/index';

// Mock file system operations
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));
vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(() => true),
    readFile: vi.fn(),
    accessSync: vi.fn(),
  },
  existsSync: vi.fn(() => true),
  readFile: vi.fn(),
  accessSync: vi.fn(),
}));
vi.mock('../../src/utils', () => ({
  evaluateCondition: vi.fn(() => true),
  interpolateTemplate: vi.fn((template) => template),
}));
vi.mock('../../src/utils/object', () => ({
  setNestedProperty: vi.fn(),
}));
vi.mock('../../src/dry-run/utils', async () => {
  const actual = await vi.importActual('../../src/dry-run/utils');
  return {
    ...actual,
    readFileContent: vi.fn(),
    fileExists: vi.fn(() => true),
  };
});

const mockReadFile = vi.mocked(await import('node:fs/promises')).readFile;
const mockExistsSync = vi.mocked(await import('node:fs')).existsSync;
const mockEvaluateCondition = vi.mocked(
  await import('../../src/utils'),
).evaluateCondition;
const mockInterpolateTemplate = vi.mocked(
  await import('../../src/utils'),
).interpolateTemplate;
const _mockSetNestedProperty = vi.mocked(
  await import('../../src/utils/object'),
).setNestedProperty;
const mockReadFileContent = vi.mocked(
  await import('../../src/dry-run/utils'),
).readFileContent;
const mockFileExists = vi.mocked(await import('../../src/dry-run/utils')).fileExists;

const mockConfig: InitConfig = {
  projectName: 'test-repo',
  owner: 'test-owner',
  repoUrl: 'https://github.com/test-owner/test-repo.git',
  author: 'Test Author',
  homepage: 'https://github.com/test-owner/test-repo',
  orgName: '@test-org',
};

describe('getTaskDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
    mockEvaluateCondition.mockReturnValue(true);
    mockInterpolateTemplate.mockImplementation((template: string) => template);
    mockFileExists.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate diff for update-json task', async () => {
    const task: TaskDefinition = {
      id: 'update-package',
      name: 'Update package.json',
      type: 'update-json',
      config: {
        file: 'package.json',
        updates: {
          name: 'new-name',
          version: '1.0.0',
        },
      },
      required: true,
      enabled: true,
    };

    mockReadFileContent.mockResolvedValue(
      JSON.stringify({
        name: 'old-name',
        version: '0.0.0',
      }),
    );

    const diff = await getTaskDiff(task, mockConfig);

    expect(diff).toContain('File: package.json');
    expect(diff).toContain('-   "name": "old-name"');
    expect(diff).toContain('+   "name": "new-name"');
  });

  it('should generate diff for write task', async () => {
    const task: TaskDefinition = {
      id: 'write-file',
      name: 'Write file',
      type: 'write',
      config: {
        file: 'test.txt',
        template: 'Hello World',
      },
      required: true,
      enabled: true,
    };

    mockExistsSync.mockReturnValue(false);
    mockFileExists.mockReturnValue(false);

    const diff = await getTaskDiff(task, mockConfig);

    expect(diff).toContain('File: test.txt');
    expect(diff).toContain('New file would be created');
    expect(diff).toContain('Hello World');
  });

  it('should generate diff for delete task', async () => {
    const task: TaskDefinition = {
      id: 'delete-file',
      name: 'Delete file',
      type: 'delete',
      config: {
        paths: ['test.txt'],
      },
      required: true,
      enabled: true,
    };

    const diff = await getTaskDiff(task, mockConfig);

    expect(diff).toContain('Would delete');
    expect(diff).toContain('test.txt');
  });

  it('should handle unknown task type', async () => {
    const task: TaskDefinition = {
      id: 'unknown-task',
      name: 'Unknown task',
      type: 'unknown' as any,
      config: {},
      required: true,
      enabled: true,
    };

    const diff = await getTaskDiff(task, mockConfig);

    expect(diff).toContain('Diff not available for task type: unknown');
  });

  it('should handle errors gracefully', async () => {
    const task: TaskDefinition = {
      id: 'error-task',
      name: 'Error task',
      type: 'update-json',
      config: {
        file: 'package.json',
        updates: {},
      },
      required: true,
      enabled: true,
    };

    mockReadFile.mockRejectedValue(new Error('File read error'));
    mockReadFileContent.mockRejectedValue(new Error('File read error'));

    const diff = await getTaskDiff(task, mockConfig);

    expect(diff).toContain('File read error');
  });
});

describe('displayTasksDiff', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('should display diffs for multiple tasks', async () => {
    const tasks: TaskDefinition[] = [
      {
        id: 'task1',
        name: 'Task 1',
        type: 'write',
        config: {
          file: 'file1.txt',
          template: 'content1',
        },
        required: true,
        enabled: true,
      },
      {
        id: 'task2',
        name: 'Task 2',
        type: 'delete',
        config: {
          file: 'file2.txt',
        },
        required: true,
        enabled: true,
      },
    ];

    mockExistsSync.mockReturnValue(false);
    mockFileExists.mockReturnValue(false);

    await displayTasksDiff(tasks, mockConfig);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('DRY RUN - Preview of changes'),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('▶ Task: Task 1'),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('▶ Task: Task 2'),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('No changes were applied (dry-run mode)'),
    );
  });
});
