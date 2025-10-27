/**
 * Tests for system-tasks dry-run functions
 */

import type { CurrentConfigurationContext } from '../../src/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getExecDiff, getGitInitDiff } from '../../src/dry-run/system-tasks';

// Mock dependencies
vi.mock('../../src/utils', () => ({
  evaluateCondition: vi.fn(() => true),
  interpolateTemplate: vi.fn((template) => template),
}));
vi.mock('../../src/dry-run/utils', async () => {
  const actual = await vi.importActual('../../src/dry-run/utils');
  return {
    ...actual,
    fileExists: vi.fn(() => true),
  };
});

const mockEvaluateCondition = vi.mocked(
  await import('../../src/utils'),
).evaluateCondition;
const mockInterpolateTemplate = vi.mocked(
  await import('../../src/utils'),
).interpolateTemplate;
const mockFileExists = vi.mocked(await import('../../src/dry-run/utils')).fileExists;

const mockConfig: CurrentConfigurationContext = {
  projectName: 'test-repo',
  owner: 'test-owner',
  repoUrl: 'https://github.com/test-owner/test-repo.git',
  author: 'Test Author',
  homepage: 'https://github.com/test-owner/test-repo',
  orgName: '@test-org',
};

describe('getGitInitDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFileExists.mockReturnValue(false);
    mockEvaluateCondition.mockReturnValue(true);
    mockInterpolateTemplate.mockImplementation((template) => template);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate diff for git-init task', () => {
    const config = {
      removeExisting: false,
      initialCommit: false,
    };

    const diff = getGitInitDiff(config);

    expect(diff).toContain('Would initialize git repository');
  });

  it('should handle initial commit', () => {
    const config = {
      removeExisting: false,
      initialCommit: true,
      message: 'Initial commit message',
    };

    const diff = getGitInitDiff(config);

    expect(diff).toContain('Would initialize git repository');
    expect(diff).toContain('Would create initial commit: "Initial commit message"');
  });

  it('should handle remove existing git', () => {
    mockFileExists.mockReturnValue(true);

    const config = {
      removeExisting: true,
      initialCommit: false,
    };

    const diff = getGitInitDiff(config);

    expect(diff).toContain('Would remove existing .git directory');
    expect(diff).toContain('Would initialize git repository');
  });

  it('should handle condition', () => {
    const config = {
      removeExisting: false,
      initialCommit: false,
      condition: 'false',
    };

    const diff = getGitInitDiff(config);

    expect(diff).toContain('Condition check skipped in dry-run');
  });
});

describe('getExecDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEvaluateCondition.mockReturnValue(true);
    mockInterpolateTemplate.mockImplementation((template) => template);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate diff for exec task', () => {
    const config = {
      command: 'echo hello',
    };

    const diff = getExecDiff(config, mockConfig);

    expect(diff).toContain('Would execute');
    expect(diff).toContain('Command: echo hello');
    expect(diff).toContain('Working directory:');
  });

  it('should handle custom cwd', () => {
    const config = {
      command: 'npm install',
      cwd: './packages/my-package',
    };

    const diff = getExecDiff(config, mockConfig);

    expect(diff).toContain('Command: npm install');
    expect(diff).toContain('Working directory: ./packages/my-package');
  });

  it('should handle condition not met', () => {
    mockEvaluateCondition.mockReturnValue(false);

    const config = {
      command: 'echo hello',
      condition: 'false',
    };

    const diff = getExecDiff(config, mockConfig);

    expect(diff).toContain('Condition not met - task would be skipped');
  });
});
