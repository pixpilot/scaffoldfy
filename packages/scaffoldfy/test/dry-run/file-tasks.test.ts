/**
 * Tests for file-tasks dry-run functions
 */

import type { InitConfig, TaskDefinition } from '../../src/types.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getAppendDiff,
  getCopyDiff,
  getCreateDiff,
  getDeleteDiff,
  getMkdirDiff,
  getMoveDiff,
  getRenameDiff,
  getWriteDiff,
} from '../../src/dry-run/file-tasks.js';

// Mock dependencies
vi.mock('../../src/utils', () => ({
  evaluateCondition: vi.fn(() => true),
  interpolateTemplate: vi.fn((template) => template),
}));
vi.mock('../../src/template-utils.js', () => ({
  getTemplateSourceDescription: vi.fn(() => 'template'),
  hasInlineTemplate: vi.fn(() => true),
  processTemplate: vi.fn((template) => template),
}));
vi.mock('../../src/dry-run/utils.js', async () => {
  const actual = await vi.importActual('../../src/dry-run/utils.js');
  return {
    ...actual,
    readFileContent: vi.fn(),
    fileExists: vi.fn(() => true),
    generateDiff: vi.fn((original, modified) => [`- ${original}`, `+ ${modified}`]),
  };
});

const mockEvaluateCondition = vi.mocked(
  await import('../../src/utils'),
).evaluateCondition;
const mockInterpolateTemplate = vi.mocked(
  await import('../../src/utils'),
).interpolateTemplate;
const mockReadFileContent = vi.mocked(
  await import('../../src/dry-run/utils.js'),
).readFileContent;
const mockFileExists = vi.mocked(await import('../../src/dry-run/utils.js')).fileExists;
const mockGetTemplateSourceDescription = vi.mocked(
  await import('../../src/template-utils.js'),
).getTemplateSourceDescription;
const _mockHasInlineTemplate = vi.mocked(
  await import('../../src/template-utils.js'),
).hasInlineTemplate;
const mockProcessTemplate = vi.mocked(
  await import('../../src/template-utils.js'),
).processTemplate;

const mockConfig: InitConfig = {
  projectName: 'test-repo',
  owner: 'test-owner',
  repoUrl: 'https://github.com/test-owner/test-repo.git',
  author: 'Test Author',
  homepage: 'https://github.com/test-owner/test-repo',
  orgName: '@test-org',
};

describe('getWriteDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFileExists.mockReturnValue(false);
    mockEvaluateCondition.mockReturnValue(true);
    mockInterpolateTemplate.mockImplementation((template) => template);
    mockProcessTemplate.mockResolvedValue('processed content');
    mockGetTemplateSourceDescription.mockReturnValue('inline template');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate diff for write task', async () => {
    const config = {
      file: 'test.txt',
      template: 'Hello World',
    };

    const diff = await getWriteDiff(config, mockConfig);

    expect(diff).toContain('File: test.txt');
    expect(diff).toContain('New file would be created');
    expect(diff).toContain('Hello World');
  });

  it('should handle condition not met', async () => {
    mockEvaluateCondition.mockReturnValue(false);

    const config = {
      file: 'test.txt',
      template: 'Hello World',
      condition: 'false',
    };

    const diff = await getWriteDiff(config, mockConfig);

    expect(diff).toContain('Condition not met - task would be skipped');
  });

  it('should handle no template', async () => {
    const config = {
      file: 'test.txt',
      template: '',
    };

    const diff = await getWriteDiff(config, mockConfig);

    expect(diff).toContain('No template content provided');
  });
});

describe('getCreateDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFileExists.mockReturnValue(false);
    mockEvaluateCondition.mockReturnValue(true);
    mockInterpolateTemplate.mockImplementation((template) => template);
    mockProcessTemplate.mockResolvedValue('processed content');
    mockGetTemplateSourceDescription.mockReturnValue('inline template');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate diff for create task', async () => {
    const config = {
      file: 'test.txt',
      template: 'Hello World',
    };

    const task: TaskDefinition = {
      id: 'create',
      name: 'Create file',
      type: 'create',
      config,
      required: true,
      enabled: true,
    };

    const diff = await getCreateDiff(config, mockConfig, task);

    expect(diff).toContain('File: test.txt');
    expect(diff).toContain('New file would be created');
    expect(diff).toContain('processed content');
  });
});

describe('getAppendDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFileExists.mockReturnValue(true);
    mockEvaluateCondition.mockReturnValue(true);
    mockInterpolateTemplate.mockImplementation((template) => template);
    mockReadFileContent.mockResolvedValue('existing content\n');
    mockProcessTemplate.mockResolvedValue('appended content');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate diff for append task', async () => {
    const config = {
      file: 'test.txt',
      template: 'appended',
    };

    const task: TaskDefinition = {
      id: 'append',
      name: 'Append to file',
      type: 'append',
      config,
      required: true,
      enabled: true,
    };

    const diff = await getAppendDiff(config, mockConfig, task);

    expect(diff).toContain('File: test.txt');
    expect(diff).toContain('Would append content');
    expect(diff).toContain('appended content');
  });
});

describe('getDeleteDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFileExists.mockReturnValue(true);
    mockEvaluateCondition.mockReturnValue(true);
    mockInterpolateTemplate.mockImplementation((template) => template);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate diff for delete task', () => {
    const config = {
      paths: ['test.txt'],
    };

    const diff = getDeleteDiff(config, mockConfig);

    expect(diff).toContain('Would delete');
    expect(diff).toContain('test.txt');
  });

  it('should handle no files to delete', () => {
    mockFileExists.mockReturnValue(false);

    const config = {
      paths: ['missing.txt'],
    };

    const diff = getDeleteDiff(config, mockConfig);

    expect(diff).toContain('No files/directories to delete');
  });
});

describe('getRenameDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEvaluateCondition.mockReturnValue(true);
    mockInterpolateTemplate.mockImplementation((template) => template);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate diff for rename task', () => {
    mockFileExists.mockImplementation((path) => path !== 'new.txt');

    const config = {
      from: 'old.txt',
      to: 'new.txt',
    };

    const diff = getRenameDiff(config, mockConfig);

    expect(diff).toContain('Would rename: old.txt → new.txt');
  });
});

describe('getMoveDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEvaluateCondition.mockReturnValue(true);
    mockInterpolateTemplate.mockImplementation((template) => template);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate diff for move task', () => {
    mockFileExists.mockImplementation((path) => path !== 'new.txt');

    const config = {
      from: 'old.txt',
      to: 'new.txt',
    };

    const diff = getMoveDiff(config, mockConfig);

    expect(diff).toContain('Would move: old.txt → new.txt');
  });
});

describe('getCopyDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEvaluateCondition.mockReturnValue(true);
    mockInterpolateTemplate.mockImplementation((template) => template);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate diff for copy task', () => {
    mockFileExists.mockImplementation((path) => path !== 'dest.txt');

    const config = {
      from: 'source.txt',
      to: 'dest.txt',
    };

    const diff = getCopyDiff(config, mockConfig);

    expect(diff).toContain('Would copy file: source.txt → dest.txt');
  });
});

describe('getMkdirDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEvaluateCondition.mockReturnValue(true);
    mockInterpolateTemplate.mockImplementation((template) => template);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate diff for mkdir task', () => {
    mockFileExists.mockImplementation((path) => path !== 'new-dir');

    const config = {
      path: 'new-dir',
    };

    const diff = getMkdirDiff(config, mockConfig);

    expect(diff).toContain('Would create directory: new-dir');
  });
});
