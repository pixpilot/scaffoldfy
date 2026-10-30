import type { VariableDefinition } from '../../src/types';
import { describe, expect, it } from 'vitest';
import {
  findPromptDependentVariables,
  isConditionalVariable,
} from '../../src/variables/find-prompt-dependent-variables';

describe('findPromptDependentVariables', () => {
  it('finds interpolate variables that use a prompt', () => {
    const variables: VariableDefinition[] = [
      { id: 'dir', value: { type: 'interpolate', value: 'packages/{{name}}' } },
      { id: 'year', value: { type: 'exec', value: 'node -e "console.log(1)"' } },
      { id: 'static', value: 'name' },
    ];

    expect(findPromptDependentVariables(variables, ['name'])).toEqual(new Set(['dir']));
  });

  it('follows chains of variables, whatever their order', () => {
    const variables: VariableDefinition[] = [
      { id: 'srcDir', value: { type: 'interpolate', value: '{{dir}}/src' } },
      { id: 'dir', value: { type: 'interpolate', value: 'packages/{{name}}' } },
      { id: 'other', value: { type: 'interpolate', value: '{{year}}' } },
    ];

    expect(findPromptDependentVariables(variables, ['name'])).toEqual(
      new Set(['srcDir', 'dir']),
    );
  });

  it('finds prompts in exec-file args, conditional branches and helpers', () => {
    const variables: VariableDefinition[] = [
      {
        id: 'script',
        value: { type: 'exec-file', file: './x.cjs', args: ['--name={{name}}'] },
      },
      {
        id: 'branch',
        value: {
          type: 'conditional',
          condition: 'true',
          ifTrue: { type: 'interpolate', value: '{{#if name}}{{name}}{{/if}}' },
          ifFalse: 'none',
        },
      },
    ];

    expect(findPromptDependentVariables(variables, ['name'])).toEqual(
      new Set(['script', 'branch']),
    );
  });

  it('ignores names outside placeholders', () => {
    const variables: VariableDefinition[] = [
      { id: 'gitName', value: { type: 'exec', value: 'git config user.name' } },
    ];

    expect(findPromptDependentVariables(variables, ['name'])).toEqual(new Set());
  });
});

describe('isConditionalVariable', () => {
  it('detects conditional value configs only', () => {
    expect(
      isConditionalVariable({
        id: 'a',
        value: { type: 'conditional', condition: 'true', ifTrue: 1, ifFalse: 2 },
      }),
    ).toBe(true);
    expect(isConditionalVariable({ id: 'b', value: 'conditional' })).toBe(false);
  });
});
