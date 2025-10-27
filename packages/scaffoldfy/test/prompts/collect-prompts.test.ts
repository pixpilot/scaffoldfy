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
});
