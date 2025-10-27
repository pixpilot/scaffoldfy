/**
 * Tests for create plugin executor
 */

import type { CreateConfig } from '../../../src/plugins/create/types';
import type { CurrentConfigurationContext, TaskDefinition } from '../../../src/types';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { executeCreate } from '../../../src/plugins/create/executor';
import { getTestTempFilesDir } from '../../test-utils';

const TEST_DIR = getTestTempFilesDir('__test_create__');

const mockConfig: CurrentConfigurationContext = {
  projectName: 'test-repo',
  owner: 'test-owner',
  repoUrl: 'https://github.com/test-owner/test-repo.git',
  author: 'Test Author',
  orgName: '@test-org',
};

describe('executeCreate', () => {
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

  it('should create a file with inline template', async () => {
    const config: CreateConfig = {
      file: 'test.txt',
      template: 'Hello {{projectName}}!',
    };

    await executeCreate(config, mockConfig);

    expect(fs.existsSync('test.txt')).toBe(true);
    const content = fs.readFileSync('test.txt', 'utf-8');
    expect(content).toBe('Hello test-repo!');
  });

  it('should create a file with templateFile from local path', async () => {
    // Create a template file
    fs.writeFileSync('template.txt', 'Template content: {{projectName}}');

    const config: CreateConfig = {
      file: 'output.txt',
      templateFile: 'template.txt',
    };

    await executeCreate(config, mockConfig);

    expect(fs.existsSync('output.txt')).toBe(true);
    const content = fs.readFileSync('output.txt', 'utf-8');
    expect(content).toBe('Template content: test-repo');
  });

  it('should resolve templateFile relative to task $sourceUrl (local path)', async () => {
    // Create a subdirectory with template
    fs.mkdirSync('templates', { recursive: true });
    fs.writeFileSync('templates/script', 'console.log("{{projectName}}");');

    const config: CreateConfig = {
      file: 'generated-script',
      templateFile: './script',
    };

    const task: TaskDefinition = {
      id: 'test-task',
      name: 'Test Task',
      description: 'Test',
      required: true,
      enabled: true,
      type: 'create',
      config,
      $sourceUrl: path.join(TEST_DIR, 'templates', 'config.json'), // Template is in templates/ dir
    };

    await executeCreate(config, mockConfig, task);

    expect(fs.existsSync('generated-script')).toBe(true);
    const content = fs.readFileSync('generated-script', 'utf-8');
    expect(content).toBe('console.log("test-repo");');
  });

  it('should resolve templateFile relative to task $sourceUrl (remote URL)', async () => {
    const config: CreateConfig = {
      file: 'remote-output.txt',
      templateFile: './remote-template.txt',
    };

    const task: TaskDefinition = {
      id: 'test-task',
      name: 'Test Task',
      description: 'Test',
      required: true,
      enabled: true,
      type: 'create',
      config,
      $sourceUrl: 'https://example.com/templates/config.json',
    };

    // Mock fetch for the remote template file
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      if (url === 'https://example.com/templates/remote-template.txt') {
        return new Response('Remote template: {{projectName}}', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      return new Response('Not Found', { status: 404 });
    }) as typeof fetch;

    try {
      await executeCreate(config, mockConfig, task);

      expect(fs.existsSync('remote-output.txt')).toBe(true);
      const content = fs.readFileSync('remote-output.txt', 'utf-8');
      expect(content).toBe('Remote template: test-repo');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should handle Handlebars templates with $sourceUrl', async () => {
    // Create a Handlebars template
    fs.mkdirSync('hbs-templates', { recursive: true });
    fs.writeFileSync(
      'hbs-templates/template.hbs',
      '{{#each items}}{{this}} {{/each}}- {{projectName}}',
    );

    const config: CreateConfig = {
      file: 'handlebars-output.txt',
      templateFile: './template.hbs',
    };

    const task: TaskDefinition = {
      id: 'test-task',
      name: 'Test Task',
      description: 'Test',
      required: true,
      enabled: true,
      type: 'create',
      config,
      $sourceUrl: path.join(TEST_DIR, 'hbs-templates', 'config.json'),
    };

    await executeCreate(config, mockConfig, task);

    expect(fs.existsSync('handlebars-output.txt')).toBe(true);
    const content = fs.readFileSync('handlebars-output.txt', 'utf-8');
    expect(content).toBe('- test-repo'); // No items array, so empty each loop
  });

  it('should skip creation if file already exists', async () => {
    // Create file first
    fs.writeFileSync('existing.txt', 'existing content');

    const config: CreateConfig = {
      file: 'existing.txt',
      template: 'new content',
    };

    await executeCreate(config, mockConfig);

    // File should still have original content
    const content = fs.readFileSync('existing.txt', 'utf-8');
    expect(content).toBe('existing content');
  });

  it('should create nested directories', async () => {
    const config: CreateConfig = {
      file: 'deep/nested/file.txt',
      template: 'content',
    };

    await executeCreate(config, mockConfig);

    expect(fs.existsSync('deep/nested/file.txt')).toBe(true);
    const content = fs.readFileSync('deep/nested/file.txt', 'utf-8');
    expect(content).toBe('content');
  });

  it('should skip execution when condition is false', async () => {
    const config: CreateConfig = {
      file: 'conditional.txt',
      template: 'should not create',
      condition: 'false',
    };

    await executeCreate(config, mockConfig);

    expect(fs.existsSync('conditional.txt')).toBe(false);
  });

  it('should throw error when neither template nor templateFile is provided', async () => {
    const config: CreateConfig = {
      file: 'test.txt',
    };

    await expect(executeCreate(config, mockConfig)).rejects.toThrow();
  });

  it('should throw error when both template and templateFile are provided', async () => {
    const config: CreateConfig = {
      file: 'test.txt',
      template: 'content',
      templateFile: 'template.txt',
    };

    await expect(executeCreate(config, mockConfig)).rejects.toThrow();
  });
});
