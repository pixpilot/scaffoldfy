import type { PromptDefinition } from '../../src/types';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { select } from '@inquirer/prompts';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { collectPrompts } from '../../src/prompts/collect-prompts';
import { setPresetAnswers } from '../../src/prompts/preset-answers';

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  confirm: vi.fn(),
  input: vi.fn(),
  number: vi.fn(),
  password: vi.fn(),
  select: vi.fn(),
}));

describe('dynamic select choices', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffoldfy-choices-'));
  const script = path.join(directory, 'choices.cjs');
  fs.writeFileSync(
    script,
    'process.stdout.write(JSON.stringify([{name: process.env.CHOICE, value: process.env.CHOICE}]));',
  );
  const prompt: PromptDefinition = {
    id: 'location',
    type: 'select',
    message: 'Location',
    choices: { type: 'exec-file', file: script, parameters: { CHOICE: '{{name}}' } },
  };
  afterEach(() => {
    setPresetAnswers({});
    vi.clearAllMocks();
  });
  afterAll(() => fs.rmSync(directory, { recursive: true, force: true }));

  it('resolves choices using current prompt context', async () => {
    vi.mocked(select).mockResolvedValue('packages/core');
    expect(await collectPrompts([prompt], new Map(), { name: 'packages/core' })).toEqual({
      location: 'packages/core',
    });
    expect(select).toHaveBeenCalledWith({
      message: 'Location',
      choices: [{ name: 'packages/core', value: 'packages/core' }],
    });
  });

  it('validates preset answers against resolved choices', async () => {
    setPresetAnswers({ location: 'other' });
    await expect(
      collectPrompts([prompt], new Map(), { name: 'packages/core' }),
    ).rejects.toThrow('expected one of packages/core');
  });
});
