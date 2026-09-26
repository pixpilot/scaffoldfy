/**
 * Tests for the scaffoldfy CLI: answering prompts with flags
 */

import type { MockInstance } from 'vitest';
import type { CurrentConfigurationContext, ScaffoldfyConfiguration } from '../src/types';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { confirm, input, select } from '@inquirer/prompts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCliProgram } from '../src/cli-program';
import { clearConfigurationCache } from '../src/configurations/index';
import { runConfigurationSequentially } from '../src/configurations/run-configuration-sequentially';
import { setPresetAnswers } from '../src/prompts/preset-answers';
import { getTestTempFilesDir } from './test-utils';

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  password: vi.fn(),
  number: vi.fn(),
  select: vi.fn(),
  checkbox: vi.fn(),
  confirm: vi.fn(),
}));

// Run the real implementation, but record the options and the resulting answers
vi.mock(
  '../src/configurations/run-configuration-sequentially',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('../src/configurations/run-configuration-sequentially')
      >();
    return { runConfigurationSequentially: vi.fn(actual.runConfigurationSequentially) };
  },
);

const testDir = getTestTempFilesDir('test-fixtures', 'cli');
const SCHEMA = '../../schema/scaffoldfy.schema.json';

// Mirrors an extended config such as pixpilot-changesets-release
const baseConfig: ScaffoldfyConfiguration = {
  name: 'base',
  prompts: [
    {
      id: 'releaseToGitHubPackages',
      type: 'confirm',
      message: 'Publish to GitHub Packages?',
      default: false,
    },
    { id: 'author_name', type: 'input', message: 'Author name' },
  ],
};

// Mirrors workspace-initializer: extends the base config and adds its own prompts
const mainConfig: ScaffoldfyConfiguration = {
  name: 'main',
  extends: ['../base/scaffoldfy.json'],
  prompts: [
    {
      id: 'keepExamplePackages',
      type: 'confirm',
      message: 'Keep example packages?',
      default: false,
    },
    {
      id: 'createFirstPackagePrompt',
      type: 'confirm',
      message: 'Create packages now?',
      default: false,
    },
    {
      id: 'packageNames',
      type: 'input',
      message: 'Package names',
      required: true,
      enabled: { type: 'condition', value: 'createFirstPackagePrompt === true' },
    },
    {
      id: 'workspace',
      type: 'select',
      message: 'Workspace',
      choices: [
        { name: 'packages', value: 'packages' },
        { name: 'apps', value: 'apps' },
      ],
    },
  ],
};

const ALL_PROMPT_FLAGS = [
  '--releaseToGitHubPackages',
  '--author-name',
  'Jane',
  '--keepExamplePackages',
  '--no-create-first-package-prompt',
  '--workspace',
  'apps',
];

class ProcessExitError extends Error {
  constructor(readonly code: string | number | null | undefined) {
    super(`process.exit(${String(code)})`);
  }
}

let exitSpy: MockInstance<typeof process.exit>;
let logSpy: MockInstance<typeof console.log>;
let stdoutSpy: MockInstance<typeof process.stdout.write>;
let mainConfigPath: string;

function writeConfig(relativePath: string, config: ScaffoldfyConfiguration): string {
  const filePath = path.join(testDir, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ $schema: SCHEMA, ...config }, null, 2));
  return filePath;
}

/**
 * Run the CLI and return the first exit code (undefined when it did not exit)
 */
async function runProgram(args: string[]): Promise<string | number | null | undefined> {
  try {
    await createCliProgram().parseAsync(args, { from: 'user' });
  } catch (error) {
    if (!(error instanceof ProcessExitError)) throw error;
  }
  return exitSpy.mock.calls[0]?.[0];
}

/**
 * Run the CLI with the main config and return the first exit code
 */
async function runCli(...args: string[]): Promise<string | number | null | undefined> {
  return runProgram(['--config', mainConfigPath, ...args]);
}

/**
 * Answers collected by the last run
 */
function collectedAnswers(): CurrentConfigurationContext | undefined {
  return vi.mocked(runConfigurationSequentially).mock.calls[0]?.[2];
}

function loggedOutput(): string {
  return logSpy.mock.calls.map((call) => call.join(' ')).join('\n');
}

function stdoutOutput(): string {
  return stdoutSpy.mock.calls.map((call) => String(call[0])).join('');
}

describe('cli', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearConfigurationCache();
    writeConfig('base/scaffoldfy.json', baseConfig);
    mainConfigPath = writeConfig('main/scaffoldfy.json', mainConfig);

    // process.exit must stop the CLI, so throw instead of exiting the test runner
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new ProcessExitError(code);
    });
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    // Answers for prompts that are asked interactively
    vi.mocked(confirm).mockResolvedValue(false);
    vi.mocked(input).mockResolvedValue('Asked');
    vi.mocked(select).mockResolvedValue('packages');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setPresetAnswers({});
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('answering prompts with flags', () => {
    it('should answer every prompt without asking', async () => {
      const exitCode = await runCli(...ALL_PROMPT_FLAGS);

      expect(exitCode).toBe(0);
      expect(collectedAnswers()).toEqual({
        releaseToGitHubPackages: true,
        author_name: 'Jane',
        keepExamplePackages: true,
        createFirstPackagePrompt: false,
        packageNames: undefined,
        workspace: 'apps',
      });
      expect(confirm).not.toHaveBeenCalled();
      expect(input).not.toHaveBeenCalled();
    });

    it('should accept the camelCase and kebab-case forms of an id', async () => {
      await runCli('--keep-example-packages', '--release-to-github-packages');

      expect(collectedAnswers()).toMatchObject({
        keepExamplePackages: true,
        releaseToGitHubPackages: true,
      });
    });

    it('should accept "=value", "value" and --no- forms for confirm prompts', async () => {
      await runCli(
        '--keepExamplePackages=false',
        '--release-to-git-hub-packages',
        'no',
        '--no-createFirstPackagePrompt',
      );

      expect(collectedAnswers()).toMatchObject({
        keepExamplePackages: false,
        releaseToGitHubPackages: false,
        createFirstPackagePrompt: false,
      });
    });

    it('should answer a prompt that is enabled by another answer', async () => {
      await runCli('--create-first-package-prompt', '--package-names=a, b');

      expect(collectedAnswers()).toMatchObject({
        createFirstPackagePrompt: true,
        packageNames: 'a, b',
      });
    });

    it('should ignore the answer for a prompt that stays disabled', async () => {
      await runCli('--no-create-first-package-prompt', '--package-names', 'a');

      expect(collectedAnswers()).toMatchObject({ packageNames: undefined });
    });

    it('should still ask the prompts without a flag', async () => {
      vi.mocked(confirm).mockResolvedValue(true);
      vi.mocked(input).mockResolvedValue('Asked Author');

      await runCli('--keepExamplePackages=false', '--workspace', 'packages');

      expect(collectedAnswers()).toMatchObject({
        keepExamplePackages: false,
        releaseToGitHubPackages: true,
        author_name: 'Asked Author',
        createFirstPackagePrompt: true,
        workspace: 'packages',
      });
      expect(confirm).toHaveBeenCalledTimes(2);
      expect(confirm).not.toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Keep example packages?' }),
      );
    });

    it('should keep built-in options working alongside answer flags', async () => {
      const exitCode = await runCli(
        '--dry-run',
        ...ALL_PROMPT_FLAGS,
        '--no-validate',
        '--force',
      );

      expect(exitCode).toBe(0);
      expect(vi.mocked(runConfigurationSequentially).mock.calls[0]?.[1]).toEqual({
        dryRun: true,
        force: true,
        configFilePath: mainConfigPath,
      });
    });

    it('should combine flags with --set, letting --set win', async () => {
      await runCli(
        ...ALL_PROMPT_FLAGS,
        '--set',
        'keep-example-packages=false',
        '--set',
        'author_name=Set Author',
      );

      expect(collectedAnswers()).toMatchObject({
        keepExamplePackages: false,
        author_name: 'Set Author',
      });
    });
  });

  describe('invalid answer flags', () => {
    it('should fail on a flag that matches no prompt, listing the prompts', async () => {
      const exitCode = await runCli('--keep-examples');

      expect(exitCode).toBe(1);
      expect(runConfigurationSequentially).not.toHaveBeenCalled();
      expect(loggedOutput()).toContain(
        'Unknown option(s) --keep-examples: no prompt with a matching id. ' +
          'Prompts in this configuration: releaseToGitHubPackages, author_name, ' +
          'keepExamplePackages, createFirstPackagePrompt, packageNames, workspace',
      );
    });

    it('should fail on a mistyped built-in option instead of ignoring it', async () => {
      const exitCode = await runCli('--dryrun');

      expect(exitCode).toBe(1);
      expect(runConfigurationSequentially).not.toHaveBeenCalled();
      expect(loggedOutput()).toContain('Unknown option(s) --dryrun');
    });

    it('should fail on a bare flag for a prompt that needs a value', async () => {
      const exitCode = await runCli('--author-name', '--keepExamplePackages');

      expect(exitCode).toBe(1);
      expect(loggedOutput()).toContain('Option --author-name needs a value');
    });

    it('should fail on a value that does not fit the prompt', async () => {
      const exitCode = await runCli(...ALL_PROMPT_FLAGS, '--keepExamplePackages=maybe');

      expect(exitCode).toBe(1);
      expect(loggedOutput()).toContain(
        'Invalid value "maybe" for prompt "keepExamplePackages": expected true or false',
      );
    });

    it('should fail on a positional argument before loading the config', async () => {
      const exitCode = await runCli('my-app');

      expect(exitCode).toBe(1);
      expect(runConfigurationSequentially).not.toHaveBeenCalled();
      expect(loggedOutput()).toContain('Unexpected argument "my-app"');
    });

    it('should fail on an unknown short flag', async () => {
      const exitCode = await runCli('-k');

      expect(exitCode).toBe(1);
      expect(loggedOutput()).toContain('Unknown option "-k"');
    });
  });

  describe('help', () => {
    it('should list the prompts of the config and its extended configs', async () => {
      const exitCode = await runCli('--help');

      expect(exitCode).toBeUndefined();
      expect(runConfigurationSequentially).not.toHaveBeenCalled();

      const output = stdoutOutput();
      expect(output).toContain('Usage: scaffoldfy [options]');
      expect(output).toContain('Prompt answers:');
      expect(output).toContain(
        '\n  base:\n' +
          '    --[no-]releaseToGitHubPackages   Publish to GitHub Packages? [default: false]\n' +
          '    --author_name <value>            Author name\n',
      );
      expect(output).toContain(
        '\n  main:\n' +
          '    --[no-]keepExamplePackages       Keep example packages? [default: false]\n' +
          '    --[no-]createFirstPackagePrompt  Create packages now? [default: false]\n' +
          '    --packageNames <value>           Package names [required; when: createFirstPackagePrompt === true]\n' +
          '    --workspace <value>              Workspace [choices: packages, apps]\n',
      );
    });

    it('should support -h and ignore answer flags', async () => {
      const exitCode = await runCli('-h', '--not-a-prompt', 'value');

      expect(exitCode).toBeUndefined();
      expect(stdoutOutput()).toContain('--[no-]keepExamplePackages');
    });

    it('should show only the general help when the default config does not exist', async () => {
      const exitCode = await runProgram(['--help']);

      expect(exitCode).toBeUndefined();
      expect(stdoutOutput()).toContain('Usage: scaffoldfy [options]');
      expect(stdoutOutput()).not.toContain('Prompts (');
    });

    it('should fail when the given config does not exist', async () => {
      const exitCode = await runProgram(['--config', 'missing.json', '--help']);

      expect(exitCode).toBe(1);
      expect(stdoutOutput()).toContain('Usage: scaffoldfy [options]');
      expect(loggedOutput()).toContain('Config file not found: missing.json');
    });

    it('should fail when the given config cannot be loaded', async () => {
      const brokenConfigPath = path.join(testDir, 'broken.json');
      fs.writeFileSync(
        brokenConfigPath,
        '{ "name": "broken", "extends": ["./nope.json"] }',
      );

      const exitCode = await runProgram(['--config', brokenConfigPath, '--help']);

      expect(exitCode).toBe(1);
      expect(loggedOutput()).toContain(
        `Could not list the prompts of ${brokenConfigPath}`,
      );
    });
  });
});
