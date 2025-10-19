/**
 * Tests for task executors
 *
 * Note: These tests focus on the task type configurations and execution logic.
 * Actual file system operations are tested with mocked or temporary directories.
 */

import type {
  ConditionalDeleteConfig,
  DeleteConfig,
  InitConfig,
  RegexReplaceConfig,
  RenameConfig,
  ReplaceInFileConfig,
  TemplateConfig,
  UpdateJsonConfig,
} from '../src/types.js';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  executeConditionalDelete,
  executeDelete,
  executeRegexReplace,
  executeRename,
  executeReplaceInFile,
  executeTemplate,
  executeUpdateJson,
} from '../src/task-executors.js';

const TEST_DIR = path.join(process.cwd(), '__test_executors__');

const mockConfig: InitConfig = {
  repoName: 'test-repo',
  repoOwner: 'test-owner',
  repoUrl: 'https://github.com/test-owner/test-repo.git',
  author: 'Test Author',
  baseRepoUrl: 'https://github.com/test-owner/test-repo',
  defaultBundler: 'tsc',
  orgName: '@test-org',
  keepExamplePackages: false,
};

describe('task Executors', () => {
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
              `Failed to clean up test directory: ${error instanceof Error ? error.message : String(error)}`,
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

  describe('executeUpdateJson', () => {
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
          name: '{{repoName}}',
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
      expect(updatedContent.repository.url).toBe(mockConfig.repoUrl);
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
  });

  describe('executeTemplate', () => {
    it('should create file with interpolated template', async () => {
      const testFile = 'README.md';
      const config: TemplateConfig = {
        file: testFile,
        template: '# {{repoName}}\n\nAuthor: {{author}}',
      };

      await executeTemplate(config, mockConfig);

      const content = fs.readFileSync(testFile, 'utf-8');
      expect(content).toContain('# test-repo');
      expect(content).toContain('Author: Test Author');
    });

    it('should overwrite existing file', async () => {
      const testFile = 'README.md';
      fs.writeFileSync(testFile, 'Old content');

      const config: TemplateConfig = {
        file: testFile,
        template: 'New content for {{repoName}}',
      };

      await executeTemplate(config, mockConfig);

      const content = fs.readFileSync(testFile, 'utf-8');
      expect(content).toBe('New content for test-repo');
    });
  });

  describe('executeRegexReplace', () => {
    it('should replace text using regex', async () => {
      const testFile = 'test.txt';
      fs.writeFileSync(testFile, 'Hello old-name, welcome to old-name project!');

      const config: RegexReplaceConfig = {
        file: testFile,
        pattern: 'old-name',
        replacement: '{{repoName}}',
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
  });

  describe('executeReplaceInFile', () => {
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
          { find: 'OLD_REPO', replace: '{{repoName}}' },
          { find: 'OLD_OWNER', replace: '{{repoOwner}}' },
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
  });

  describe('executeDelete', () => {
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
  });

  describe('executeConditionalDelete', () => {
    it('should delete when condition is true', async () => {
      const testFile = 'conditional.txt';
      fs.writeFileSync(testFile, 'content');

      const config: ConditionalDeleteConfig = {
        condition: '!keepExamplePackages',
        paths: [testFile],
      };

      await executeConditionalDelete(config, mockConfig);

      expect(fs.existsSync(testFile)).toBe(false);
    });

    it('should not delete when condition is false', async () => {
      const testFile = 'conditional.txt';
      fs.writeFileSync(testFile, 'content');

      const config: ConditionalDeleteConfig = {
        condition: 'keepExamplePackages',
        paths: [testFile],
      };

      await executeConditionalDelete(config, mockConfig);

      expect(fs.existsSync(testFile)).toBe(true);
    });

    it('should not delete when condition is invalid', async () => {
      const testFile = 'conditional.txt';
      fs.writeFileSync(testFile, 'content');

      const config: ConditionalDeleteConfig = {
        condition: 'invalid condition {{',
        paths: [testFile],
      };

      await executeConditionalDelete(config, mockConfig);

      // Should not delete due to invalid condition
      expect(fs.existsSync(testFile)).toBe(true);
    });
  });

  describe('executeRename', () => {
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
        to: '{{repoName}}.txt',
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
  });
});
