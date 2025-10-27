/**
 * Tests for write plugin executor
 */

import type { WriteConfig } from '../../../src/plugins/write/types';
import type { InitConfig } from '../../../src/types';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { executeWrite } from '../../../src/plugins/write/executor';

const TEST_DIR = path.join(process.cwd(), '__test_write__');

const mockConfig: InitConfig = {
  projectName: 'test-repo',
  owner: 'test-owner',
  repoUrl: 'https://github.com/test-owner/test-repo.git',
  author: 'Test Author',
  orgName: '@test-org',
};

describe('executeWrite', () => {
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

  it('should throw error if allowCreate is false and file does not exist', async () => {
    const testFile = 'nonexistent.md';
    const config: WriteConfig = {
      file: testFile,
      template: 'This should not be created',
      allowCreate: false,
    };

    await expect(executeWrite(config, mockConfig)).rejects.toThrow(
      `Write task failed: file does not exist (${testFile})`,
    );
  });

  it('should create file when allowCreate is true (default)', async () => {
    const testFile = 'newfile.md';
    const config: WriteConfig = {
      file: testFile,
      template: 'Created successfully',
      allowCreate: true,
    };

    await executeWrite(config, mockConfig);

    expect(fs.existsSync(testFile)).toBe(true);
    expect(fs.readFileSync(testFile, 'utf-8')).toBe('Created successfully');
  });

  it('should create directory if it does not exist', async () => {
    const testDir = 'nested/deep';
    const testFile = path.join(testDir, 'file.txt');
    const config: WriteConfig = {
      file: testFile,
      template: 'content',
    };

    await executeWrite(config, mockConfig);

    expect(fs.existsSync(testDir)).toBe(true);
    expect(fs.existsSync(testFile)).toBe(true);
    expect(fs.readFileSync(testFile, 'utf-8')).toBe('content');
  });
});
