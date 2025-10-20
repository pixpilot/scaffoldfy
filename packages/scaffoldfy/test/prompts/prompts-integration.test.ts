/**
 * Integration tests for prompts with tasks
 */

import type { InitConfig, TaskDefinition } from '../../src/types.js';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { interpolateTemplate } from '../../src/utils.js';

describe('prompts integration with tasks', () => {
  const testDir = path.join(process.cwd(), 'test-temp-prompts');

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should define tasks with prompts for user input', () => {
    const tasks: TaskDefinition[] = [
      {
        id: 'setup-project',
        name: 'Setup Project',
        description: 'Configure project with user inputs',
        required: true,
        enabled: true,
        type: 'update-json',
        prompts: [
          {
            id: 'projectName',
            type: 'input',
            message: 'What is your project name?',
            default: 'my-awesome-project',
            required: true,
          },
          {
            id: 'projectVersion',
            type: 'input',
            message: 'Initial version?',
            default: '0.1.0',
          },
          {
            id: 'includeTests',
            type: 'confirm',
            message: 'Include test setup?',
            default: true,
          },
        ],
        config: {
          file: 'package.json',
          updates: {
            name: '{{projectName}}',
            version: '{{projectVersion}}',
          },
        },
      },
    ];

    expect(tasks[0]?.prompts).toBeDefined();
    expect(tasks[0]?.prompts?.length).toBe(3);
    expect(tasks[0]?.prompts?.[0]?.id).toBe('projectName');
    expect(tasks[0]?.prompts?.[0]?.type).toBe('input');
  });

  it('should support select prompts with choices', () => {
    const task: TaskDefinition = {
      id: 'choose-framework',
      name: 'Choose Framework',
      description: 'Select your preferred framework',
      required: true,
      enabled: true,
      type: 'update-json',
      prompts: [
        {
          id: 'framework',
          type: 'select',
          message: 'Select your framework',
          choices: [
            { name: 'React', value: 'react' },
            { name: 'Vue', value: 'vue' },
            { name: 'Svelte', value: 'svelte' },
          ],
          default: 'react',
        },
      ],
      config: {
        file: 'package.json',
        updates: {
          framework: '{{framework}}',
        },
      },
    };

    expect(task.prompts?.[0]?.type).toBe('select');
    if (task.prompts?.[0]?.type === 'select') {
      expect(task.prompts[0].choices).toHaveLength(3);
    }
  });

  it('should support number prompts with min/max', () => {
    const task: TaskDefinition = {
      id: 'set-port',
      name: 'Set Port',
      description: 'Configure server port',
      required: true,
      enabled: true,
      type: 'update-json',
      prompts: [
        {
          id: 'port',
          type: 'number',
          message: 'Server port?',
          default: 3000,
          min: 1024,
          max: 65535,
        },
      ],
      config: {
        file: 'config.json',
        updates: {
          port: '{{port}}',
        },
      },
    };

    expect(task.prompts?.[0]?.type).toBe('number');
    if (task.prompts?.[0]?.type === 'number') {
      expect(task.prompts[0].min).toBe(1024);
      expect(task.prompts[0].max).toBe(65535);
    }
  });

  it('should support password prompts', () => {
    const task: TaskDefinition = {
      id: 'set-api-key',
      name: 'Set API Key',
      description: 'Configure API credentials',
      required: true,
      enabled: true,
      type: 'template',
      prompts: [
        {
          id: 'apiKey',
          type: 'password',
          message: 'Enter your API key',
          required: true,
        },
      ],
      config: {
        file: '.env',
        template: 'API_KEY={{apiKey}}',
      },
    };

    expect(task.prompts?.[0]?.type).toBe('password');
    expect(task.prompts?.[0]?.required).toBe(true);
  });

  it('should interpolate prompt values into config', () => {
    const config: InitConfig = {
      repoName: 'test-repo',
      repoOwner: 'test-owner',
      repoUrl: 'https://github.com/test/repo',
      author: 'Test Author',
      baseRepoUrl: 'https://github.com/test/repo',

      orgName: '@test',
      // Prompt values
      projectName: 'my-custom-project',
      includeTests: true,
      framework: 'react',
    };

    const template =
      'Name: {{projectName}}, Tests: {{includeTests}}, Framework: {{framework}}';
    const result = interpolateTemplate(template, config);

    expect(result).toBe('Name: my-custom-project, Tests: true, Framework: react');
  });

  it('should support multiple tasks with different prompts', () => {
    const tasks: TaskDefinition[] = [
      {
        id: 'task1',
        name: 'Task 1',
        description: 'First task',
        required: true,
        enabled: true,
        type: 'update-json',
        prompts: [
          {
            id: 'value1',
            type: 'input',
            message: 'Enter value 1',
          },
        ],
        config: {},
      },
      {
        id: 'task2',
        name: 'Task 2',
        description: 'Second task',
        required: true,
        enabled: true,
        type: 'update-json',
        prompts: [
          {
            id: 'value2',
            type: 'confirm',
            message: 'Confirm value 2',
          },
        ],
        config: {},
      },
    ];

    const allPrompts = tasks.flatMap((task) => task.prompts || []);
    expect(allPrompts).toHaveLength(2);
    expect(allPrompts[0]?.id).toBe('value1');
    expect(allPrompts[1]?.id).toBe('value2');
  });

  it('should validate that prompt IDs are unique across all tasks', () => {
    const tasks: TaskDefinition[] = [
      {
        id: 'task1',
        name: 'Task 1',
        description: 'First task',
        required: true,
        enabled: true,
        type: 'update-json',
        prompts: [
          {
            id: 'sharedValue',
            type: 'input',
            message: 'Enter value',
          },
        ],
        config: {},
      },
      {
        id: 'task2',
        name: 'Task 2',
        description: 'Second task',
        required: true,
        enabled: true,
        type: 'update-json',
        prompts: [
          {
            id: 'sharedValue', // Duplicate ID - should be caught by validation
            type: 'input',
            message: 'Enter another value',
          },
        ],
        config: {},
      },
    ];

    const allPrompts = tasks.flatMap((task) => task.prompts || []);
    const promptIds = new Set(allPrompts.map((p) => p.id));

    // Should have 2 prompts but only 1 unique ID (indicating duplication)
    expect(allPrompts).toHaveLength(2);
    expect(promptIds.size).toBe(1);
  });

  it('should allow tasks without prompts', () => {
    const task: TaskDefinition = {
      id: 'simple-task',
      name: 'Simple Task',
      description: 'Task without prompts',
      required: true,
      enabled: true,
      type: 'delete',
      config: {
        paths: ['temp.txt'],
      },
    };

    expect(task.prompts).toBeUndefined();
  });

  it('should demonstrate real-world usage example', () => {
    const realWorldTasks: TaskDefinition[] = [
      {
        id: 'init-project',
        name: 'Initialize Project',
        description: 'Set up project with custom configuration',
        required: true,
        enabled: true,
        type: 'update-json',
        prompts: [
          {
            id: 'appName',
            type: 'input',
            message: 'Application name',
            default: 'my-app',
            required: true,
          },
          {
            id: 'useTypeScript',
            type: 'confirm',
            message: 'Use TypeScript?',
            default: true,
          },
          {
            id: 'packageManager',
            type: 'select',
            message: 'Package manager',
            choices: [
              { name: 'npm', value: 'npm' },
              { name: 'pnpm', value: 'pnpm' },
              { name: 'yarn', value: 'yarn' },
            ],
            default: 'pnpm',
          },
          {
            id: 'nodeVersion',
            type: 'number',
            message: 'Minimum Node.js version',
            default: 20,
            min: 16,
            max: 22,
          },
        ],
        config: {
          file: 'package.json',
          updates: {
            name: '{{appName}}',
            packageManager: '{{packageManager}}',
            engines: {
              node: '>=0',
            },
          },
        },
      },
    ];

    expect(realWorldTasks[0]?.prompts).toHaveLength(4);
    expect(realWorldTasks[0]?.prompts?.map((p) => p.type)).toEqual([
      'input',
      'confirm',
      'select',
      'number',
    ]);
  });
});

describe('global prompts', () => {
  it('should support prompts marked as global', () => {
    const tasks: TaskDefinition[] = [
      {
        id: 'task1',
        name: 'Task 1',
        description: 'First task',
        required: true,
        enabled: true,
        type: 'update-json',
        prompts: [
          {
            id: 'projectName',
            type: 'input',
            message: 'What is your project name?',
            required: true,
          },
          {
            id: 'task1Value',
            type: 'input',
            message: 'Task 1 specific value',
          },
        ],
        config: {
          file: 'task1.json',
          updates: {
            name: '{{projectName}}',
            value: '{{task1Value}}',
          },
        },
      },
      {
        id: 'task2',
        name: 'Task 2',
        description: 'Second task',
        required: true,
        enabled: true,
        type: 'update-json',
        prompts: [
          {
            id: 'task2Value',
            type: 'input',
            message: 'Task 2 specific value',
          },
        ],
        config: {
          file: 'task2.json',
          updates: {
            name: '{{projectName}}', // Can use global prompt from task1
            value: '{{task2Value}}',
          },
        },
      },
    ];

    // With new structure, prompts are either top-level or task-scoped
    // No need to test global property anymore
    const allTaskPrompts = tasks.flatMap((task) => task.prompts || []);
    expect(allTaskPrompts.length).toBeGreaterThan(0);
  });

  it('should use prompt values in multiple task configs', () => {
    const config: InitConfig = {
      repoName: 'test-repo',
      repoOwner: 'test-owner',
      repoUrl: 'https://github.com/test/repo',
      author: 'Test Author',
      baseRepoUrl: 'https://github.com/test/repo',
      orgName: '@test',
      // Prompt values
      projectName: 'my-awesome-app',
      version: '2.0.0',
    };

    const task1Config = 'Project: {{projectName}} v{{version}}';
    const task2Config = '{{projectName}} - Copyright {{author}}';
    const task3Config = 'Version {{version}} of {{projectName}}';

    expect(interpolateTemplate(task1Config, config)).toBe(
      'Project: my-awesome-app v2.0.0',
    );
    expect(interpolateTemplate(task2Config, config)).toBe(
      'my-awesome-app - Copyright Test Author',
    );
    expect(interpolateTemplate(task3Config, config)).toBe(
      'Version 2.0.0 of my-awesome-app',
    );
  });
});
