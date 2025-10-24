/**
 * Tests for regex-replace plugin executor
 */

import type { RegexReplaceConfig } from '../../../src/plugins/regex-replace/types.js';
import type { InitConfig } from '../../../src/types.js';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { executeRegexReplace } from '../../../src/plugins/regex-replace/executor.js';

const TEST_DIR = path.join(process.cwd(), '__test_regex_replace__');

const mockConfig: InitConfig = {
  projectName: 'test-repo',
  owner: 'test-owner',
  repoUrl: 'https://github.com/test-owner/test-repo.git',
  author: 'Test Author',
  orgName: '@test-org',
};

describe('executeRegexReplace', () => {
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

  it('should replace text using regex', async () => {
    const testFile = 'test.txt';
    fs.writeFileSync(testFile, 'Hello old-name, welcome to old-name project!');

    const config: RegexReplaceConfig = {
      file: testFile,
      pattern: 'old-name',
      replacement: '{{projectName}}',
      flags: 'g',
    };

    await executeRegexReplace(config, mockConfig);

    const content = fs.readFileSync(testFile, 'utf-8');
    expect(content).toBe('Hello test-repo, welcome to test-repo project!');
  });

  it('should handle regex with special characters', async () => {
    const testFile = 'test.txt';
    fs.writeFileSync(testFile, 'Price: $100.00');

    const config: RegexReplaceConfig = {
      file: testFile,
      pattern: '\\$\\d+\\.\\d+',
      replacement: '$50.00',
      flags: 'g',
    };

    await executeRegexReplace(config, mockConfig);

    const content = fs.readFileSync(testFile, 'utf-8');
    expect(content).toBe('Price: $50.00');
  });

  it('should execute when condition is true', async () => {
    const testFile = 'test.txt';
    fs.writeFileSync(testFile, 'old text');

    const config: RegexReplaceConfig = {
      file: testFile,
      pattern: 'old',
      replacement: 'new',
      condition: 'true',
    };

    await executeRegexReplace(config, mockConfig);

    const content = fs.readFileSync(testFile, 'utf-8');
    expect(content).toBe('new text');
  });

  it('should not execute when condition is false', async () => {
    const testFile = 'test.txt';
    fs.writeFileSync(testFile, 'old text');

    const config: RegexReplaceConfig = {
      file: testFile,
      pattern: 'old',
      replacement: 'new',
      condition: 'false',
    };

    await executeRegexReplace(config, mockConfig);

    const content = fs.readFileSync(testFile, 'utf-8');
    expect(content).toBe('old text');
  });
});
