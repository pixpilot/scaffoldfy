/**
 * Tests for exec plugin executor
 */

import type { ExecConfig } from '../../../src/plugins/exec/types';
import type { CurrentConfigurationContext } from '../../../src/types';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { executeExec } from '../../../src/plugins/exec/executor';
import { getTestTempFilesDir } from '../../test-utils';

const TEST_DIR = getTestTempFilesDir('__test_exec__');

const mockConfig: CurrentConfigurationContext = {
  projectName: 'test-repo',
  owner: 'test-owner',
  repoUrl: 'https://github.com/test-owner/test-repo.git',
  author: 'Test Author',
  orgName: '@test-org',
};

describe('executeExec', () => {
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

  it('should skip when condition is false', async () => {
    const config: ExecConfig = {
      command: 'echo "should not run"',
      condition: 'false',
    };

    // Should not execute command
    await expect(executeExec(config, mockConfig)).resolves.not.toThrow();
  });

  it('should execute when condition is true', async () => {
    const testFile = 'exec-test.txt';
    const config: ExecConfig = {
      command: `echo "test" > ${testFile}`,
      condition: 'true',
    };

    await executeExec(config, mockConfig);

    // Check that command was executed
    expect(fs.existsSync(testFile)).toBe(true);
  });

  it('should evaluate condition with config variables', async () => {
    const testFile = 'exec-conditional.txt';
    const config: ExecConfig = {
      command: `echo "conditional" > ${testFile}`,
      condition: 'author === "Test Author"',
    };

    await executeExec(config, mockConfig);

    expect(fs.existsSync(testFile)).toBe(true);
  });

  it('should interpolate variables in the command', async () => {
    const config: ExecConfig = {
      command: `node -e "require('fs').writeFileSync('{{projectName}}.txt', '')"`,
    };

    await executeExec(config, mockConfig);

    expect(fs.existsSync('test-repo.txt')).toBe(true);
  });

  it('should interpolate and quote args', async () => {
    const config: ExecConfig = {
      command: 'node',
      args: [
        '-e',
        `require('fs').writeFileSync(process.argv[1], process.argv[2])`,
        'exec-args.txt',
        '{{author}}',
      ],
    };

    await executeExec(config, mockConfig);

    expect(fs.readFileSync('exec-args.txt', 'utf-8')).toBe('Test Author');
  });

  it('should drop args that interpolate to an empty string', async () => {
    const config: ExecConfig = {
      command: 'node',
      args: [
        '-e',
        `require('fs').writeFileSync('exec-empty.txt', String(process.argv.length - 1))`,
        '{{missingValue}}',
        'kept',
      ],
    };

    await executeExec(config, mockConfig);

    expect(fs.readFileSync('exec-empty.txt', 'utf-8')).toBe('1');
  });
});
