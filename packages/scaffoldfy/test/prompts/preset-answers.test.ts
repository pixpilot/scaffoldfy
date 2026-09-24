/**
 * Tests for preset prompt answers
 */

import type { PromptDefinition } from '../../src/types';
import { input, select } from '@inquirer/prompts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PromptValidationError } from '../../src/errors/other';
import { collectPrompts } from '../../src/prompts/collect-prompts';
import {
  coercePresetAnswer,
  parsePresetPair,
  setPresetAnswers,
} from '../../src/prompts/preset-answers';

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  password: vi.fn(),
  number: vi.fn(),
  select: vi.fn(),
  checkbox: vi.fn(),
  confirm: vi.fn(),
}));

const choices = [
  { name: 'packages', value: 'packages' },
  { name: 'apps', value: 'apps' },
];

const selectPrompt: PromptDefinition = {
  id: 'workspace',
  type: 'select',
  message: 'Select workspace',
  choices,
};

describe('parsePresetPair', () => {
  it('should split on the first "="', () => {
    expect(parsePresetPair('url=a=b')).toEqual(['url', 'a=b']);
  });

  it('should allow an empty value', () => {
    expect(parsePresetPair('name=')).toEqual(['name', '']);
  });

  it('should throw when there is no key', () => {
    expect(() => parsePresetPair('=value')).toThrow('Expected format: key=value');
    expect(() => parsePresetPair('value')).toThrow('Expected format: key=value');
  });
});

describe('coercePresetAnswer', () => {
  it('should coerce confirm values', () => {
    const prompt: PromptDefinition = { id: 'ok', type: 'confirm', message: 'OK?' };
    expect(coercePresetAnswer(prompt, 'yes')).toBe(true);
    expect(coercePresetAnswer(prompt, 'FALSE')).toBe(false);
    expect(() => coercePresetAnswer(prompt, 'maybe')).toThrow(PromptValidationError);
  });

  it('should coerce number values', () => {
    const prompt: PromptDefinition = { id: 'size', type: 'number', message: 'Size' };
    expect(coercePresetAnswer(prompt, '42')).toBe(42);
    expect(() => coercePresetAnswer(prompt, 'abc')).toThrow(PromptValidationError);
    expect(() => coercePresetAnswer(prompt, '')).toThrow(PromptValidationError);
  });

  it('should match select values against choices', () => {
    expect(coercePresetAnswer(selectPrompt, 'apps')).toBe('apps');
    expect(() => coercePresetAnswer(selectPrompt, 'other')).toThrow(
      'expected one of packages, apps',
    );
  });

  it('should split checkbox values on commas', () => {
    const prompt: PromptDefinition = {
      id: 'workspaces',
      type: 'checkbox',
      message: 'Select workspaces',
      choices,
    };
    expect(coercePresetAnswer(prompt, 'packages, apps')).toEqual(['packages', 'apps']);
    expect(() => coercePresetAnswer(prompt, 'packages,other')).toThrow(
      PromptValidationError,
    );
  });

  it('should return input values unchanged', () => {
    const prompt: PromptDefinition = { id: 'name', type: 'input', message: 'Name' };
    expect(coercePresetAnswer(prompt, ' raw ')).toBe(' raw ');
  });
});

describe('collectPrompts with preset answers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    setPresetAnswers({});
  });

  it('should use the preset answer instead of asking', async () => {
    setPresetAnswers({ workspace: 'apps' });
    vi.mocked(input).mockResolvedValue('asked');

    const result = await collectPrompts([
      selectPrompt,
      { id: 'name', type: 'input', message: 'Name' },
    ]);

    expect(result).toEqual({ workspace: 'apps', name: 'asked' });
    expect(select).not.toHaveBeenCalled();
    expect(input).toHaveBeenCalledTimes(1);
  });

  it('should apply transformers to the preset answer', async () => {
    setPresetAnswers({ packageBaseName: 'My Package' });

    const result = await collectPrompts([
      {
        id: 'packageBaseName',
        type: 'input',
        message: 'Package name',
        transformers: ['kebabcase'],
      },
    ]);

    expect(result).toEqual({ packageBaseName: 'my-package' });
    expect(input).not.toHaveBeenCalled();
  });

  it('should reject an empty preset for a required prompt', async () => {
    setPresetAnswers({ name: '' });

    await expect(
      collectPrompts([{ id: 'name', type: 'input', message: 'Name', required: true }]),
    ).rejects.toThrow('Prompt "name" is required');
  });

  it('should ignore the preset when the prompt is disabled', async () => {
    setPresetAnswers({ name: 'preset' });

    const result = await collectPrompts([
      { id: 'name', type: 'input', message: 'Name', enabled: false },
    ]);

    expect(result).toEqual({ name: undefined });
  });
});
