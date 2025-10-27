/**
 * Tests for prompt validation
 */

import type { PromptDefinition } from '../../src/types';
import { describe, expect, it } from 'vitest';
import { validatePrompts } from '../../src/prompts/index';

describe('validatePrompts', () => {
  it('should return no errors for valid prompts', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'projectName',
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
        id: 'apiKey',
        type: 'password',
        message: 'Enter API key',
        required: true,
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors).toEqual([]);
  });

  it('should reject hyphens in prompt ID', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'my-prompt-name',
        type: 'input',
        message: 'Test',
      },
      {
        id: 'another-prompt-id',
        type: 'confirm',
        message: 'Confirm?',
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((err) => err.includes('my-prompt-name'))).toBe(true);
    expect(errors.some((err) => err.includes('another-prompt-id'))).toBe(true);
  });

  it('should allow underscores in prompt ID', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'my_prompt_name',
        type: 'input',
        message: 'Test',
      },
      {
        id: 'another_prompt_id',
        type: 'confirm',
        message: 'Confirm?',
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors).toEqual([]);
  });

  it('should allow camelCase and PascalCase prompt IDs', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'myPromptName',
        type: 'input',
        message: 'Test',
      },
      {
        id: 'AnotherPromptId',
        type: 'confirm',
        message: 'Confirm?',
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors).toEqual([]);
  });

  it('should allow dollar sign in prompt ID', () => {
    const prompts: PromptDefinition[] = [
      {
        id: '$myPrompt',
        type: 'input',
        message: 'Test',
      },
      {
        id: 'my$Prompt',
        type: 'confirm',
        message: 'Confirm?',
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors).toEqual([]);
  });

  it('should reject prompt IDs starting with a digit', () => {
    const prompts: PromptDefinition[] = [
      {
        id: '1prompt',
        type: 'input',
        message: 'Test',
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((err) => err.includes('1prompt'))).toBe(true);
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

describe('prompt scope (no longer uses global property)', () => {
  it('should allow prompts (top-level and task-scoped are handled separately)', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'projectName',
        type: 'input',
        message: 'Project name?',
      },
      {
        id: 'author',
        type: 'input',
        message: 'Author name?',
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors).toEqual([]);
  });

  it('should allow all prompt types without global property', () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'globalText',
        type: 'input',
        message: 'Enter text',
      },
      {
        id: 'globalSecret',
        type: 'password',
        message: 'Enter password',
      },
      {
        id: 'globalNumber',
        type: 'number',
        message: 'Enter number',
      },
      {
        id: 'globalSelect',
        type: 'select',
        message: 'Choose',
        choices: [{ name: 'Option', value: 'opt' }],
      },
      {
        id: 'globalConfirm',
        type: 'confirm',
        message: 'Agree?',
      },
    ];

    const errors = validatePrompts(prompts);
    expect(errors).toEqual([]);
  });
});
