/**
 * Tests for delete plugin executor
 */

import type { DeleteConfig } from '../../../src/plugins/delete/types';
import type { InitConfig } from '../../../src/types';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { executeDelete } from '../../../src/plugins/delete/executor';

const TEST_DIR = path.join(process.cwd(), '__test_delete__');

const mockConfig: InitConfig = {
  projectName: 'test-repo',
  owner: 'test-owner',
  repoUrl: 'https://github.com/test-owner/test-repo.git',
  author: 'Test Author',
  orgName: '@test-org',
};

describe('executeDelete', () => {
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

  it('should delete existing files', async () => {
    const testFile = 'to-delete.txt';
    fs.writeFileSync(testFile, 'content');

    expect(fs.existsSync(testFile)).toBe(true);

    const config: DeleteConfig = {
      paths: [testFile],
    };

    await executeDelete(config);

    expect(fs.existsSync(testFile)).toBe(false);
  });

  it('should delete directories', async () => {
    const testDir = 'to-delete-dir';
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, 'file.txt'), 'content');

    expect(fs.existsSync(testDir)).toBe(true);

    const config: DeleteConfig = {
      paths: [testDir],
    };

    await executeDelete(config);

    expect(fs.existsSync(testDir)).toBe(false);
  });

  it('should not fail on non-existent paths', async () => {
    const config: DeleteConfig = {
      paths: ['non-existent.txt'],
    };

    // Should not throw error
    await expect(executeDelete(config)).resolves.not.toThrow();
  });

  it('should delete when condition is true', async () => {
    const testFile = 'conditional.txt';
    fs.writeFileSync(testFile, 'content');

    const config: DeleteConfig = {
      condition: 'true',
      paths: [testFile],
    };

    await executeDelete(config, mockConfig);

    expect(fs.existsSync(testFile)).toBe(false);
  });

  it('should not delete when condition is false', async () => {
    const testFile = 'conditional.txt';
    fs.writeFileSync(testFile, 'content');

    const config: DeleteConfig = {
      condition: 'false',
      paths: [testFile],
    };

    await executeDelete(config, mockConfig);

    expect(fs.existsSync(testFile)).toBe(true);
  });

  it('should not delete when condition is invalid', async () => {
    const testFile = 'conditional.txt';
    fs.writeFileSync(testFile, 'content');

    const config: DeleteConfig = {
      condition: 'invalid condition {{',
      paths: [testFile],
    };

    await executeDelete(config, mockConfig);

    // Should not delete due to invalid condition
    expect(fs.existsSync(testFile)).toBe(true);
  });

  it('should delete when negated prompt value condition is true', async () => {
    const testFile = 'example-package.txt';
    fs.writeFileSync(testFile, 'content');

    const config: DeleteConfig = {
      condition: '!keepExamplePackages',
      paths: [testFile],
    };

    // Create config with keepExamplePackages set to false
    const configWithPrompt: InitConfig = {
      ...mockConfig,
      keepExamplePackages: false,
    };

    await executeDelete(config, configWithPrompt);

    // Should delete because !keepExamplePackages evaluates to true when keepExamplePackages is false
    expect(fs.existsSync(testFile)).toBe(false);
  });

  it('should not delete when negated prompt value condition is false', async () => {
    const testFile = 'example-package.txt';
    fs.writeFileSync(testFile, 'content');

    const config: DeleteConfig = {
      condition: '!keepExamplePackages',
      paths: [testFile],
    };

    // Create config with keepExamplePackages set to true
    const configWithPrompt: InitConfig = {
      ...mockConfig,
      keepExamplePackages: true,
    };

    await executeDelete(config, configWithPrompt);

    // Should not delete because !keepExamplePackages evaluates to false when keepExamplePackages is true
    expect(fs.existsSync(testFile)).toBe(true);
  });
});
