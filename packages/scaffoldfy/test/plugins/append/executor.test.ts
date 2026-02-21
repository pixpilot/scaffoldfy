/**
 * Tests for append plugin executor
 */

import type { AppendConfig } from '../../../src/plugins/append/types';
import type { CurrentConfigurationContext } from '../../../src/types';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { executeAppend } from '../../../src/plugins/append/executor';
import { getTestTempFilesDir } from '../../test-utils';

const TEST_DIR = getTestTempFilesDir('__test_append__');

const mockConfig: CurrentConfigurationContext = {
  projectName: 'test-repo',
  shouldAppend: true,
};

describe('executeAppend', () => {
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
          });
          break;
        } catch (error) {
          retries--;
          if (retries === 0) {
            console.warn(`Failed to clean up test directory: ${error as Error}`);
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

  it('should append content to an existing file', async () => {
    // Create existing file
    fs.writeFileSync('test.txt', 'Existing content');

    const config: AppendConfig = {
      file: 'test.txt',
      content: 'Appended content',
    };

    await executeAppend(config, mockConfig);

    const content = fs.readFileSync('test.txt', 'utf-8');
    expect(content).toBe('Existing content\nAppended content');
  });

  it('should create file if it does not exist', async () => {
    const config: AppendConfig = {
      file: 'new-file.txt',
      content: 'New content',
    };

    await executeAppend(config, mockConfig);

    expect(fs.existsSync('new-file.txt')).toBe(true);
    const content = fs.readFileSync('new-file.txt', 'utf-8');
    expect(content).toBe('New content');
  });

  it('should append with template interpolation', async () => {
    fs.writeFileSync('test.txt', 'Project:');

    const config: AppendConfig = {
      file: 'test.txt',
      template: ' {{projectName}}',
    };

    await executeAppend(config, mockConfig);

    const content = fs.readFileSync('test.txt', 'utf-8');
    expect(content).toBe('Project:\n test-repo');
  });

  it('should not add newline if file ends with newline', async () => {
    fs.writeFileSync('test.txt', 'Line 1\n');

    const config: AppendConfig = {
      file: 'test.txt',
      content: 'Line 2',
    };

    await executeAppend(config, mockConfig);

    const content = fs.readFileSync('test.txt', 'utf-8');
    expect(content).toBe('Line 1\nLine 2');
  });

  it('should add newline if file does not end with newline', async () => {
    fs.writeFileSync('test.txt', 'Line 1');

    const config: AppendConfig = {
      file: 'test.txt',
      content: 'Line 2',
    };

    await executeAppend(config, mockConfig);

    const content = fs.readFileSync('test.txt', 'utf-8');
    expect(content).toBe('Line 1\nLine 2');
  });

  it('should respect newline: false option', async () => {
    fs.writeFileSync('test.txt', 'Text');

    const config: AppendConfig = {
      file: 'test.txt',
      content: 'More',
      newline: false,
    };

    await executeAppend(config, mockConfig);

    const content = fs.readFileSync('test.txt', 'utf-8');
    expect(content).toBe('TextMore');
  });

  it('should append content from templateFile', async () => {
    fs.writeFileSync('test.txt', 'Start');
    fs.writeFileSync('template.txt', 'Template content');

    const config: AppendConfig = {
      file: 'test.txt',
      templateFile: 'template.txt',
    };

    await executeAppend(config, mockConfig);

    const content = fs.readFileSync('test.txt', 'utf-8');
    expect(content).toBe('Start\nTemplate content');
  });

  it('should skip append when condition is false', async () => {
    fs.writeFileSync('test.txt', 'Original');

    const config: AppendConfig = {
      file: 'test.txt',
      content: 'Should not append',
      condition: 'shouldAppend === false',
    };

    await executeAppend(config, mockConfig);

    const content = fs.readFileSync('test.txt', 'utf-8');
    expect(content).toBe('Original');
  });

  it('should execute append when condition is true', async () => {
    fs.writeFileSync('test.txt', 'Original');

    const config: AppendConfig = {
      file: 'test.txt',
      content: 'Appended',
      condition: 'shouldAppend === true',
    };

    await executeAppend(config, mockConfig);

    const content = fs.readFileSync('test.txt', 'utf-8');
    expect(content).toBe('Original\nAppended');
  });

  it('should interpolate template variables in the file path', async () => {
    /*
     * Pre-create the parent directory and a file so appendFile can write
     * into it – appendFile creates the file but not the parent directory.
     */
    fs.mkdirSync('test-repo', { recursive: true });
    fs.writeFileSync('test-repo/notes.txt', 'existing\n');

    const config: AppendConfig = {
      file: '{{projectName}}/notes.txt',
      content: 'hello',
    };

    await executeAppend(config, mockConfig);

    expect(fs.existsSync('test-repo/notes.txt')).toBe(true);
    expect(fs.readFileSync('test-repo/notes.txt', 'utf-8')).toContain('hello');
  });
});
