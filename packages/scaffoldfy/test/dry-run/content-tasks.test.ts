/**
 * Tests for content-tasks dry-run functions
 */

import type { InitConfig } from '../../src/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getRegexReplaceDiff,
  getReplaceInFileDiff,
  getUpdateJsonDiff,
} from '../../src/dry-run/content-tasks';

// Mock dependencies
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
    generateDiff: vi.fn((original, modified) => [`- ${original}`, `+ ${modified}`]),
  };
});

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
const _mockGenerateDiff = vi.mocked(await import('../../src/dry-run/utils')).generateDiff;

const mockConfig: InitConfig = {
  projectName: 'test-repo',
  owner: 'test-owner',
  repoUrl: 'https://github.com/test-owner/test-repo.git',
  author: 'Test Author',
  homepage: 'https://github.com/test-owner/test-repo',
  orgName: '@test-org',
};

describe('getUpdateJsonDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFileExists.mockReturnValue(true);
    mockEvaluateCondition.mockReturnValue(true);
    mockInterpolateTemplate.mockImplementation((template) => template);
    mockReadFileContent.mockResolvedValue(
      JSON.stringify({
        name: 'old-name',
        version: '0.0.0',
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate diff for JSON updates', async () => {
    const config = {
      file: 'package.json',
      updates: {
        name: 'new-name',
        version: '1.0.0',
      },
    };

    const diff = await getUpdateJsonDiff(config, mockConfig);

    expect(diff).toContain('File: package.json');
    expect(diff).toContain('"name": "old-name"');
    expect(diff).toContain('"name": "new-name"');
  });

  it('should handle condition not met', async () => {
    mockEvaluateCondition.mockReturnValue(false);

    const config = {
      file: 'package.json',
      updates: {},
      condition: 'false',
    };

    const diff = await getUpdateJsonDiff(config, mockConfig);

    expect(diff).toContain('Condition not met - task would be skipped');
  });

  it('should handle file not found', async () => {
    mockFileExists.mockReturnValue(false);

    const config = {
      file: 'missing.json',
      updates: {},
    };

    const diff = await getUpdateJsonDiff(config, mockConfig);

    expect(diff).toContain('File not found: missing.json');
  });

  it('should handle errors', async () => {
    mockReadFileContent.mockRejectedValue(new Error('Read error'));

    const config = {
      file: 'package.json',
      updates: {},
    };

    const diff = await getUpdateJsonDiff(config, mockConfig);

    expect(diff).toContain('Read error');
  });
});

describe('getRegexReplaceDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFileExists.mockReturnValue(true);
    mockEvaluateCondition.mockReturnValue(true);
    mockInterpolateTemplate.mockImplementation((template) => template);
    mockReadFileContent.mockResolvedValue('Hello world');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate diff for regex replacement', async () => {
    const config = {
      file: 'test.txt',
      pattern: 'world',
      replacement: 'universe',
    };

    const diff = await getRegexReplaceDiff(config, mockConfig);

    expect(diff).toContain('File: test.txt');
    expect(diff).toContain('- Hello world');
    expect(diff).toContain('+ Hello universe');
  });

  it('should handle no changes', async () => {
    const config = {
      file: 'test.txt',
      pattern: 'notfound',
      replacement: 'replacement',
    };

    const diff = await getRegexReplaceDiff(config, mockConfig);

    expect(diff).toContain('No matches found');
  });

  it('should handle condition not met', async () => {
    mockEvaluateCondition.mockReturnValue(false);

    const config = {
      file: 'test.txt',
      pattern: 'world',
      replacement: 'universe',
      condition: 'false',
    };

    const diff = await getRegexReplaceDiff(config, mockConfig);

    expect(diff).toContain('Condition not met - task would be skipped');
  });

  it('should handle file not found', async () => {
    mockFileExists.mockReturnValue(false);

    const config = {
      file: 'missing.txt',
      pattern: 'pattern',
      replacement: 'replacement',
    };

    const diff = await getRegexReplaceDiff(config, mockConfig);

    expect(diff).toContain('File not found: missing.txt');
  });
});

describe('getReplaceInFileDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFileExists.mockReturnValue(true);
    mockEvaluateCondition.mockReturnValue(true);
    mockInterpolateTemplate.mockImplementation((template) => template);
    mockReadFileContent.mockResolvedValue('Hello world');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate diff for string replacement', async () => {
    const config = {
      file: 'test.txt',
      replacements: [{ find: 'world', replace: 'universe' }],
    };

    const diff = await getReplaceInFileDiff(config, mockConfig);

    expect(diff).toContain('File: test.txt');
    expect(diff).toContain('- Hello world');
    expect(diff).toContain('+ Hello universe');
  });

  it('should handle no changes', async () => {
    const config = {
      file: 'test.txt',
      replacements: [{ find: 'notfound', replace: 'replacement' }],
    };

    const diff = await getReplaceInFileDiff(config, mockConfig);

    expect(diff).toContain('No changes');
  });

  it('should handle condition not met', async () => {
    mockEvaluateCondition.mockReturnValue(false);

    const config = {
      file: 'test.txt',
      replacements: [{ find: 'world', replace: 'universe' }],
      condition: 'false',
    };

    const diff = await getReplaceInFileDiff(config, mockConfig);

    expect(diff).toContain('Condition not met - task would be skipped');
  });

  it('should handle file not found', async () => {
    mockFileExists.mockReturnValue(false);

    const config = {
      file: 'missing.txt',
      replacements: [{ find: 'search', replace: 'replace' }],
    };

    const diff = await getReplaceInFileDiff(config, mockConfig);

    expect(diff).toContain('File not found: missing.txt');
  });
});
