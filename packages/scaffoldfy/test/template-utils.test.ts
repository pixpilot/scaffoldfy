/**
 * Tests for template-utils module
 */

import type { InitConfig, TaskDefinition } from '../src/types';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getTemplateSourceDescription,
  hasInlineTemplate,
  hasTemplateFile,
  processTemplate,
  shouldUseHandlebars,
  validateTemplateConfig,
} from '../src/template';
import { getTestTempFilesDir } from './test-utils';

const TEST_DIR = getTestTempFilesDir('__test_template_utils__');

const mockConfig: InitConfig = {
  projectName: 'test-project',
  author: 'Test Author',
};

describe('template-utils', () => {
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

  describe('hasInlineTemplate', () => {
    it('should return true when template is provided', () => {
      expect(hasInlineTemplate({ template: 'Hello' })).toBe(true);
    });

    it('should return false when template is undefined', () => {
      expect(hasInlineTemplate({})).toBe(false);
    });

    it('should return false when template is empty string', () => {
      expect(hasInlineTemplate({ template: '' })).toBe(false);
    });

    it('should return false when template is null', () => {
      expect(hasInlineTemplate({ template: null as unknown as string })).toBe(false);
    });
  });

  describe('hasTemplateFile', () => {
    it('should return true when templateFile is provided', () => {
      expect(hasTemplateFile({ templateFile: 'template.txt' })).toBe(true);
    });

    it('should return false when templateFile is undefined', () => {
      expect(hasTemplateFile({})).toBe(false);
    });

    it('should return false when templateFile is empty string', () => {
      expect(hasTemplateFile({ templateFile: '' })).toBe(false);
    });

    it('should return false when templateFile is null', () => {
      expect(hasTemplateFile({ templateFile: null as unknown as string })).toBe(false);
    });
  });

  describe('shouldUseHandlebars', () => {
    it('should return true for .hbs files', () => {
      expect(shouldUseHandlebars('template.hbs')).toBe(true);
    });

    it('should return false for non-.hbs files', () => {
      expect(shouldUseHandlebars('template.txt')).toBe(false);
      expect(shouldUseHandlebars('template')).toBe(false);
      expect(shouldUseHandlebars('template.md')).toBe(false);
    });

    it('should return true for .hbs files with path', () => {
      expect(shouldUseHandlebars('./templates/file.hbs')).toBe(true);
      expect(shouldUseHandlebars('/path/to/template.hbs')).toBe(true);
    });
  });

  describe('validateTemplateConfig', () => {
    it('should validate config with inline template', () => {
      const result = validateTemplateConfig({ template: 'Hello' });
      expect(result.isValid).toBe(true);
      expect(result.hasInlineTemplate).toBe(true);
      expect(result.hasTemplateFile).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('should validate config with templateFile', () => {
      const result = validateTemplateConfig({ templateFile: 'template.txt' });
      expect(result.isValid).toBe(true);
      expect(result.hasInlineTemplate).toBe(false);
      expect(result.hasTemplateFile).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject config with neither template nor templateFile', () => {
      const result = validateTemplateConfig({});
      expect(result.isValid).toBe(false);
      expect(result.hasInlineTemplate).toBe(false);
      expect(result.hasTemplateFile).toBe(false);
      expect(result.error).toContain('requires either');
    });

    it('should reject config with both template and templateFile', () => {
      const result = validateTemplateConfig({
        template: 'Hello',
        templateFile: 'template.txt',
      });
      expect(result.isValid).toBe(false);
      expect(result.hasInlineTemplate).toBe(true);
      expect(result.hasTemplateFile).toBe(true);
      expect(result.error).toContain('cannot have both');
    });
  });

  describe('getTemplateSourceDescription', () => {
    it('should describe inline template', () => {
      const desc = getTemplateSourceDescription({ template: 'Hello' });
      expect(desc).toBe('inline template');
    });

    it('should describe template file', () => {
      const desc = getTemplateSourceDescription({ templateFile: 'template.txt' });
      expect(desc).toBe('template file: template.txt');
    });

    it('should describe no template source', () => {
      const desc = getTemplateSourceDescription({});
      expect(desc).toBe('no template source');
    });
  });

  describe('processTemplate', () => {
    it('should process inline template with interpolation', async () => {
      const result = await processTemplate(
        { template: 'Hello {{projectName}}!' },
        mockConfig,
      );
      expect(result).toBe('Hello test-project!');
    });

    it('should process template file with interpolation', async () => {
      fs.writeFileSync('template.txt', 'Author: {{author}}');

      const result = await processTemplate({ templateFile: 'template.txt' }, mockConfig);
      expect(result).toBe('Author: Test Author');
    });

    it('should process template file relative to task $sourceUrl', async () => {
      // Create subdirectory with template
      fs.mkdirSync('templates', { recursive: true });
      fs.writeFileSync('templates/file.txt', 'Project: {{projectName}}');

      const task: TaskDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        required: true,
        enabled: true,
        type: 'create',
        config: {},
        $sourceUrl: path.join(TEST_DIR, 'templates', 'config.json'),
      };

      const result = await processTemplate(
        { templateFile: './file.txt' },
        mockConfig,
        task,
      );
      expect(result).toBe('Project: test-project');
    });

    it('should process Handlebars template', async () => {
      fs.writeFileSync('template.hbs', '{{#if author}}By: {{author}}{{/if}}');

      const result = await processTemplate({ templateFile: 'template.hbs' }, mockConfig);
      expect(result).toBe('By: Test Author');
    });

    it('should process Handlebars template with loops', async () => {
      fs.writeFileSync('list.hbs', '{{#each items}}{{this}}, {{/each}}');

      const config = {
        ...mockConfig,
        items: ['one', 'two', 'three'],
      };

      const result = await processTemplate({ templateFile: 'list.hbs' }, config);
      expect(result).toBe('one, two, three, ');
    });

    it('should disable Handlebars when option is false', async () => {
      fs.writeFileSync('template.hbs', '{{#if author}}By: {{author}}{{/if}}');

      const result = await processTemplate(
        { templateFile: 'template.hbs' },
        mockConfig,
        undefined,
        { enableHandlebars: false },
      );
      // With Handlebars disabled, it should use simple interpolation
      expect(result).toContain('{{#if author}}');
    });

    it('should resolve remote template files', async () => {
      const task: TaskDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        required: true,
        enabled: true,
        type: 'create',
        config: {},
        $sourceUrl: 'https://example.com/templates/config.json',
      };

      // Mock fetch
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async (url: string) => {
        if (url === 'https://example.com/templates/remote.txt') {
          return new Response('Remote: {{projectName}}', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          });
        }
        return new Response('Not Found', { status: 404 });
      }) as typeof fetch;

      try {
        const result = await processTemplate(
          { templateFile: './remote.txt' },
          mockConfig,
          task,
        );
        expect(result).toBe('Remote: test-project');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should use sourceUrl option over task.$sourceUrl', async () => {
      fs.mkdirSync('option-dir', { recursive: true });
      fs.writeFileSync('option-dir/file.txt', 'Option: {{projectName}}');

      const task: TaskDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        required: true,
        enabled: true,
        type: 'create',
        config: {},
        $sourceUrl: path.join(TEST_DIR, 'wrong-dir', 'config.json'),
      };

      const result = await processTemplate(
        { templateFile: './file.txt' },
        mockConfig,
        task,
        { sourceUrl: path.join(TEST_DIR, 'option-dir', 'config.json') },
      );
      expect(result).toBe('Option: test-project');
    });

    it('should throw error when no template content is available', async () => {
      await expect(processTemplate({}, mockConfig)).rejects.toThrow(
        'No template content available',
      );
    });
  });
});
