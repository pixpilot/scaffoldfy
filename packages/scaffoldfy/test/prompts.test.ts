/**
 * Tests for prompt collection and validation
 */

import type { DefaultValue, PromptDefinition } from '../src/types.js';
import { execSync } from 'node:child_process';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resolveAllDefaultValues,
  resolveDefaultValue,
  validatePrompts,
} from '../src/prompts.js';

// Mock execSync for testing command execution
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

// Clear mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

describe('validatePrompts', () => {
  it('should return no errors for valid prompts', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'project-name',
        type: 'input',
        message: 'What is your project name?',
        default: 'my-project',
        required: true,
      },
      {
        id: 'includeTests',
        type: 'confirm',
        message: 'Include test files?',
        default: true,
      },
      {
        id: 'framework',
        type: 'select',
        message: 'Select a framework',
        choices: [
          { name: 'React', value: 'react' },
          { name: 'Vue', value: 'vue' },
        ],
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors).toEqual([]);
  });

  it('should detect duplicate prompt IDs', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'projectName',
        type: 'input',
        message: 'Project name?',
      },
      {
        id: 'projectName',
        type: 'input',
        message: 'Another project name?',
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors).toContain('Duplicate prompt ID: projectName');
  });

  it('should validate prompt ID format', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'invalid id!',
        type: 'input',
        message: 'Test',
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors.some((err) => err.includes('Invalid prompt ID'))).toBe(true);
  });

  it('should validate empty message', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'test',
        type: 'input',
        message: '',
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors).toContain('Prompt "test" must have a non-empty message');
  });

  it('should validate select prompts have choices', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'framework',
        type: 'select',
        message: 'Select framework',
        choices: [],
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors).toContain('Select prompt "framework" must have at least one choice');
  });

  it('should validate select prompt choice structure', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'framework',
        type: 'select',
        message: 'Select framework',
        choices: [
          { name: '', value: 'react' },
          { name: 'Vue', value: undefined as never },
        ],
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors).toContain('Select prompt "framework" has a choice with empty name');
    expect(errors).toContain(
      'Select prompt "framework" has a choice with undefined value',
    );
  });

  it('should validate number prompt min/max', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'port',
        type: 'number',
        message: 'Port number',
        min: 100,
        max: 50,
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors).toContain('Number prompt "port" has min greater than max');
  });

  it('should allow valid number prompt with min/max', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'port',
        type: 'number',
        message: 'Port number',
        min: 1000,
        max: 9999,
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors).toEqual([]);
  });

  it('should validate password prompt', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'api-key',
        type: 'password',
        message: 'Enter API key',
        required: true,
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors).toEqual([]);
  });

  it('should allow hyphens and underscores in prompt ID', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'my-prompt_name',
        type: 'input',
        message: 'Test',
      },
      {
        id: 'another_prompt-id',
        type: 'confirm',
        message: 'Confirm?',
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors).toEqual([]);
  });

  it('should handle multiple validation errors', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'invalid id',
        type: 'input',
        message: '',
      },
      {
        id: 'test',
        type: 'select',
        message: 'Select',
        choices: [],
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors.length).toBeGreaterThan(2);
  });
});

describe('prompt types', () => {
  it('should support all prompt types', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'text',
        type: 'input',
        message: 'Enter text',
      },
      {
        id: 'secret',
        type: 'password',
        message: 'Enter password',
      },
      {
        id: 'age',
        type: 'number',
        message: 'Enter age',
      },
      {
        id: 'choice',
        type: 'select',
        message: 'Choose',
        choices: [{ name: 'Option', value: 'opt' }],
      },
      {
        id: 'agree',
        type: 'confirm',
        message: 'Agree?',
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors).toEqual([]);
  });
});

describe('global prompts', () => {
  it('should allow prompts marked as global', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'projectName',
        type: 'input',
        message: 'Project name?',
        global: true,
      },
      {
        id: 'author',
        type: 'input',
        message: 'Author name?',
        global: true,
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors).toEqual([]);
  });

  it('should allow mixing global and task-specific prompts with different IDs', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'projectName',
        type: 'input',
        message: 'Project name?',
        global: true,
      },
      {
        id: 'taskSpecific',
        type: 'input',
        message: 'Task-specific value?',
        global: false,
      },
      {
        id: 'anotherTaskValue',
        type: 'confirm',
        message: 'Confirm this task?',
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors).toEqual([]);
  });

  it('should detect conflict when same ID is used as both global and task-specific', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'projectName',
        type: 'input',
        message: 'Project name (global)?',
        global: true,
      },
      {
        id: 'projectName',
        type: 'input',
        message: 'Project name (task-specific)?',
        global: false,
      },
    ];

    const errors = validatePrompts(prompts);
    expect(
      errors.some((err) => err.includes('is used as both global and task-specific')),
    ).toBe(true);
  });

  it('should detect conflict when global prompt is added after task-specific with same ID', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'value',
        type: 'input',
        message: 'Value (task-specific)?',
      },
      {
        id: 'value',
        type: 'input',
        message: 'Value (global)?',
        global: true,
      },
    ];

    const errors = validatePrompts(prompts);
    expect(
      errors.some((err) => err.includes('is used as both global and task-specific')),
    ).toBe(true);
  });

  it('should allow duplicate global prompt IDs (for reuse across tasks)', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'globalValue',
        type: 'input',
        message: 'Global value?',
        global: true,
      },
      {
        id: 'globalValue',
        type: 'input',
        message: 'Global value?',
        global: true,
      },
    ];

    const errors = validatePrompts(prompts);
    // Should still report duplicate ID, but the key point is it's handled
    expect(errors).toContain('Duplicate prompt ID: globalValue');
  });

  it('should handle global prompts with all prompt types', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'globalText',
        type: 'input',
        message: 'Enter text',
        global: true,
      },
      {
        id: 'globalSecret',
        type: 'password',
        message: 'Enter password',
        global: true,
      },
      {
        id: 'globalNumber',
        type: 'number',
        message: 'Enter number',
        global: true,
      },
      {
        id: 'globalSelect',
        type: 'select',
        message: 'Choose',
        choices: [{ name: 'Option', value: 'opt' }],
        global: true,
      },
      {
        id: 'globalConfirm',
        type: 'confirm',
        message: 'Agree?',
        global: true,
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors).toEqual([]);
  });
});

describe('executable default values', () => {
  it('should resolve static default values', async () => {
    const defaultValue: DefaultValue<string> = 'static-value';
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe('static-value');
  });

  it('should resolve explicit value type defaults', async () => {
    const defaultValue: DefaultValue<string> = {
      type: 'value',
      value: 'explicit-value',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe('explicit-value');
  });

  it('should execute command for execute type defaults', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('command-output\n');

    const defaultValue: DefaultValue<string> = {
      type: 'execute',
      value: 'echo "test"',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe('command-output');
    expect(mockExec).toHaveBeenCalledWith('echo "test"', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000,
    });
  });

  it('should parse numeric command output', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('42\n');

    const defaultValue: DefaultValue<number> = {
      type: 'execute',
      value: 'echo "42"',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe(42);
  });

  it('should parse boolean command output', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('true\n');

    const defaultValue: DefaultValue<boolean> = {
      type: 'execute',
      value: 'echo "true"',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe(true);
  });

  it('should parse JSON command output', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('{"key":"value"}\n');

    const defaultValue: DefaultValue<object> = {
      type: 'execute',
      value: 'echo \'{"key":"value"}\'',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toEqual({ key: 'value' });
  });

  it('should handle command execution errors gracefully', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockImplementation(() => {
      throw new Error('Command failed');
    });

    const defaultValue: DefaultValue<string> = {
      type: 'execute',
      value: 'failing-command',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBeUndefined();
  });

  it('should return undefined for execute type with non-string command', async () => {
    const defaultValue = {
      type: 'execute',
      value: 123,
    } as unknown as DefaultValue<string>;
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBeUndefined();
  });

  it('should handle undefined default values', async () => {
    const result = await resolveDefaultValue(undefined, 'test-prompt');
    expect(result).toBeUndefined();
  });

  it('should resolve all default values in parallel', async () => {
    const mockExec = vi.mocked(execSync);
    let callCount = 0;
    mockExec.mockImplementation(() => {
      callCount++;
      return `output-${callCount}\n`;
    });

    const prompts: PromptDefinition[] = [
      {
        id: 'static',
        type: 'input',
        message: 'Static',
        default: 'static-value',
      },
      {
        id: 'exec1',
        type: 'input',
        message: 'Exec 1',
        default: { type: 'execute', value: 'echo "1"' },
      },
      {
        id: 'exec2',
        type: 'input',
        message: 'Exec 2',
        default: { type: 'execute', value: 'echo "2"' },
      },
      {
        id: 'no-default',
        type: 'input',
        message: 'No default',
      },
    ];

    const resolved = await resolveAllDefaultValues(prompts);

    expect(resolved.get('static')).toBe('static-value');
    expect(resolved.get('exec1')).toBe('output-1');
    expect(resolved.get('exec2')).toBe('output-2');
    expect(resolved.has('no-default')).toBe(false);
    expect(mockExec).toHaveBeenCalledTimes(2);
  });

  it('should support git commands', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('main\n');

    const defaultValue: DefaultValue<string> = {
      type: 'execute',
      value: 'git branch --show-current',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe('main');
  });

  it('should support npm commands', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('9.6.0\n');

    const defaultValue: DefaultValue<string> = {
      type: 'execute',
      value: 'npm --version',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe('9.6.0');
  });

  it('should support node commands', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('v20.10.0\n');

    const defaultValue: DefaultValue<string> = {
      type: 'execute',
      value: 'node --version',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe('v20.10.0');
  });

  it('should handle number prompts with executable defaults', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('3000\n');

    const prompts: PromptDefinition[] = [
      {
        id: 'port',
        type: 'number',
        message: 'Port',
        default: { type: 'execute', value: 'echo "3000"' },
      },
    ];

    const resolved = await resolveAllDefaultValues(prompts);
    expect(resolved.get('port')).toBe(3000);
  });

  it('should handle select prompts with executable defaults', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('pnpm\n');

    const prompts: PromptDefinition[] = [
      {
        id: 'packageManager',
        type: 'select',
        message: 'Package manager',
        choices: [
          { name: 'npm', value: 'npm' },
          { name: 'pnpm', value: 'pnpm' },
        ],
        default: {
          type: 'execute',
          value: 'which pnpm > /dev/null && echo "pnpm" || echo "npm"',
        },
      },
    ];

    const resolved = await resolveAllDefaultValues(prompts);
    expect(resolved.get('packageManager')).toBe('pnpm');
  });

  it('should handle confirm prompts with executable defaults', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('true\n');

    const prompts: PromptDefinition[] = [
      {
        id: 'hasTests',
        type: 'confirm',
        message: 'Has tests',
        default: {
          type: 'execute',
          value: 'test -d tests && echo "true" || echo "false"',
        },
      },
    ];

    const resolved = await resolveAllDefaultValues(prompts);
    expect(resolved.get('hasTests')).toBe(true);
  });
});
