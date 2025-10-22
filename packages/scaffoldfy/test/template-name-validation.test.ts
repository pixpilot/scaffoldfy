/**
 * Tests for template name validation and dependencies field
 */

import type { TasksConfiguration } from '../src/types.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { InvalidTemplateError } from '../src/errors/template.js';
import { clearTemplateCache, loadTemplate } from '../src/template-inheritance.js';

describe('template name validation and dependencies', () => {
  let testDir: string;

  beforeEach(() => {
    // Create a temporary directory for test files
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffoldfy-test-'));
    clearTemplateCache();
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    clearTemplateCache();
  });

  function createTemplateFile(fileName: string, config: unknown): string {
    const filePath = path.join(testDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
    return filePath;
  }

  describe('template name field', () => {
    it('should require name field in template', async () => {
      const config = {
        tasks: [
          {
            id: 'task1',
            name: 'Task 1',
            description: 'Test task',
            required: true,
            enabled: true,
            type: 'template',
            config: { file: 'test.txt', template: 'Hello' },
          },
        ],
      };

      const filePath = createTemplateFile('no-name.json', config);

      await expect(loadTemplate(filePath)).rejects.toThrow(InvalidTemplateError);
      await expect(loadTemplate(filePath)).rejects.toThrow("'name' field is required");
    });

    it('should reject empty name field', async () => {
      const config = {
        name: '',
        tasks: [
          {
            id: 'task1',
            name: 'Task 1',
            description: 'Test task',
            required: true,
            enabled: true,
            type: 'template',
            config: { file: 'test.txt', template: 'Hello' },
          },
        ],
      };

      const filePath = createTemplateFile('empty-name.json', config);

      await expect(loadTemplate(filePath)).rejects.toThrow(InvalidTemplateError);
      await expect(loadTemplate(filePath)).rejects.toThrow("'name' field is required");
    });

    it('should reject whitespace-only name field', async () => {
      const config = {
        name: '   ',
        tasks: [
          {
            id: 'task1',
            name: 'Task 1',
            description: 'Test task',
            required: true,
            enabled: true,
            type: 'template',
            config: { file: 'test.txt', template: 'Hello' },
          },
        ],
      };

      const filePath = createTemplateFile('whitespace-name.json', config);

      await expect(loadTemplate(filePath)).rejects.toThrow(InvalidTemplateError);
      await expect(loadTemplate(filePath)).rejects.toThrow("'name' field is required");
    });

    it('should accept valid name field', async () => {
      const config: TasksConfiguration = {
        name: 'my-template',
        tasks: [
          {
            id: 'task1',
            name: 'Task 1',
            description: 'Test task',
            required: true,
            enabled: true,
            type: 'template',
            config: { file: 'test.txt', template: 'Hello' },
          },
        ],
      };

      const filePath = createTemplateFile('valid-name.json', config);

      const loaded = await loadTemplate(filePath);
      expect(loaded.name).toBe('my-template');
    });
  });

  describe('template name format validation', () => {
    it('should accept valid lowercase kebab-case names', async () => {
      const validNames = [
        'simple',
        'with-dash',
        'multiple-dashes-here',
        'with123numbers',
        'numbers123',
        '123numbers',
        'a',
        '1',
        'a-b-c-d-e',
      ];

      for (const name of validNames) {
        const config: TasksConfiguration = {
          name,
          tasks: [],
        };

        const filePath = createTemplateFile(`valid-${name}.json`, config);
        const loaded = await loadTemplate(filePath);
        expect(loaded.name).toBe(name);
      }
    });

    it('should reject names with uppercase letters', async () => {
      const config = {
        name: 'MyTemplate',
        tasks: [],
      };

      const filePath = createTemplateFile('uppercase-name.json', config);

      await expect(loadTemplate(filePath)).rejects.toThrow(InvalidTemplateError);
      await expect(loadTemplate(filePath)).rejects.toThrow(
        'must contain only lowercase letters, digits, and hyphens',
      );
    });

    it('should reject names with spaces', async () => {
      const config = {
        name: 'my template',
        tasks: [],
      };

      const filePath = createTemplateFile('space-name.json', config);

      await expect(loadTemplate(filePath)).rejects.toThrow(InvalidTemplateError);
      await expect(loadTemplate(filePath)).rejects.toThrow(
        'must contain only lowercase letters, digits, and hyphens',
      );
    });

    it('should reject names with underscores', async () => {
      const config = {
        name: 'my_template',
        tasks: [],
      };

      const filePath = createTemplateFile('underscore-name.json', config);

      await expect(loadTemplate(filePath)).rejects.toThrow(InvalidTemplateError);
      await expect(loadTemplate(filePath)).rejects.toThrow(
        'must contain only lowercase letters, digits, and hyphens',
      );
    });

    it('should reject names starting with hyphen', async () => {
      const config = {
        name: '-template',
        tasks: [],
      };

      const filePath = createTemplateFile('start-hyphen-name.json', config);

      await expect(loadTemplate(filePath)).rejects.toThrow(InvalidTemplateError);
      await expect(loadTemplate(filePath)).rejects.toThrow(
        'must contain only lowercase letters, digits, and hyphens',
      );
    });

    it('should reject names ending with hyphen', async () => {
      const config = {
        name: 'template-',
        tasks: [],
      };

      const filePath = createTemplateFile('end-hyphen-name.json', config);

      await expect(loadTemplate(filePath)).rejects.toThrow(InvalidTemplateError);
      await expect(loadTemplate(filePath)).rejects.toThrow(
        'must contain only lowercase letters, digits, and hyphens',
      );
    });

    it('should reject names with consecutive hyphens', async () => {
      const config = {
        name: 'my--template',
        tasks: [],
      };

      const filePath = createTemplateFile('consecutive-hyphens-name.json', config);

      await expect(loadTemplate(filePath)).rejects.toThrow(InvalidTemplateError);
      await expect(loadTemplate(filePath)).rejects.toThrow(
        'must contain only lowercase letters, digits, and hyphens',
      );
    });

    it('should reject names with special characters', async () => {
      const invalidNames = ['my@template', 'my.template', 'my!template', 'my#template'];

      for (const name of invalidNames) {
        const config = {
          name,
          tasks: [],
        };

        const filePath = createTemplateFile(`invalid-${name}.json`, config);

        await expect(loadTemplate(filePath)).rejects.toThrow(InvalidTemplateError);
        await expect(loadTemplate(filePath)).rejects.toThrow(
          'must contain only lowercase letters, digits, and hyphens',
        );
      }
    });
  });

  describe('template description field', () => {
    it('should accept optional description field', async () => {
      const config: TasksConfiguration = {
        name: 'my-template',
        description: 'This is a test template',
        tasks: [],
      };

      const filePath = createTemplateFile('with-description.json', config);

      const loaded = await loadTemplate(filePath);
      expect(loaded.name).toBe('my-template');
      expect(loaded.description).toBe('This is a test template');
    });

    it('should work without description field', async () => {
      const config: TasksConfiguration = {
        name: 'my-template',
        tasks: [],
      };

      const filePath = createTemplateFile('no-description.json', config);

      const loaded = await loadTemplate(filePath);
      expect(loaded.name).toBe('my-template');
      expect(loaded.description).toBeUndefined();
    });
  });

  describe('template dependencies field', () => {
    it('should accept optional dependencies field', async () => {
      const config: TasksConfiguration = {
        name: 'my-template',
        dependencies: ['base-template', 'utility-template'],
        tasks: [],
      };

      const filePath = createTemplateFile('with-dependencies.json', config);

      const loaded = await loadTemplate(filePath);
      expect(loaded.name).toBe('my-template');
      expect(loaded.dependencies).toEqual(['base-template', 'utility-template']);
    });

    it('should work without dependencies field', async () => {
      const config: TasksConfiguration = {
        name: 'my-template',
        tasks: [],
      };

      const filePath = createTemplateFile('no-dependencies.json', config);

      const loaded = await loadTemplate(filePath);
      expect(loaded.name).toBe('my-template');
      expect(loaded.dependencies).toBeUndefined();
    });

    it('should accept empty dependencies array', async () => {
      const config: TasksConfiguration = {
        name: 'my-template',
        dependencies: [],
        tasks: [],
      };

      const filePath = createTemplateFile('empty-dependencies.json', config);

      const loaded = await loadTemplate(filePath);
      expect(loaded.name).toBe('my-template');
      expect(loaded.dependencies).toEqual([]);
    });
  });

  describe('complete template structure', () => {
    it('should accept template with all fields', async () => {
      const config: TasksConfiguration = {
        name: 'complete-template',
        description: 'A complete template with all optional fields',
        dependencies: ['base-template'],
        variables: [
          {
            id: 'projectName',
            value: 'my-project',
          },
        ],
        prompts: [
          {
            id: 'userName',
            type: 'input',
            message: 'Enter your name',
          },
        ],
        tasks: [
          {
            id: 'task1',
            name: 'Task 1',
            description: 'Test task',
            required: true,
            enabled: true,
            type: 'template',
            config: { file: 'test.txt', template: 'Hello {{userName}}' },
          },
        ],
      };

      const filePath = createTemplateFile('complete.json', config);

      const loaded = await loadTemplate(filePath);
      expect(loaded.name).toBe('complete-template');
      expect(loaded.description).toBe('A complete template with all optional fields');
      expect(loaded.dependencies).toEqual(['base-template']);
      expect(loaded.variables).toHaveLength(1);
      expect(loaded.prompts).toHaveLength(1);
      expect(loaded.tasks).toHaveLength(1);
    });
  });
});
