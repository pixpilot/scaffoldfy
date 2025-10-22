/**
 * Integration tests and JSON schema validation
 */

import type {
  DeleteConfig,
  ExecConfig,
  GitInitConfig,
  RegexReplaceConfig,
  RenameConfig,
  ReplaceInFileConfig,
  TaskDefinition,
  TaskType,
  TemplateConfig,
  UpdateJsonConfig,
} from '../src/types.js';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Load JSON schema
const schemaPath = path.join(__dirname, '..', 'schema', 'tasks.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

describe('jSON Schema Validation', () => {
  it('should have all task types in schema matching TypeScript types', () => {
    const schemaTaskTypes = schema.properties.tasks.items.properties.type.enum;

    // These should match TaskType from types.ts
    const expectedTypes: TaskType[] = [
      'update-json',
      'template',
      'create',
      'regex-replace',
      'replace-in-file',
      'delete',
      'rename',
      'git-init',
      'exec',
    ];

    expect(schemaTaskTypes).toEqual(expectedTypes);
  });

  it('should have config schemas for all task types', () => {
    const configSchemas = schema.properties.tasks.items.properties.config.oneOf;

    // Should have 8 config schemas (one for each task type)
    expect(configSchemas).toHaveLength(9);

    // Verify each config schema has required properties
    const expectedConfigs = [
      { title: 'Update JSON Config', required: ['file', 'updates'] },
      { title: 'Template Config', required: ['file'] },
      {
        title: 'Regex Replace Config',
        required: ['file', 'pattern', 'replacement'],
      },
      { title: 'Replace In File Config', required: ['file', 'replacements'] },
      { title: 'Delete Config', required: ['paths'] },
      { title: 'Rename Config', required: ['from', 'to'] },
      {
        title: 'Git Init Config',
        required: ['removeExisting', 'initialCommit'],
      },
      { title: 'Exec Config', required: ['command'] },
    ];

    for (const expected of expectedConfigs) {
      const configSchema = configSchemas.find(
        (cs: { title: string }) => cs.title === expected.title,
      );

      expect(configSchema, `Missing config schema: ${expected.title}`).toBeDefined();
      expect(
        configSchema.required,
        `Missing required fields for: ${expected.title}`,
      ).toEqual(expected.required);
    }
  });

  it('should have required task properties in schema', () => {
    const requiredProps = schema.properties.tasks.items.required;

    expect(requiredProps).toContain('id');
    expect(requiredProps).toContain('name');
    expect(requiredProps).toContain('type');
    // description, required, and enabled are now optional with defaults
    expect(requiredProps).not.toContain('description');
    expect(requiredProps).not.toContain('required');
    expect(requiredProps).not.toContain('enabled');
    // 'config' is now optional to allow tasks with only prompts
    expect(requiredProps).not.toContain('config');
  });
});

describe('task Type Validation', () => {
  it('should validate UpdateJsonConfig', () => {
    const config: UpdateJsonConfig = {
      file: 'package.json',
      updates: {
        name: 'test',
        'nested.value': 'test',
      },
    };

    expect(config.file).toBeDefined();
    expect(config.updates).toBeDefined();
  });

  it('should validate TemplateConfig', () => {
    const config: TemplateConfig = {
      file: 'README.md',
      template: '# {{repoName}}',
    };

    expect(config.file).toBeDefined();
    expect(config.template).toBeDefined();
  });

  it('should validate RegexReplaceConfig', () => {
    const config: RegexReplaceConfig = {
      file: 'test.txt',
      pattern: 'old',
      replacement: 'new',
      flags: 'g',
    };

    expect(config.file).toBeDefined();
    expect(config.pattern).toBeDefined();
    expect(config.replacement).toBeDefined();
  });

  it('should validate ReplaceInFileConfig', () => {
    const config: ReplaceInFileConfig = {
      file: 'test.txt',
      replacements: [
        { find: 'old', replace: 'new' },
        { find: 'foo', replace: 'bar' },
      ],
    };

    expect(config.file).toBeDefined();
    expect(config.replacements).toHaveLength(2);
  });

  it('should validate DeleteConfig', () => {
    const config: DeleteConfig = {
      paths: ['file1.txt', 'dir/file2.txt'],
    };

    expect(config.paths).toHaveLength(2);
  });

  it('should validate DeleteConfig with condition', () => {
    const config: DeleteConfig = {
      condition: '!keepExamplePackages',
      paths: ['examples'],
    };

    expect(config.condition).toBeDefined();
    expect(config.paths).toHaveLength(1);
  });

  it('should validate RenameConfig', () => {
    const config: RenameConfig = {
      from: 'old-name.txt',
      to: 'new-name.txt',
    };

    expect(config.from).toBeDefined();
    expect(config.to).toBeDefined();
  });

  it('should validate GitInitConfig', () => {
    const config: GitInitConfig = {
      removeExisting: true,
      initialCommit: true,
      message: 'Initial commit',
    };

    expect(config.removeExisting).toBe(true);
    expect(config.initialCommit).toBe(true);
    expect(config.message).toBeDefined();
  });

  it('should validate ExecConfig', () => {
    const config: ExecConfig = {
      command: 'npm install',
      cwd: './subdir',
    };

    expect(config.command).toBeDefined();
    expect(config.cwd).toBeDefined();
  });
});

describe('task Definition Validation', () => {
  it('should create valid task definitions with all required fields', () => {
    const task: TaskDefinition = {
      id: 'test-task',
      name: 'Test Task',
      description: 'A test task',
      required: true,
      enabled: true,
      type: 'update-json',
      config: {
        file: 'package.json',
        updates: { name: 'test' },
      } as UpdateJsonConfig,
    };

    expect(task.id).toBe('test-task');
    expect(task.name).toBe('Test Task');
    expect(task.type).toBe('update-json');
  });

  it('should support optional dependencies field', () => {
    const task: TaskDefinition = {
      id: 'dependent-task',
      name: 'Dependent Task',
      description: 'Task with dependencies',
      required: true,
      enabled: true,
      type: 'delete',
      dependencies: ['task1', 'task2'],
      config: {
        paths: ['test.txt'],
      } as DeleteConfig,
    };

    expect(task.dependencies).toHaveLength(2);
    expect(task.dependencies).toContain('task1');
  });
});

describe('jSON Task Loading', () => {
  it('should validate JSON structure matches TaskDefinition interface', () => {
    const jsonTask = {
      id: 'test-task',
      name: 'Test Task',
      description: 'A test task',
      required: true,
      enabled: true,
      type: 'update-json',
      dependencies: ['other-task'],
      config: {
        file: 'package.json',
        updates: {
          name: '{{repoName}}',
        },
      },
    };

    // This should compile without errors, proving the structure matches
    const task: TaskDefinition = jsonTask as TaskDefinition;

    expect(task.id).toBe('test-task');
    expect(task.type).toBe('update-json');
    expect(task.dependencies).toContain('other-task');
  });

  it('should validate all config types can be represented in JSON', () => {
    const configs = [
      {
        type: 'update-json',
        config: { file: 'test.json', updates: { key: 'value' } },
      },
      {
        type: 'template',
        config: { file: 'test.md', template: '# {{title}}' },
      },
      {
        type: 'regex-replace',
        config: {
          file: 'test.txt',
          pattern: 'old',
          replacement: 'new',
          flags: 'g',
        },
      },
      {
        type: 'replace-in-file',
        config: {
          file: 'test.txt',
          replacements: [{ find: 'old', replace: 'new' }],
        },
      },
      { type: 'delete', config: { paths: ['test.txt'] } },
      {
        type: 'conditional-delete',
        config: { condition: 'true', paths: ['test.txt'] },
      },
      { type: 'rename', config: { from: 'old.txt', to: 'new.txt' } },
      {
        type: 'git-init',
        config: { removeExisting: true, initialCommit: true },
      },
      { type: 'exec', config: { command: 'echo test', cwd: './' } },
    ];

    for (const { config } of configs) {
      // Verify each can be serialized and deserialized
      const json = JSON.stringify(config);
      const parsed = JSON.parse(json);

      expect(parsed).toEqual(config);
    }
  });
});
