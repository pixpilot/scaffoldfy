/**
 * Tests for replace-in-file plugin executor
 */

import type { ReplaceInFileConfig } from '../../../src/plugins/replace-in-file/types.js';
import type { InitConfig } from '../../../src/types.js';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { executeReplaceInFile } from '../../../src/plugins/replace-in-file/executor.js';

const TEST_DIR = path.join(process.cwd(), '__test_replace_in_file__');

const mockConfig: InitConfig = {
  projectName: 'test-repo',
  owner: 'test-owner',
  repoUrl: 'https://github.com/test-owner/test-repo.git',
  author: 'Test Author',
  orgName: '@test-org',
};

describe('executeReplaceInFile', () => {
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
              }, 100);
            });
          }
        }
      }
    }
  });

  it('should replace multiple strings in file', async () => {
    const testFile = 'test.txt';
    fs.writeFileSync(testFile, 'foo bar baz foo');

    const config: ReplaceInFileConfig = {
      file: testFile,
      replacements: [
        { find: 'foo', replace: 'FOO' },
        { find: 'bar', replace: 'BAR' },
      ],
    };

    await executeReplaceInFile(config, mockConfig);

    const content = fs.readFileSync(testFile, 'utf-8');
    expect(content).toBe('FOO BAR baz FOO');
  });

  it('should interpolate replacement values', async () => {
    const testFile = 'test.txt';
    fs.writeFileSync(testFile, 'Repository: OLD_REPO, Owner: OLD_OWNER');

    const config: ReplaceInFileConfig = {
      file: testFile,
      replacements: [
        { find: 'OLD_REPO', replace: '{{projectName}}' },
        { find: 'OLD_OWNER', replace: '{{owner}}' },
      ],
    };

    await executeReplaceInFile(config, mockConfig);

    const content = fs.readFileSync(testFile, 'utf-8');
    expect(content).toBe('Repository: test-repo, Owner: test-owner');
  });

  it('should skip non-existent files gracefully', async () => {
    const config: ReplaceInFileConfig = {
      file: 'non-existent.txt',
      replacements: [{ find: 'foo', replace: 'bar' }],
    };

    // Should not throw error
    await expect(executeReplaceInFile(config, mockConfig)).resolves.not.toThrow();
  });

  it('should execute when condition is true', async () => {
    const testFile = 'test.txt';
    fs.writeFileSync(testFile, 'old value');

    const config: ReplaceInFileConfig = {
      file: testFile,
      replacements: [{ find: 'old', replace: 'new' }],
      condition: 'true',
    };

    await executeReplaceInFile(config, mockConfig);

    const content = fs.readFileSync(testFile, 'utf-8');
    expect(content).toBe('new value');
  });

  it('should not execute when condition is false', async () => {
    const testFile = 'test.txt';
    fs.writeFileSync(testFile, 'old value');

    const config: ReplaceInFileConfig = {
      file: testFile,
      replacements: [{ find: 'old', replace: 'new' }],
      condition: 'false',
    };

    await executeReplaceInFile(config, mockConfig);

    const content = fs.readFileSync(testFile, 'utf-8');
    expect(content).toBe('old value');
  });
});
