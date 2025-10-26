import { describe, expect, it } from 'vitest';
import { validateTasksSchema } from '../src/schema-validator.js';

describe('schema-validator', () => {
  describe('validateTasksSchema', () => {
    it('should validate a valid minimal configuration', () => {
      const config = {
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
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
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
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
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
        name: 'Invalid Name With Spaces',
        tasks: [],
      };

      const result = validateTasksSchema(config, { silent: true });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject task missing required id field', () => {
      const config = {
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
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
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
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
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
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
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
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
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
        name: 'test-template',
        tasks: [
          {
            id: 'task-1',
            name: 'Create file',
            type: 'write',
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
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
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
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
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
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
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
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
        name: 'test-template',
        tasks: [
          {
            id: 'task-1',
            name: 'Create file',
            type: 'write',
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
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
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
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
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
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
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
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
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
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
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
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
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
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
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
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
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
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
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
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
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
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
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
        $schema:
          'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
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

    describe('shared valueConfig definition', () => {
      it('should accept static value for variable.value', () => {
        const config = {
          $schema:
            'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
          name: 'test-template',
          variables: [
            {
              id: 'myVar',
              value: 'static value',
            },
          ],
          tasks: [],
        };

        const result = validateTasksSchema(config, { silent: true });
        expect(result.valid).toBe(true);
      });

      it('should accept exec value for variable.value', () => {
        const config = {
          $schema:
            'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
          name: 'test-template',
          variables: [
            {
              id: 'myVar',
              value: {
                type: 'exec',
                value: 'echo "test"',
              },
            },
          ],
          tasks: [],
        };

        const result = validateTasksSchema(config, { silent: true });
        expect(result.valid).toBe(true);
      });

      it('should accept conditional value for variable.value', () => {
        const config = {
          $schema:
            'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
          name: 'test-template',
          variables: [
            {
              id: 'myVar',
              value: {
                type: 'conditional',
                condition: 'true',
                ifTrue: 'yes',
                ifFalse: 'no',
              },
            },
          ],
          tasks: [],
        };

        const result = validateTasksSchema(config, { silent: true });
        expect(result.valid).toBe(true);
      });

      it('should accept static value for prompt.default', () => {
        const config = {
          $schema:
            'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
          name: 'test-template',
          prompts: [
            {
              id: 'myPrompt',
              type: 'input',
              message: 'Enter value',
              default: 'default value',
            },
          ],
          tasks: [],
        };

        const result = validateTasksSchema(config, { silent: true });
        expect(result.valid).toBe(true);
      });

      it('should accept exec value for prompt.default', () => {
        const config = {
          $schema:
            'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
          name: 'test-template',
          prompts: [
            {
              id: 'myPrompt',
              type: 'input',
              message: 'Enter value',
              default: {
                type: 'exec',
                value: 'git config --get user.name',
              },
            },
          ],
          tasks: [],
        };

        const result = validateTasksSchema(config, { silent: true });
        expect(result.valid).toBe(true);
      });

      it('should accept interpolate value for prompt.default', () => {
        const config = {
          $schema:
            'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
          name: 'test-template',
          prompts: [
            {
              id: 'myPrompt',
              type: 'input',
              message: 'Enter value',
              default: {
                type: 'interpolate',
                value: '{{otherVar}}',
              },
            },
          ],
          tasks: [],
        };

        const result = validateTasksSchema(config, { silent: true });
        expect(result.valid).toBe(true);
      });
    });

    describe('shared transformersArray definition', () => {
      it('should accept built-in transformer ID for variable.transformers', () => {
        const config = {
          $schema:
            'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
          name: 'test-template',
          variables: [
            {
              id: 'myVar',
              value: 'test',
              transformers: ['lowercase', 'trim'],
            },
          ],
          tasks: [],
        };

        const result = validateTasksSchema(config, { silent: true });
        expect(result.valid).toBe(true);
      });

      it('should accept inline transformer definition for variable.transformers', () => {
        const config = {
          $schema:
            'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
          name: 'test-template',
          variables: [
            {
              id: 'myVar',
              value: 'test',
              transformers: [
                {
                  id: 'custom',
                  type: 'regex',
                  config: {
                    pattern: 'a',
                    replacement: 'b',
                  },
                },
              ],
            },
          ],
          tasks: [],
        };

        const result = validateTasksSchema(config, { silent: true });
        expect(result.valid).toBe(true);
      });

      it('should accept built-in transformer ID for prompt.transformers', () => {
        const config = {
          $schema:
            'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
          name: 'test-template',
          prompts: [
            {
              id: 'myPrompt',
              type: 'input',
              message: 'Enter value',
              transformers: ['slugify', 'lowercase'],
            },
          ],
          tasks: [],
        };

        const result = validateTasksSchema(config, { silent: true });
        expect(result.valid).toBe(true);
      });

      it('should accept inline transformer definition for prompt.transformers', () => {
        const config = {
          $schema:
            'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
          name: 'test-template',
          prompts: [
            {
              id: 'myPrompt',
              type: 'input',
              message: 'Enter value',
              transformers: [
                {
                  id: 'custom',
                  type: 'computed',
                  config: {
                    expression: 'value.toUpperCase()',
                  },
                },
              ],
            },
          ],
          tasks: [],
        };

        const result = validateTasksSchema(config, { silent: true });
        expect(result.valid).toBe(true);
      });
    });

    describe('type-specific prompt fields', () => {
      it('should accept min and max for number prompts', () => {
        const config = {
          $schema:
            'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
          name: 'test-template',
          prompts: [
            {
              id: 'port',
              type: 'number',
              message: 'Port number',
              min: 1024,
              max: 65535,
            },
          ],
          tasks: [],
        };

        const result = validateTasksSchema(config, { silent: true });
        expect(result.valid).toBe(true);
      });

      it('should accept choices for select prompts', () => {
        const config = {
          $schema:
            'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
          name: 'test-template',
          prompts: [
            {
              id: 'framework',
              type: 'select',
              message: 'Choose framework',
              choices: [
                { name: 'React', value: 'react' },
                { name: 'Vue', value: 'vue' },
              ],
            },
          ],
          tasks: [],
        };

        const result = validateTasksSchema(config, { silent: true });
        expect(result.valid).toBe(true);
      });

      it('should reject select prompt without choices', () => {
        const config = {
          $schema:
            'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
          name: 'test-template',
          prompts: [
            {
              id: 'framework',
              type: 'select',
              message: 'Choose framework',
            },
          ],
          tasks: [],
        };

        const result = validateTasksSchema(config, { silent: true });
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should accept input prompt without min, max, or choices', () => {
        const config = {
          $schema:
            'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
          name: 'test-template',
          prompts: [
            {
              id: 'name',
              type: 'input',
              message: 'Enter name',
            },
          ],
          tasks: [],
        };

        const result = validateTasksSchema(config, { silent: true });
        expect(result.valid).toBe(true);
      });

      it('should accept confirm prompt without min, max, or choices', () => {
        const config = {
          $schema:
            'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
          name: 'test-template',
          prompts: [
            {
              id: 'confirm',
              type: 'confirm',
              message: 'Are you sure?',
            },
          ],
          tasks: [],
        };

        const result = validateTasksSchema(config, { silent: true });
        expect(result.valid).toBe(true);
      });

      it('should accept password prompt without min, max, or choices', () => {
        const config = {
          $schema:
            'https://unpkg.com/@pixpilot/scaffoldfy@latest/schema/scaffoldfy.schema.json',
          name: 'test-template',
          prompts: [
            {
              id: 'secret',
              type: 'password',
              message: 'Enter password',
            },
          ],
          tasks: [],
        };

        const result = validateTasksSchema(config, { silent: true });
        expect(result.valid).toBe(true);
      });
    });
  });
});
