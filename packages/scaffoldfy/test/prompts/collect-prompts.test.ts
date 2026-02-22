/**
 * Tests for prompt collection
 */

import type { PromptDefinition } from '../../src/types';
import { confirm, input, number, password, select } from '@inquirer/prompts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { collectPrompts } from '../../src/prompts/collect-prompts';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  password: vi.fn(),
  number: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
}));

describe('collectPrompts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty object when no prompts provided', async () => {
    const result = await collectPrompts([]);
    expect(result).toEqual({});
  });

  it('should collect input prompt', async () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'name',
        type: 'input',
        message: 'Enter your name',
      },
    ];

    vi.mocked(input).mockResolvedValue('John Doe');

    const result = await collectPrompts(prompts);
    expect(result).toEqual({ name: 'John Doe' });
    expect(input).toHaveBeenCalledWith({
      message: 'Enter your name',
      required: true,
    });
  });

  it('should collect input prompt with default value', async () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'name',
        type: 'input',
        message: 'Enter your name',
        default: 'Default Name',
      },
    ];

    vi.mocked(input).mockResolvedValue('John Doe');

    const result = await collectPrompts(prompts, new Map([['name', 'Default Name']]));
    expect(result).toEqual({ name: 'John Doe' });
    expect(input).toHaveBeenCalledWith({
      message: 'Enter your name',
      default: 'Default Name',
      required: true,
    });
  });

  it('should collect input prompt with required validation', async () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'name',
        type: 'input',
        message: 'Enter your name',
        required: true,
      },
    ];

    vi.mocked(input).mockResolvedValue('');

    await expect(collectPrompts(prompts)).rejects.toThrow('Prompt "name" is required');
  });

  it('should collect password prompt', async () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'password',
        type: 'password',
        message: 'Enter password',
      },
    ];

    vi.mocked(password).mockResolvedValue('secret123');

    const result = await collectPrompts(prompts);
    expect(result).toEqual({ password: 'secret123' });
    expect(password).toHaveBeenCalledWith({
      message: 'Enter password',
      mask: '*',
    });
  });

  it('should collect number prompt', async () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'age',
        type: 'number',
        message: 'Enter your age',
        min: 1,
        max: 120,
      },
    ];

    vi.mocked(number).mockResolvedValue(25);

    const result = await collectPrompts(prompts);
    expect(result).toEqual({ age: 25 });
    expect(number).toHaveBeenCalledWith({
      message: 'Enter your age',
      min: 1,
      max: 120,
      required: true,
    });
  });

  it('should collect number prompt with default value', async () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'age',
        type: 'number',
        message: 'Enter your age',
        default: 18,
      },
    ];

    vi.mocked(number).mockResolvedValue(25);

    const result = await collectPrompts(prompts, new Map([['age', 18]]));
    expect(result).toEqual({ age: 25 });
    expect(number).toHaveBeenCalledWith({
      message: 'Enter your age',
      default: 18,
      required: true,
    });
  });

  it('should collect select prompt', async () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'color',
        type: 'select',
        message: 'Choose a color',
        choices: [
          { name: 'Red', value: 'red' },
          { name: 'Blue', value: 'blue' },
        ],
      },
    ];

    vi.mocked(select).mockResolvedValue('red');

    const result = await collectPrompts(prompts);
    expect(result).toEqual({ color: 'red' });
    expect(select).toHaveBeenCalledWith({
      message: 'Choose a color',
      choices: [
        { name: 'Red', value: 'red' },
        { name: 'Blue', value: 'blue' },
      ],
    });
  });

  it('should collect select prompt with default value', async () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'color',
        type: 'select',
        message: 'Choose a color',
        choices: [
          { name: 'Red', value: 'red' },
          { name: 'Blue', value: 'blue' },
        ],
        default: 'blue',
      },
    ];

    vi.mocked(select).mockResolvedValue('red');

    const result = await collectPrompts(prompts, new Map([['color', 'blue']]));
    expect(result).toEqual({ color: 'red' });
    expect(select).toHaveBeenCalledWith({
      message: 'Choose a color',
      choices: [
        { name: 'Red', value: 'red' },
        { name: 'Blue', value: 'blue' },
      ],
      default: 'blue',
    });
  });

  it('should collect confirm prompt', async () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'agree',
        type: 'confirm',
        message: 'Do you agree?',
      },
    ];

    vi.mocked(confirm).mockResolvedValue(true);

    const result = await collectPrompts(prompts);
    expect(result).toEqual({ agree: true });
    expect(confirm).toHaveBeenCalledWith({
      message: 'Do you agree?',
      default: false,
    });
  });

  it('should collect confirm prompt with default value', async () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'agree',
        type: 'confirm',
        message: 'Do you agree?',
        default: true,
      },
    ];

    vi.mocked(confirm).mockResolvedValue(false);

    const result = await collectPrompts(prompts, new Map([['agree', true]]));
    expect(result).toEqual({ agree: false });
    expect(confirm).toHaveBeenCalledWith({
      message: 'Do you agree?',
      default: true,
    });
  });

  it('should handle multiple prompts', async () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'name',
        type: 'input',
        message: 'Enter your name',
      },
      {
        id: 'age',
        type: 'number',
        message: 'Enter your age',
      },
      {
        id: 'agree',
        type: 'confirm',
        message: 'Do you agree?',
      },
    ];

    vi.mocked(input).mockResolvedValue('John');
    vi.mocked(number).mockResolvedValue(30);
    vi.mocked(confirm).mockResolvedValue(true);

    const result = await collectPrompts(prompts);
    expect(result).toEqual({
      name: 'John',
      age: 30,
      agree: true,
    });
  });

  it('should throw error for unknown prompt type', async () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'unknown',
        type: 'unknown' as any,
        message: 'Unknown prompt',
      },
    ];

    await expect(collectPrompts(prompts)).rejects.toThrow('Unknown prompt type: unknown');
  });

  it('should apply transformers to default value before showing prompt', async () => {
    const resolvedDefaults = new Map<string, unknown>();
    resolvedDefaults.set('projectName', 'my awesome project');

    const prompts: PromptDefinition[] = [
      {
        id: 'projectName',
        type: 'input',
        message: 'Project name',
        transformers: ['capitalCase'],
      },
    ];

    // User accepts the default by pressing Enter
    vi.mocked(input).mockResolvedValue('My Awesome Project');

    const result = await collectPrompts(prompts, resolvedDefaults);

    // The default shown should be "My Awesome Project" (transformed)
    expect(input).toHaveBeenCalledWith({
      message: 'Project name',
      default: 'My Awesome Project',
      required: true,
    });

    // The final value should be "My Awesome Project" (not double-transformed)
    expect(result).toEqual({ projectName: 'My Awesome Project' });
  });

  it('should apply transformers to user input when they provide custom value', async () => {
    const resolvedDefaults = new Map<string, unknown>();
    resolvedDefaults.set('projectName', 'default project');

    const prompts: PromptDefinition[] = [
      {
        id: 'projectName',
        type: 'input',
        message: 'Project name',
        transformers: ['capitalCase'],
      },
    ];

    // User provides their own input instead of accepting the default
    vi.mocked(input).mockResolvedValue('user custom project');

    const result = await collectPrompts(prompts, resolvedDefaults);

    // The final value should be transformed
    expect(result).toEqual({ projectName: 'User Custom Project' });
  });

  it('should apply transformers to prompts with executable defaults', async () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'projectName',
        type: 'input',
        message: 'Project name',
        default: {
          type: 'static',
          value: 'scaffoldfy',
        },
        transformers: ['capitalCase'],
      },
    ];

    // Mock the resolved default as static value
    const resolvedDefaults = new Map<string, unknown>();
    resolvedDefaults.set('projectName', 'scaffoldfy');

    // User accepts the transformed default
    vi.mocked(input).mockResolvedValue('Scaffoldfy');

    const result = await collectPrompts(prompts, resolvedDefaults);

    // The default shown should be transformed
    expect(input).toHaveBeenCalledWith({
      message: 'Project name',
      default: 'Scaffoldfy',
      required: true,
    });

    // The final value should be "Scaffoldfy" (not double-transformed)
    expect(result).toEqual({ projectName: 'Scaffoldfy' });
  });

  it('should handle multiple transformers in sequence on default values', async () => {
    const resolvedDefaults = new Map<string, unknown>();
    resolvedDefaults.set('email', '  JOHN.DOE@EXAMPLE.COM  ');

    const prompts: PromptDefinition[] = [
      {
        id: 'email',
        type: 'input',
        message: 'Email address',
        transformers: ['trim', 'lowercase'],
      },
    ];

    // User accepts the default
    vi.mocked(input).mockResolvedValue('john.doe@example.com');

    const result = await collectPrompts(prompts, resolvedDefaults);

    // The default shown should be trimmed and lowercased
    expect(input).toHaveBeenCalledWith({
      message: 'Email address',
      default: 'john.doe@example.com',
      required: true,
    });

    // The final value should be transformed only once
    expect(result).toEqual({ email: 'john.doe@example.com' });
  });

  describe('disabled prompt context behavior', () => {
    it('should set disabled prompt value to undefined in returned answers', async () => {
      /*
       * When a prompt is skipped because its `enabled` condition is false,
       * its id must still appear in the returned answers with value `undefined`.
       * This prevents ReferenceError when later conditions reference that id.
       */
      const prompts: PromptDefinition[] = [
        {
          id: 'isNpmPackage',
          type: 'confirm',
          message: 'Is this an npm package?',
          default: false,
        },
        {
          id: 'isPublicPackage',
          type: 'confirm',
          message: 'Is this a public package?',
          default: false,
          enabled: {
            type: 'condition',
            value: 'isNpmPackage === true',
          },
        },
      ];

      // User answers false for isNpmPackage, so isPublicPackage should be skipped
      vi.mocked(confirm).mockResolvedValue(false);

      const result = await collectPrompts(prompts);

      expect(result).toHaveProperty('isNpmPackage', false);
      // Key must exist with value undefined (not simply absent)
      expect(result).toHaveProperty('isPublicPackage');
      expect(result['isPublicPackage']).toBeUndefined();
      // isPublicPackage prompt must not have been shown
      expect(confirm).toHaveBeenCalledTimes(1);
    });

    it('should not throw ReferenceError when a later condition references a skipped prompt', async () => {
      /*
       * This is the core regression test for the bug:
       *   isNpmPackage = false
       *   → isPublicPackage is skipped (enabled only when isNpmPackage is true)
       *   → bundler is skipped (enabled only when isNpmPackage is true)
       *   → bundleSizeLimit condition references both bundler and isPublicPackage
       *
       * Without the fix, evaluating bundleSizeLimit's `enabled` would throw a
       * ReferenceError because bundler and isPublicPackage are not in the context.
       * With the fix, they are present as `undefined` and the condition safely
       * evaluates to false.
       */
      const prompts: PromptDefinition[] = [
        {
          id: 'isNpmPackage',
          type: 'confirm',
          message: 'Is this an npm package?',
          default: false,
        },
        {
          id: 'isPublicPackage',
          type: 'confirm',
          message: 'Is this a public package?',
          default: false,
          enabled: {
            type: 'condition',
            value: 'isNpmPackage === true',
          },
        },
        {
          id: 'bundler',
          type: 'select',
          message: 'Select a bundler',
          choices: [
            { name: 'tsc', value: 'tsc' },
            { name: 'tsdown', value: 'tsdown' },
          ],
          enabled: {
            type: 'condition',
            value: 'isNpmPackage === true',
          },
        },
        {
          id: 'bundleSizeLimit',
          type: 'number',
          message: 'Bundle size limit in KB',
          default: 0,
          enabled: {
            type: 'condition',
            value: "bundler === 'tsdown' && isPublicPackage === true",
          },
        },
      ];

      vi.mocked(confirm).mockResolvedValue(false);

      // Must not throw
      const result = await collectPrompts(prompts);

      expect(result['isNpmPackage']).toBe(false);
      expect(result).toHaveProperty('isPublicPackage');
      expect(result['isPublicPackage']).toBeUndefined();
      expect(result).toHaveProperty('bundler');
      expect(result['bundler']).toBeUndefined();
      expect(result).toHaveProperty('bundleSizeLimit');
      expect(result['bundleSizeLimit']).toBeUndefined();
    });

    it('should not set a skipped prompt to undefined when the whole template is disabled via $configEnabled', async () => {
      /*
       * When a prompt is skipped because its *template* is disabled ($configEnabled),
       * that is a different skip path - we intentionally do NOT add the prompt id
       * to the answers. Only prompt-level `enabled` skips register undefined.
       */
      const prompts: PromptDefinition[] = [
        {
          id: 'isNpmPackage',
          type: 'confirm',
          message: 'Is this an npm package?',
          default: false,
          $configEnabled: false,
        },
      ];

      const result = await collectPrompts(prompts);

      expect(result).not.toHaveProperty('isNpmPackage');
      expect(confirm).not.toHaveBeenCalled();
    });

    it('should still prompt and return user answer when enabled condition is true', async () => {
      /*
       * Sanity check: when isNpmPackage is true, isPublicPackage should be asked
       * and its answer (not undefined) should be in the results.
       */
      const prompts: PromptDefinition[] = [
        {
          id: 'isNpmPackage',
          type: 'confirm',
          message: 'Is this an npm package?',
          default: false,
        },
        {
          id: 'isPublicPackage',
          type: 'confirm',
          message: 'Is this a public package?',
          default: false,
          enabled: {
            type: 'condition',
            value: 'isNpmPackage === true',
          },
        },
      ];

      // First call: isNpmPackage = true, second call: isPublicPackage = true
      vi.mocked(confirm).mockResolvedValueOnce(true).mockResolvedValueOnce(true);

      const result = await collectPrompts(prompts);

      expect(result['isNpmPackage']).toBe(true);
      expect(result['isPublicPackage']).toBe(true);
      expect(confirm).toHaveBeenCalledTimes(2);
    });
  });
});
