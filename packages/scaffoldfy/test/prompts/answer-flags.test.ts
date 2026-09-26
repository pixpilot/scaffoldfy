/**
 * Tests for prompt answers passed as CLI flags
 */

import type { AnswerFlag } from '../../src/prompts/answer-flags';
import type {
  PromptDefinition,
  ScaffoldfyConfiguration,
  SelectPrompt,
} from '../../src/types';
import { describe, expect, it } from 'vitest';
import {
  findPromptId,
  formatPromptsHelp,
  parseAnswerFlags,
  resolveAnswerFlags,
  resolvePresetAnswers,
} from '../../src/prompts/answer-flags';

const workspacePrompt: SelectPrompt = {
  id: 'workspace',
  type: 'select',
  message: 'Workspace',
  choices: [
    { name: 'packages', value: 'packages' },
    { name: 'apps', value: 'apps' },
  ],
};

const prompts: PromptDefinition[] = [
  { id: 'keepExamplePackages', type: 'confirm', message: 'Keep example packages?' },
  { id: 'is_pixpilot_organization', type: 'confirm', message: 'Pixpilot org?' },
  { id: 'projectName', type: 'input', message: 'Project name' },
  workspacePrompt,
];

function flag(name: string, value?: string): AnswerFlag {
  return { flag: `--${name}`, name, value };
}

describe('parseAnswerFlags', () => {
  it('should return no flags for no arguments', () => {
    expect(parseAnswerFlags([])).toEqual([]);
  });

  it('should parse a bare flag', () => {
    expect(parseAnswerFlags(['--keepExamplePackages'])).toEqual([
      flag('keepExamplePackages'),
    ]);
  });

  it('should take the value after "="', () => {
    expect(parseAnswerFlags(['--keep-example-packages=false'])).toEqual([
      flag('keep-example-packages', 'false'),
    ]);
  });

  it('should split on the first "=" only', () => {
    expect(parseAnswerFlags(['--url=https://a.b/?x=1'])).toEqual([
      flag('url', 'https://a.b/?x=1'),
    ]);
  });

  it('should allow an empty value after "="', () => {
    expect(parseAnswerFlags(['--projectName='])).toEqual([flag('projectName', '')]);
  });

  it('should take the next argument as the value', () => {
    expect(parseAnswerFlags(['--project-name', 'my app', '--workspace', 'apps'])).toEqual(
      [flag('project-name', 'my app'), flag('workspace', 'apps')],
    );
  });

  it('should not take a following flag as the value', () => {
    expect(parseAnswerFlags(['--keepExamplePackages', '--projectName', 'x'])).toEqual([
      flag('keepExamplePackages'),
      flag('projectName', 'x'),
    ]);
  });

  it('should keep a value that starts with "-" when given with "="', () => {
    expect(parseAnswerFlags(['--offset=-5'])).toEqual([flag('offset', '-5')]);
  });

  it('should reject arguments that are not flags', () => {
    expect(() => parseAnswerFlags(['my-app'])).toThrow('Unexpected argument "my-app"');
  });

  it('should reject short flags', () => {
    expect(() => parseAnswerFlags(['-k'])).toThrow('Unknown option "-k"');
  });

  it('should reject a lone "--" and a flag without a name', () => {
    expect(() => parseAnswerFlags(['--'])).toThrow('Unknown option "--"');
    expect(() => parseAnswerFlags(['--=true'])).toThrow('Unknown option "--=true"');
  });

  it('should reject a stray value after a flag that already has one', () => {
    expect(() => parseAnswerFlags(['--projectName=a', 'b'])).toThrow(
      'Unexpected argument "b"',
    );
  });
});

describe('findPromptId', () => {
  const ids = prompts.map((prompt) => prompt.id);

  it('should find an exact match', () => {
    expect(findPromptId('keepExamplePackages', ids)).toBe('keepExamplePackages');
  });

  it('should find a camelCase id from its kebab-case form', () => {
    expect(findPromptId('keep-example-packages', ids)).toBe('keepExamplePackages');
  });

  it('should find a snake_case id from its kebab-case or camelCase form', () => {
    expect(findPromptId('is-pixpilot-organization', ids)).toBe(
      'is_pixpilot_organization',
    );
    expect(findPromptId('isPixpilotOrganization', ids)).toBe('is_pixpilot_organization');
  });

  it('should ignore case', () => {
    expect(findPromptId('PROJECT-NAME', ids)).toBe('projectName');
  });

  it('should prefer an exact match over a loose one', () => {
    expect(findPromptId('project-name', ['projectName', 'project-name'])).toBe(
      'project-name',
    );
  });

  it('should return undefined when nothing matches', () => {
    expect(findPromptId('keep-examples', ids)).toBeUndefined();
    expect(findPromptId('anything', [])).toBeUndefined();
  });
});

describe('resolveAnswerFlags', () => {
  it('should answer a confirm prompt with "true" for a bare flag', () => {
    expect(resolveAnswerFlags([flag('keep-example-packages')], prompts)).toEqual({
      keepExamplePackages: 'true',
    });
  });

  it('should answer a confirm prompt with "false" for a --no- flag', () => {
    expect(
      resolveAnswerFlags(
        [flag('no-keep-example-packages'), flag('no-isPixpilotOrganization')],
        prompts,
      ),
    ).toEqual({ keepExamplePackages: 'false', is_pixpilot_organization: 'false' });
  });

  it('should keep explicit values as-is for coercion later', () => {
    expect(
      resolveAnswerFlags(
        [
          flag('keepExamplePackages', 'no'),
          flag('project-name', 'my-app'),
          flag('workspace', 'apps'),
        ],
        prompts,
      ),
    ).toEqual({ keepExamplePackages: 'no', projectName: 'my-app', workspace: 'apps' });
  });

  it('should prefer a prompt whose id starts with "no" over negation', () => {
    const noPrompts: PromptDefinition[] = [
      { id: 'noCache', type: 'confirm', message: 'Disable cache?' },
      { id: 'cache', type: 'confirm', message: 'Cache?' },
    ];
    expect(resolveAnswerFlags([flag('no-cache')], noPrompts)).toEqual({
      noCache: 'true',
    });
  });

  it('should let the last flag win for the same prompt', () => {
    expect(
      resolveAnswerFlags(
        [flag('keepExamplePackages'), flag('keep-example-packages', 'false')],
        prompts,
      ),
    ).toEqual({ keepExamplePackages: 'false' });
  });

  it('should list every unknown flag and the available prompts', () => {
    expect(() =>
      resolveAnswerFlags([flag('dryrun'), flag('keep-examples', 'true')], prompts),
    ).toThrow(
      'Unknown option(s) --dryrun, --keep-examples: no prompt with a matching id. ' +
        'Prompts in this configuration: keepExamplePackages, is_pixpilot_organization, projectName, workspace',
    );
  });

  it('should say when the configuration has no prompts', () => {
    expect(() => resolveAnswerFlags([flag('keepExamplePackages')], [])).toThrow(
      'This configuration has no prompts',
    );
  });

  it('should require a value for a bare flag on a non-confirm prompt', () => {
    expect(() => resolveAnswerFlags([flag('projectName')], prompts)).toThrow(
      'Option --projectName needs a value, e.g. --projectName=<value>',
    );
  });

  it('should reject --no- for a non-confirm prompt', () => {
    expect(() => resolveAnswerFlags([flag('no-project-name')], prompts)).toThrow(
      'Option --no-project-name only works for yes/no (confirm) prompts',
    );
  });

  it('should treat --no- with a value as a plain (unknown) flag', () => {
    expect(() =>
      resolveAnswerFlags([flag('no-keep-example-packages', 'true')], prompts),
    ).toThrow('Unknown option(s) --no-keep-example-packages');
  });

  it('should report all problems together', () => {
    expect(() =>
      resolveAnswerFlags([flag('projectName'), flag('unknown')], prompts),
    ).toThrow(/Unknown option\(s\) --unknown[^\n]*\nOption --projectName needs a value/u);
  });
});

describe('resolvePresetAnswers', () => {
  it('should match --set keys to prompt ids like flags', () => {
    expect(resolvePresetAnswers([], [['keep-example-packages', 'yes']], prompts)).toEqual(
      { keepExamplePackages: 'yes' },
    );
  });

  it('should keep --set keys that match no prompt', () => {
    expect(resolvePresetAnswers([], [['somethingElse', 'x']], prompts)).toEqual({
      somethingElse: 'x',
    });
  });

  it('should let --set win over a flag for the same prompt', () => {
    expect(
      resolvePresetAnswers(
        [flag('keepExamplePackages'), flag('projectName', 'from-flag')],
        [['keepExamplePackages', 'false']],
        prompts,
      ),
    ).toEqual({ keepExamplePackages: 'false', projectName: 'from-flag' });
  });

  it('should throw for unknown flags even when --set is used', () => {
    expect(() =>
      resolvePresetAnswers([flag('unknown')], [['projectName', 'x']], prompts),
    ).toThrow('Unknown option(s) --unknown');
  });
});

describe('formatPromptsHelp', () => {
  it('should group prompts by configuration and skip configurations without prompts', () => {
    const configs: ScaffoldfyConfiguration[] = [
      { name: 'base', prompts: [prompts[0]!] },
      { name: 'no-prompts', tasks: [] },
      { name: 'main', prompts: [prompts[2]!] },
    ];

    expect(formatPromptsHelp(configs)).toBe(
      [
        'Prompts (answer with a flag instead of being asked; kebab-case ids work too):',
        '',
        '  base:',
        '    --[no-]keepExamplePackages  Keep example packages?',
        '',
        '  main:',
        '    --projectName <value>       Project name',
      ].join('\n'),
    );
  });

  it('should show the value placeholder for each prompt type', () => {
    const help = formatPromptsHelp([
      {
        name: 'types',
        prompts: [
          { id: 'ok', type: 'confirm', message: 'OK?' },
          { id: 'size', type: 'number', message: 'Size' },
          { id: 'secret', type: 'password', message: 'Secret' },
          workspacePrompt,
          {
            id: 'workspaces',
            type: 'checkbox',
            message: 'Workspaces',
            choices: workspacePrompt.choices,
          },
        ],
      },
    ]);

    expect(help).toContain('--[no-]ok ');
    expect(help).toContain('--size <number> ');
    expect(help).toContain('--secret <value> ');
    expect(help).toContain('--workspace <value> ');
    expect(help).toContain('--workspaces <values> ');
  });

  it('should describe choices, static defaults, required and enabled conditions', () => {
    const help = formatPromptsHelp([
      {
        name: 'details',
        prompts: [
          { ...workspacePrompt, default: 'apps', required: true },
          {
            id: 'tags',
            type: 'checkbox',
            message: 'Tags',
            choices: [
              { name: 'A', value: 'a' },
              { name: 'B', value: 'b' },
            ],
            default: ['a', 'b'],
          },
          {
            id: 'email',
            type: 'input',
            message: 'Email',
            enabled: { type: 'condition', value: 'addEmail === true' },
          },
          {
            id: 'branch',
            type: 'input',
            message: 'Branch',
            default: { type: 'exec', value: 'git branch --show-current' },
            enabled: { type: 'exec', value: 'git --version' },
          },
          { id: 'legacy', type: 'confirm', message: 'Legacy?', enabled: false },
        ],
      },
    ]);

    expect(help).toContain(
      'Workspace [choices: packages, apps; default: apps; required]',
    );
    expect(help).toContain('Tags [choices: a, b; default: a,b]');
    expect(help).toContain('Email [when: addEmail === true]');
    expect(help).toContain('Branch [conditional]');
    expect(help).toContain('Legacy? [disabled]');
  });

  it('should not let a very long flag widen every row', () => {
    const longId = 'x'.repeat(60);
    const help = formatPromptsHelp([
      {
        name: 'long',
        prompts: [
          { id: longId, type: 'input', message: 'Long' },
          { id: 'short', type: 'input', message: 'Short' },
        ],
      },
    ]);

    expect(help).toContain(`    --${longId} <value>  Long`);
    expect(help).toContain(
      `    --short <value>${' '.repeat(40 - '--short <value>'.length)}  Short`,
    );
  });

  it('should say when there are no prompts', () => {
    expect(formatPromptsHelp([{ name: 'empty' }])).toBe(
      'Prompts:\n  This configuration has no prompts.',
    );
  });
});
