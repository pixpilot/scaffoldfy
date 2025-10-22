import { describe, expect, it } from 'vitest';
import { validateTasksSchema } from '../src/schema-validator.js';

describe('schema-validator', () => {
  describe('validateTasksSchema', () => {
    it('should validate a valid minimal configuration', () => {
      const config = {
        name: 'test-template',
        tasks: [
          {
            id: 'task-1',
            name: 'Test Task',
            type: 'update-json',
            config: {
              file: 'package.json',
              updates: {
                name: 'test',
              },
            },
          },
        ],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject configuration missing required name field', () => {
      const config = {
        tasks: [
          {
            id: 'task-1',
            name: 'Test Task',
            type: 'update-json',
            config: {
              file: 'package.json',
              updates: {
                name: 'test',
              },
            },
          },
        ],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Missing required property "name"');
    });

    it('should reject invalid template name pattern', () => {
      const config = {
        name: 'Invalid Name With Spaces',
        tasks: [],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject task missing required id field', () => {
      const config = {
        name: 'test-template',
        tasks: [
          {
            name: 'Test Task',
            type: 'update-json',
            config: {
              file: 'package.json',
              updates: {
                name: 'test',
              },
            },
          },
        ],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject task with invalid type', () => {
      const config = {
        name: 'test-template',
        tasks: [
          {
            id: 'task-1',
            name: 'Test Task',
            type: 'invalid-type',
            config: {
              file: 'package.json',
            },
          },
        ],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate configuration with global variables', () => {
      const config = {
        name: 'test-template',
        variables: [
          {
            id: 'myVar',
            value: 'test-value',
          },
        ],
        tasks: [
          {
            id: 'task-1',
            name: 'Test Task',
            type: 'update-json',
            config: {
              file: 'package.json',
              updates: {
                name: '{{myVar}}',
              },
            },
          },
        ],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate configuration with executable variables', () => {
      const config = {
        name: 'test-template',
        variables: [
          {
            id: 'execVar',
            value: {
              type: 'exec',
              value: 'echo test',
            },
          },
        ],
        tasks: [
          {
            id: 'task-1',
            name: 'Test Task',
            type: 'update-json',
            config: {
              file: 'package.json',
              updates: {
                name: '{{execVar}}',
              },
            },
          },
        ],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate template task with inline template', () => {
      const config = {
        name: 'test-template',
        tasks: [
          {
            id: 'task-1',
            name: 'Create file',
            type: 'template',
            config: {
              file: 'test.txt',
              template: 'Hello {{name}}',
            },
          },
        ],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate configuration with global prompts', () => {
      const config = {
        name: 'test-template',
        prompts: [
          {
            id: 'projectName',
            type: 'input',
            message: 'What is your project name?',
            required: true,
          },
          {
            id: 'useTypeScript',
            type: 'confirm',
            message: 'Use TypeScript?',
            default: true,
          },
        ],
        tasks: [
          {
            id: 'task-1',
            name: 'Test Task',
            type: 'update-json',
            config: {
              file: 'package.json',
              updates: {
                name: '{{projectName}}',
              },
            },
          },
        ],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject prompt with invalid id pattern', () => {
      const config = {
        name: 'test-template',
        prompts: [
          {
            id: 'invalid-id-with-dashes',
            type: 'input',
            message: 'Test',
          },
        ],
        tasks: [],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject variable with invalid id pattern', () => {
      const config = {
        name: 'test-template',
        variables: [
          {
            id: '123invalid',
            value: 'test',
          },
        ],
        tasks: [],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate template task with templateFile', () => {
      const config = {
        name: 'test-template',
        tasks: [
          {
            id: 'task-1',
            name: 'Create file',
            type: 'template',
            config: {
              file: 'test.txt',
              templateFile: 'templates/test.hbs',
            },
          },
        ],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate configuration with task dependencies', () => {
      const config = {
        name: 'test-template',
        tasks: [
          {
            id: 'task-1',
            name: 'First Task',
            type: 'update-json',
            config: {
              file: 'package.json',
              updates: {
                name: 'test',
              },
            },
          },
          {
            id: 'task-2',
            name: 'Second Task',
            type: 'update-json',
            dependencies: ['task-1'],
            config: {
              file: 'package.json',
              updates: {
                version: '1.0.0',
              },
            },
          },
        ],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate exec task configuration', () => {
      const config = {
        name: 'test-template',
        tasks: [
          {
            id: 'task-1',
            name: 'Run command',
            type: 'exec',
            config: {
              command: 'npm install',
              cwd: './packages/app',
            },
          },
        ],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate delete task configuration', () => {
      const config = {
        name: 'test-template',
        tasks: [
          {
            id: 'task-1',
            name: 'Delete files',
            type: 'delete',
            config: {
              paths: ['file1.txt', 'file2.txt'],
            },
          },
        ],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate rename task configuration', () => {
      const config = {
        name: 'test-template',
        tasks: [
          {
            id: 'task-1',
            name: 'Rename file',
            type: 'rename',
            config: {
              from: 'old-name.txt',
              to: 'new-name.txt',
            },
          },
        ],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate git-init task configuration', () => {
      const config = {
        name: 'test-template',
        tasks: [
          {
            id: 'task-1',
            name: 'Initialize git',
            type: 'git-init',
            config: {
              removeExisting: true,
              initialCommit: true,
              message: 'Initial commit',
            },
          },
        ],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate configuration with conditional enabled', () => {
      const config = {
        name: 'test-template',
        tasks: [
          {
            id: 'task-1',
            name: 'Conditional Task',
            type: 'update-json',
            enabled: 'useFeature === true',
            config: {
              file: 'package.json',
              updates: {
                name: 'test',
              },
            },
          },
        ],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate configuration with template inheritance', () => {
      const config = {
        name: 'test-template',
        extends: 'base-template.json',
        tasks: [
          {
            id: 'task-1',
            name: 'Test Task',
            type: 'update-json',
            config: {
              file: 'package.json',
              updates: {
                name: 'test',
              },
            },
          },
        ],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate configuration with array of extends', () => {
      const config = {
        name: 'test-template',
        extends: ['base-template-1.json', 'base-template-2.json'],
        tasks: [],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject task with additional unknown properties', () => {
      const config = {
        name: 'test-template',
        tasks: [
          {
            id: 'task-1',
            name: 'Test Task',
            type: 'update-json',
            foo: 'bar', // Unknown property
            config: {
              file: 'package.json',
              updates: {
                name: 'test',
              },
            },
          },
        ],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('Unknown property'))).toBe(true);
    });

    it('should reject configuration with additional unknown top-level properties', () => {
      const config = {
        name: 'test-template',
        tasks: [],
        unknownField: 'should not be here',
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('Unknown property'))).toBe(true);
    });

    it('should reject variable with additional unknown properties', () => {
      const config = {
        name: 'test-template',
        variables: [
          {
            id: 'myVar',
            value: 'test',
            extraProp: 'not allowed',
          },
        ],
        tasks: [],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('Unknown property'))).toBe(true);
    });

    it('should reject prompt with additional unknown properties', () => {
      const config = {
        name: 'test-template',
        prompts: [
          {
            id: 'myPrompt',
            type: 'input',
            message: 'Enter value',
            invalidField: true,
          },
        ],
        tasks: [],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('Unknown property'))).toBe(true);
    });
  });
});
