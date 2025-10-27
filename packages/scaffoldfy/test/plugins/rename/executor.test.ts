/**
 * Tests for rename plugin executor
 */

import type { RenameConfig } from '../../../src/plugins/rename/types';
import type { InitConfig } from '../../../src/types';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { executeRename } from '../../../src/plugins/rename/executor';

const TEST_DIR = path.join(process.cwd(), '__test_rename__');

const mockConfig: InitConfig = {
  projectName: 'test-repo',
  owner: 'test-owner',
  repoUrl: 'https://github.com/test-owner/test-repo.git',
  author: 'Test Author',
  orgName: '@test-org',
};

describe('executeRename', () => {
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

  it('should rename file', async () => {
    const oldName = 'old.txt';
    const newName = 'new.txt';
    fs.writeFileSync(oldName, 'content');

    const config: RenameConfig = {
      from: oldName,
      to: newName,
    };

    await executeRename(config, mockConfig);

    expect(fs.existsSync(oldName)).toBe(false);
    expect(fs.existsSync(newName)).toBe(true);
  });

  it('should interpolate file names', async () => {
    const oldName = 'template.txt';
    fs.writeFileSync(oldName, 'content');

    const config: RenameConfig = {
      from: oldName,
      to: '{{projectName}}.txt',
    };

    await executeRename(config, mockConfig);

    expect(fs.existsSync(oldName)).toBe(false);
    expect(fs.existsSync('test-repo.txt')).toBe(true);
  });

  it('should handle non-existent source gracefully', async () => {
    const config: RenameConfig = {
      from: 'non-existent.txt',
      to: 'new.txt',
    };

    // Should not throw error
    await expect(executeRename(config, mockConfig)).resolves.not.toThrow();
  });

  it('should execute when condition is true', async () => {
    const oldName = 'old.txt';
    const newName = 'new.txt';
    fs.writeFileSync(oldName, 'content');

    const config: RenameConfig = {
      from: oldName,
      to: newName,
      condition: 'true',
    };

    await executeRename(config, mockConfig);

    expect(fs.existsSync(oldName)).toBe(false);
    expect(fs.existsSync(newName)).toBe(true);
  });

  it('should not execute when condition is false', async () => {
    const oldName = 'old.txt';
    fs.writeFileSync(oldName, 'content');

    const config: RenameConfig = {
      from: oldName,
      to: 'new.txt',
      condition: 'false',
    };

    await executeRename(config, mockConfig);

    expect(fs.existsSync(oldName)).toBe(true);
    expect(fs.existsSync('new.txt')).toBe(false);
  });
});
