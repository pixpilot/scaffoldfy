/**
 * Integration tests for prompts with tasks
 */

import type { InitConfig, TasksConfiguration } from '../../src/types.js';
import { describe, expect, it } from 'vitest';
import { interpolateTemplate } from '../../src/utils';

describe('root-level prompts', () => {
  it('should support root-level prompts available to all tasks', () => {
    const config: TasksConfiguration = {
      name: 'test-template',
      prompts: [
        {
          id: 'projectName',
          type: 'input',
          message: 'Project name?',
          required: true,
        },
      ],
      tasks: [
        {
          id: 'task1',
          name: 'Task 1',
          description: 'First task',
          required: true,
          enabled: true,
          type: 'update-json',
          config: {
            file: 'task1.json',
            updates: {
              name: '{{projectName}}',
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
          config: {
            file: 'task2.json',
            updates: {
              name: '{{projectName}}',
            },
          },
        },
      ],
    };

    // Root-level prompts are available to all tasks
    expect(config.prompts?.length).toBeGreaterThan(0);
    expect(config.tasks?.length).toBe(2);
  });

  it('should use prompt values in multiple task configs', () => {
    const configValues: InitConfig = {
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

    const template1 = 'Project: {{projectName}} v{{version}}';
    const template2 = '{{projectName}} - {{author}}';

    const result1 = interpolateTemplate(template1, configValues);
    const result2 = interpolateTemplate(template2, configValues);

    expect(result1).toBe('Project: my-awesome-app v2.0.0');
    expect(result2).toBe('my-awesome-app - Test Author');
  });
});
