/**
 * Tests for update-json plugin executor
 */

import type { UpdateJsonConfig } from '../../../src/plugins/update-json/types';
import type { InitConfig } from '../../../src/types';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { executeUpdateJson } from '../../../src/plugins/update-json/executor';

const TEST_DIR = path.join(process.cwd(), '__test_update_json__');

const mockConfig: InitConfig = {
  projectName: 'test-repo',
  owner: 'test-owner',
  repoUrl: 'https://github.com/test-owner/test-repo.git',
  author: 'Test Author',
  orgName: '@test-org',
};

describe('executeUpdateJson', () => {
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
              }, 200);
            });
          }
        }
      }
    }
  });

  it('should update simple properties in JSON file', async () => {
    const testFile = 'package.json';
    const initialContent = {
      name: 'old-name',
      version: '1.0.0',
    };

    fs.writeFileSync(testFile, JSON.stringify(initialContent, null, 2));

    const config: UpdateJsonConfig = {
      file: testFile,
      updates: {
        name: '{{projectName}}',
        author: '{{author}}',
      },
    };

    await executeUpdateJson(config, mockConfig);

    const updatedContent = JSON.parse(fs.readFileSync(testFile, 'utf-8'));
    expect(updatedContent.name).toBe('test-repo');
    expect(updatedContent.author).toBe('Test Author');
    expect(updatedContent.version).toBe('1.0.0');
  });

  it('should update nested properties in JSON file', async () => {
    const testFile = 'config.json';
    const initialContent = {
      repository: {
        type: 'git',
      },
    };

    fs.writeFileSync(testFile, JSON.stringify(initialContent, null, 2));

    const config: UpdateJsonConfig = {
      file: testFile,
      updates: {
        'repository.url': '{{repoUrl}}',
      },
    };

    await executeUpdateJson(config, mockConfig);

    const updatedContent = JSON.parse(fs.readFileSync(testFile, 'utf-8'));
    expect(updatedContent.repository.url).toBe(mockConfig['repoUrl']);
  });

  it('should handle non-string values', async () => {
    const testFile = 'config.json';
    const initialContent = {};

    fs.writeFileSync(testFile, JSON.stringify(initialContent, null, 2));

    const config: UpdateJsonConfig = {
      file: testFile,
      updates: {
        enabled: true,
        count: 42,
        items: ['a', 'b', 'c'],
      },
    };

    await executeUpdateJson(config, mockConfig);

    const updatedContent = JSON.parse(fs.readFileSync(testFile, 'utf-8'));
    expect(updatedContent.enabled).toBe(true);
    expect(updatedContent.count).toBe(42);
    expect(updatedContent.items).toEqual(['a', 'b', 'c']);
  });

  it('should interpolate nested object values with templates', async () => {
    const testFile = 'package.json';
    const initialContent = {
      name: 'old-name',
    };

    fs.writeFileSync(testFile, JSON.stringify(initialContent, null, 2));

    const config: UpdateJsonConfig = {
      file: testFile,
      updates: {
        name: '{{projectName}}',
        repository: {
          type: 'git',
          url: '{{repoUrl}}',
        },
        homepage: '{{repoUrl}}',
      },
    };

    await executeUpdateJson(config, mockConfig);

    const updatedContent = JSON.parse(fs.readFileSync(testFile, 'utf-8'));
    expect(updatedContent.name).toBe('test-repo');
    expect(updatedContent.repository).toEqual({
      type: 'git',
      url: 'https://github.com/test-owner/test-repo.git',
    });
    expect(updatedContent.homepage).toBe('https://github.com/test-owner/test-repo.git');
  });

  it('should execute when condition is true', async () => {
    const testFile = 'package.json';
    const initialContent = { name: 'old-name' };
    fs.writeFileSync(testFile, JSON.stringify(initialContent, null, 2));

    const config: UpdateJsonConfig = {
      file: testFile,
      updates: { name: 'new-name' },
      condition: 'true',
    };

    await executeUpdateJson(config, mockConfig);

    const updatedContent = JSON.parse(fs.readFileSync(testFile, 'utf-8'));
    expect(updatedContent.name).toBe('new-name');
  });

  it('should not execute when condition is false', async () => {
    const testFile = 'package.json';
    const initialContent = { name: 'old-name' };
    fs.writeFileSync(testFile, JSON.stringify(initialContent, null, 2));

    const config: UpdateJsonConfig = {
      file: testFile,
      updates: { name: 'new-name' },
      condition: 'false',
    };

    await executeUpdateJson(config, mockConfig);

    const updatedContent = JSON.parse(fs.readFileSync(testFile, 'utf-8'));
    expect(updatedContent.name).toBe('old-name');
  });

  it('should evaluate condition with config variables', async () => {
    const testFile = 'package.json';
    const initialContent = { name: 'old-name' };
    fs.writeFileSync(testFile, JSON.stringify(initialContent, null, 2));

    const config: UpdateJsonConfig = {
      file: testFile,
      updates: { name: 'new-name' },
      condition: 'projectName === "test-repo"',
    };

    await executeUpdateJson(config, mockConfig);

    const updatedContent = JSON.parse(fs.readFileSync(testFile, 'utf-8'));
    expect(updatedContent.name).toBe('new-name');
  });
});
