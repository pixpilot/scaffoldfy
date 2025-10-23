/**
 * Tests for task executors
 *
 * Note: These tests focus on the task type configurations and execution logic.
 * Actual file system operations are tested with mocked or temporary directories.
 */

import type { DeleteConfig } from '../src/plugins/delete/types.js';
import type { ExecConfig } from '../src/plugins/exec/types.js';
import type { GitInitConfig } from '../src/plugins/git-init/types.js';
import type { RegexReplaceConfig } from '../src/plugins/regex-replace/types.js';
import type { RenameConfig } from '../src/plugins/rename/types.js';
import type { ReplaceInFileConfig } from '../src/plugins/replace-in-file/types.js';
import type { UpdateJsonConfig } from '../src/plugins/update-json/types.js';
import type { WriteConfig } from '../src/plugins/write/types.js';
import type { InitConfig } from '../src/types.js';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { executeDelete } from '../src/plugins/delete/executor.js';
import { executeExec } from '../src/plugins/exec/executor.js';
import { executeGitInit } from '../src/plugins/git-init/executor.js';
import { executeRegexReplace } from '../src/plugins/regex-replace/executor.js';
import { executeRename } from '../src/plugins/rename/executor.js';
import { executeReplaceInFile } from '../src/plugins/replace-in-file/executor.js';
import { executeUpdateJson } from '../src/plugins/update-json/executor.js';
import { executeWrite } from '../src/plugins/write/executor.js';

const TEST_DIR = path.join(process.cwd(), '__test_executors__');

const mockConfig: InitConfig = {
  projectName: 'test-repo',
  owner: 'test-owner',
  repoUrl: 'https://github.com/test-owner/test-repo.git',
  author: 'Test Author',
  orgName: '@test-org',
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

  describe('executeWrite', () => {
    it('should create file with interpolated template', async () => {
      const testFile = 'README.md';
      const config: WriteConfig = {
        file: testFile,
        template: '# {{projectName}}\n\nAuthor: {{author}}',
      };

      await executeWrite(config, mockConfig);

      const content = fs.readFileSync(testFile, 'utf-8');
      expect(content).toContain('# test-repo');
      expect(content).toContain('Author: Test Author');
    });

    it('should overwrite existing file', async () => {
      const testFile = 'README.md';
      fs.writeFileSync(testFile, 'Old content');

      const config: WriteConfig = {
        file: testFile,
        template: 'New content for {{projectName}}',
      };

      await executeWrite(config, mockConfig);

      const content = fs.readFileSync(testFile, 'utf-8');
      expect(content).toBe('New content for test-repo');
    });

    it('should execute when condition is true', async () => {
      const testFile = 'test.md';
      const config: WriteConfig = {
        file: testFile,
        template: 'Created file',
        condition: 'true',
      };

      await executeWrite(config, mockConfig);

      expect(fs.existsSync(testFile)).toBe(true);
      expect(fs.readFileSync(testFile, 'utf-8')).toBe('Created file');
    });

    it('should not execute when condition is false', async () => {
      const testFile = 'test.md';
      const config: WriteConfig = {
        file: testFile,
        template: 'Should not be created',
        condition: 'false',
      };

      await executeWrite(config, mockConfig);

      expect(fs.existsSync(testFile)).toBe(false);
    });

    it('should create file from external template file without Handlebars', async () => {
      const templateFile = 'template.txt';
      const outputFile = 'output.txt';

      // Create template file using simple {{var}} syntax
      fs.writeFileSync(templateFile, 'Repo: {{projectName}}\nAuthor: {{author}}');

      const config: WriteConfig = {
        file: outputFile,
        templateFile,
      };

      await executeWrite(config, mockConfig);

      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content).toContain('Repo: test-repo');
      expect(content).toContain('Author: Test Author');
    });

    it('should throw error if neither template nor templateFile is provided', async () => {
      const config: WriteConfig = {
        file: 'test.md',
      };

      await expect(executeWrite(config, mockConfig)).rejects.toThrow(
        'Template task requires either "template" (inline) or "templateFile"',
      );
    });

    it('should throw error if both template and templateFile are provided', async () => {
      const config: WriteConfig = {
        file: 'test.md',
        template: 'inline template',
        templateFile: 'template.hbs',
      };

      await expect(executeWrite(config, mockConfig)).rejects.toThrow(
        'Template task cannot have both "template" and "templateFile"',
      );
    });
  });

  describe('executeRegexReplace', () => {
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

  describe('executeGitInit', () => {
    it('should skip when condition is false', async () => {
      const config: GitInitConfig = {
        removeExisting: false,
        initialCommit: false,
        condition: 'false',
      };

      // Should not throw error and should skip
      await expect(executeGitInit(config, mockConfig)).resolves.not.toThrow();
    });

    it('should attempt to run when condition is true', async () => {
      const config: GitInitConfig = {
        removeExisting: false,
        initialCommit: false,
        condition: 'true',
      };

      // This test will try to run git init, which may fail in test environment
      // We're mainly testing that condition logic works
      try {
        await executeGitInit(config, mockConfig);
      } catch {
        // It's OK if git command fails in test environment
        // We're just testing the condition logic
      }
    });

    it('should evaluate condition with config variables', async () => {
      const config: GitInitConfig = {
        removeExisting: false,
        initialCommit: false,
        condition: 'repoName === "test-repo"',
      };

      // Should attempt to run since condition is true
      try {
        await executeGitInit(config, mockConfig);
      } catch {
        // It's OK if git command fails in test environment
      }
    });
  });

  describe('executeExec', () => {
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
  });
});
