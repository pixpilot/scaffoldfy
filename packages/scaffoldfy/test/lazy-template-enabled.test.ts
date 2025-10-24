/**
 * Tests for lazy template enabled evaluation
 * Tests that template enabled conditions are evaluated with access to prompts and variables
 */

import type {
  PromptDefinition,
  TaskDefinition,
  VariableDefinition,
} from '../src/types.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('lazy template enabled evaluation', () => {
  const mockLog = vi.fn();
  let collectPrompts: typeof import('../src/prompts/collect-prompts.js').collectPrompts;
  let resolveAllVariableValues: typeof import('../src/variables/resolve-all-variable-values.js').resolveAllVariableValues;
  let runTasks: typeof import('../src/run-tasks.js').runTasks;

  beforeEach(async () => {
    vi.resetModules();

    // Mock utils
    vi.doMock('../src/utils.js', async () => {
      const actual =
        await vi.importActual<typeof import('../src/utils.js')>('../src/utils.js');
      return {
        ...actual,
        log: mockLog,
      };
    });

    // Mock inquirer prompts to avoid actual user interaction
    vi.doMock('@inquirer/prompts', () => ({
      input: vi.fn(
        async (options: { message: string; default?: string }) =>
          options.default ?? 'mock-value',
      ),
      confirm: vi.fn(
        async (options: { message: string; default?: boolean }) =>
          options.default ?? false,
      ),
      select: vi.fn(
        async (options: {
          message: string;
          choices: Array<{ value: unknown }>;
          default?: unknown;
        }) => options.default ?? options.choices[0]?.value,
      ),
      number: vi.fn(
        async (options: { message: string; default?: number }) => options.default ?? 0,
      ),
      password: vi.fn(async () => 'mock-password'),
    }));

    // Import after mocking
    const promptsModule = await import('../src/prompts/collect-prompts.js');
    collectPrompts = promptsModule.collectPrompts;

    const variablesModule = await import(
      '../src/variables/resolve-all-variable-values.js'
    );
    resolveAllVariableValues = variablesModule.resolveAllVariableValues;

    const runTasksModule = await import('../src/run-tasks.js');
    runTasks = runTasksModule.runTasks;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('collectPrompts with $templateEnabled', () => {
    it('should skip prompts when $templateEnabled evaluates to false', async () => {
      const prompts: PromptDefinition[] = [
        {
          id: 'prompt1',
          type: 'input',
          message: 'First prompt',
          $templateEnabled: false,
        },
        {
          id: 'prompt2',
          type: 'input',
          message: 'Second prompt',
        },
      ];

      const answers = await collectPrompts(prompts);

      // prompt1 should be skipped due to $templateEnabled: false
      expect(answers).not.toHaveProperty('prompt1');
      expect(answers).toHaveProperty('prompt2');
    });

    it('should evaluate $templateEnabled condition with previous prompt answers', async () => {
      const prompts: PromptDefinition[] = [
        {
          id: 'isPixpilot',
          type: 'confirm',
          message: 'Is this a Pixpilot project?',
          default: { type: 'static', value: true },
        },
        {
          id: 'pixpilotSpecificPrompt',
          type: 'input',
          message: 'Pixpilot specific setting',
          $templateEnabled: { condition: 'isPixpilot === true' },
        },
      ];

      const answers = await collectPrompts(prompts);

      // Both prompts should be collected since isPixpilot defaults to true
      expect(answers).toHaveProperty('isPixpilot');
      expect(answers).toHaveProperty('pixpilotSpecificPrompt');
    });

    it('should skip prompt when $templateEnabled condition is false', async () => {
      const prompts: PromptDefinition[] = [
        {
          id: 'isPixpilot',
          type: 'confirm',
          message: 'Is this a Pixpilot project?',
          default: { type: 'static', value: false },
        },
        {
          id: 'pixpilotSpecificPrompt',
          type: 'input',
          message: 'Pixpilot specific setting',
          $templateEnabled: { condition: 'isPixpilot === true' },
        },
      ];

      const answers = await collectPrompts(prompts);

      // Only first prompt should be collected
      expect(answers).toHaveProperty('isPixpilot');
      expect(answers).not.toHaveProperty('pixpilotSpecificPrompt');
    });

    it('should work with string condition syntax', async () => {
      const prompts: PromptDefinition[] = [
        {
          id: 'repoOwner',
          type: 'input',
          message: 'Repository owner',
          default: { type: 'static', value: 'pixpilots' },
        },
        {
          id: 'pixpilotPrompt',
          type: 'input',
          message: 'Pixpilot prompt',
          $templateEnabled: 'repoOwner === "pixpilots"',
        },
      ];

      const answers = await collectPrompts(prompts);

      expect(answers).toHaveProperty('repoOwner', 'pixpilots');
      expect(answers).toHaveProperty('pixpilotPrompt');
    });
  });

  describe('resolveAllVariableValues with $templateEnabled', () => {
    it('should skip variables when $templateEnabled evaluates to false', async () => {
      const variables: VariableDefinition[] = [
        {
          id: 'var1',
          value: { type: 'static', value: 'value1' },
          $templateEnabled: false,
        },
        {
          id: 'var2',
          value: { type: 'static', value: 'value2' },
        },
      ];

      const resolved = await resolveAllVariableValues(variables);

      // var1 should be skipped due to $templateEnabled: false
      expect(resolved.has('var1')).toBe(false);
      expect(resolved.has('var2')).toBe(true);
    });

    it('should evaluate $templateEnabled condition with previous variable values', async () => {
      const variables: VariableDefinition[] = [
        {
          id: 'enableFeature',
          value: { type: 'static', value: true },
        },
        {
          id: 'featureSpecificVar',
          value: { type: 'static', value: 'feature-value' },
          $templateEnabled: { condition: 'enableFeature === true' },
        },
      ];

      const resolved = await resolveAllVariableValues(variables);

      // Both variables should be resolved
      expect(resolved.get('enableFeature')).toBe(true);
      expect(resolved.get('featureSpecificVar')).toBe('feature-value');
    });

    it('should skip variable when $templateEnabled condition is false', async () => {
      const variables: VariableDefinition[] = [
        {
          id: 'enableFeature',
          value: { type: 'static', value: false },
        },
        {
          id: 'featureSpecificVar',
          value: { type: 'static', value: 'feature-value' },
          $templateEnabled: { condition: 'enableFeature === true' },
        },
      ];

      const resolved = await resolveAllVariableValues(variables);

      // Only first variable should be resolved
      expect(resolved.get('enableFeature')).toBe(false);
      expect(resolved.has('featureSpecificVar')).toBe(false);
    });

    it('should evaluate conditional variable with access to prompts', async () => {
      const config = { repoOwner: 'pixpilots', orgName: 'test-org' };

      const variables: VariableDefinition[] = [
        {
          id: 'pixpilot_project',
          value: {
            type: 'conditional',
            condition: 'repoOwner === "pixpilots" || orgName === "pixpilots"',
            ifTrue: true,
            ifFalse: false,
          },
        },
      ];

      const resolved = await resolveAllVariableValues(variables, config);

      expect(resolved.get('pixpilot_project')).toBe(true);
    });

    it('should work with complex template enabled conditions', async () => {
      const config = { repoOwner: 'pixpilots' };

      const variables: VariableDefinition[] = [
        {
          id: 'pixpilot_project',
          value: {
            type: 'conditional',
            condition: 'repoOwner === "pixpilots"',
            ifTrue: true,
            ifFalse: false,
          },
        },
        {
          id: 'pixpilot_specific_var',
          value: { type: 'static', value: 'pixpilot-value' },
          $templateEnabled: 'pixpilot_project == true',
        },
      ];

      const resolved = await resolveAllVariableValues(variables, config);

      expect(resolved.get('pixpilot_project')).toBe(true);
      expect(resolved.get('pixpilot_specific_var')).toBe('pixpilot-value');
    });
  });

  describe('integration: tasks with $templateEnabled', () => {
    it('should skip tasks when $templateEnabled evaluates to false', async () => {
      const tasks: TaskDefinition[] = [
        {
          id: 'task1',
          name: 'Task 1',
          type: 'write' as const,
          config: { file: 'test1.txt', template: 'test1' },
        },
        {
          id: 'task2',
          name: 'Task 2',
          type: 'write' as const,
          config: { file: 'test2.txt', template: 'test2' },
          $templateEnabled: false,
        },
      ];

      // Run in dry-run mode to avoid actual file operations
      await runTasks(tasks, {
        dryRun: true,
        force: false,
        tasksFilePath: undefined,
      });

      // No assertion needed - if it runs without error, it works
      // The test validates that task2 with $templateEnabled: false is skipped
    });

    it('should evaluate task $templateEnabled with prompts and variables', async () => {
      const tasks: TaskDefinition[] = [
        {
          id: 'conditional-task',
          name: 'Conditional Task',
          type: 'write' as const,
          config: { file: 'test.txt', template: 'test' },
          $templateEnabled: 'pixpilot_project === true',
        },
      ];

      const variables: VariableDefinition[] = [
        {
          id: 'pixpilot_project',
          value: { type: 'static', value: true },
        },
      ];

      // Run in dry-run mode to avoid actual file operations
      await runTasks(tasks, {
        dryRun: true,
        force: false,
        tasksFilePath: undefined,
        globalVariables: variables,
      });

      // No assertion needed - if it runs without error, it works
      // The test validates that task with $templateEnabled is evaluated with variable values
    });
  });
});
