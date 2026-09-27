/**
 * Prompt answers passed as CLI flags named after the prompt id,
 * e.g. `--keepExamplePackages`, `--keep-example-packages=false` or `--projectName my-app`.
 *
 * Flags are parsed before the configuration is loaded and matched to prompt ids once every
 * configuration (including the ones pulled in through `extends`) is known.
 * Configurations can also pre-set answers in their `answers` field; flags override those.
 */

import type { PromptDefinition, ScaffoldfyConfiguration } from '../types';

/**
 * A `--name[=value]` flag that is not a built-in CLI option
 */
export interface AnswerFlag {
  /** Flag as written, without the value (e.g. `--keep-example-packages`) */
  flag: string;
  /** Flag name without the leading dashes */
  name: string;
  /** Explicit value, or `undefined` for a bare flag */
  value: string | undefined;
}

const FLAG_PREFIX = '--';
const NEGATION_PREFIX = 'no-';

/**
 * Normalize an id for loose matching: ignore case, `-` and `_`
 */
function normalizeId(id: string): string {
  return id.replace(/[-_]/gu, '').toLowerCase();
}

/**
 * Find the prompt id a flag name or `--set` key refers to.
 * An exact match wins; otherwise case, `-` and `_` are ignored,
 * so `keep-example-packages` finds `keepExamplePackages`.
 */
export function findPromptId(
  key: string,
  promptIds: readonly string[],
): string | undefined {
  if (promptIds.includes(key)) return key;
  const normalizedKey = normalizeId(key);
  return promptIds.find((id) => normalizeId(id) === normalizedKey);
}

/**
 * Parse the arguments commander did not recognize into answer flags.
 * A flag takes its value from `--name=value`, or from the next argument when that
 * argument does not start with `-`; otherwise it is a bare flag.
 * @throws Error for short flags and arguments that are not flags
 */
export function parseAnswerFlags(args: readonly string[]): AnswerFlag[] {
  const flags: AnswerFlag[] = [];

  for (let index = 0; index < args.length; index++) {
    const arg = args[index] ?? '';

    if (!arg.startsWith(FLAG_PREFIX) || arg.length === FLAG_PREFIX.length) {
      throw new Error(
        arg.startsWith('-')
          ? `Unknown option "${arg}"`
          : `Unexpected argument "${arg}". Prompt answers are passed as --<promptId> <value>`,
      );
    }

    const separatorIndex = arg.indexOf('=');
    const flag = separatorIndex === -1 ? arg : arg.slice(0, separatorIndex);
    const name = flag.slice(FLAG_PREFIX.length);
    if (name === '') {
      throw new Error(`Unknown option "${arg}"`);
    }

    let value: string | undefined;
    if (separatorIndex !== -1) {
      value = arg.slice(separatorIndex + 1);
    } else {
      const next = args[index + 1];
      if (next != null && !next.startsWith('-')) {
        value = next;
        index++;
      }
    }

    flags.push({ flag, name, value });
  }

  return flags;
}

/**
 * Match answer flags to prompts and return the raw answers keyed by prompt id.
 * A bare flag answers a confirm prompt with `true`, and `--no-<promptId>` answers it with `false`.
 * @throws Error listing every flag that matches no prompt or is missing a value
 */
export function resolveAnswerFlags(
  flags: readonly AnswerFlag[],
  prompts: readonly PromptDefinition[],
): Record<string, string> {
  const promptIds = prompts.map((prompt) => prompt.id);
  const promptTypes = new Map(prompts.map((prompt) => [prompt.id, prompt.type]));
  const answers: Record<string, string> = {};
  const unknownFlags: string[] = [];
  const problems: string[] = [];

  for (const { flag, name, value } of flags) {
    const promptId = findPromptId(name, promptIds);

    if (promptId != null) {
      if (value !== undefined) {
        answers[promptId] = value;
      } else if (promptTypes.get(promptId) === 'confirm') {
        answers[promptId] = 'true';
      } else {
        problems.push(`Option ${flag} needs a value, e.g. ${flag}=<value>`);
      }
      // eslint-disable-next-line no-continue
      continue;
    }

    const negatedId =
      value === undefined && name.startsWith(NEGATION_PREFIX)
        ? findPromptId(name.slice(NEGATION_PREFIX.length), promptIds)
        : undefined;

    if (negatedId == null) {
      unknownFlags.push(flag);
    } else if (promptTypes.get(negatedId) === 'confirm') {
      answers[negatedId] = 'false';
    } else {
      problems.push(`Option ${flag} only works for yes/no (confirm) prompts`);
    }
  }

  if (unknownFlags.length > 0) {
    problems.unshift(
      `Unknown option(s) ${unknownFlags.join(', ')}: no prompt with a matching id. ${
        promptIds.length > 0
          ? `Prompts in this configuration: ${promptIds.join(', ')}` //
          : 'This configuration has no prompts'
      }`,
    );
  }

  if (problems.length > 0) {
    throw new Error(problems.join('\n'));
  }

  return answers;
}

/**
 * Combine answer flags and `--set` pairs into preset answers keyed by prompt id.
 * `--set` keys use the same id matching as flags but are kept as-is when no prompt matches,
 * and a `--set` pair wins over a flag for the same prompt.
 */
export function resolvePresetAnswers(
  flags: readonly AnswerFlag[],
  setPairs: ReadonlyArray<[string, string]>,
  prompts: readonly PromptDefinition[],
): Record<string, string> {
  const promptIds = prompts.map((prompt) => prompt.id);
  const answers = resolveAnswerFlags(flags, prompts);

  for (const [key, value] of setPairs) {
    answers[findPromptId(key, promptIds) ?? key] = value;
  }

  return answers;
}

/**
 * Convert a config answer to the raw string form used by preset answers
 */
function toRawAnswer(value: unknown): string | undefined {
  if (Array.isArray(value)) return value.map(String).join(',');
  if (['string', 'number', 'boolean'].includes(typeof value)) return String(value);
  return undefined;
}

/**
 * Collect the `answers` of every configuration in load order, keyed by prompt id
 */
function collectConfigAnswers(
  configs: readonly ScaffoldfyConfiguration[],
  promptIds: readonly string[],
): { answers: Record<string, string>; problems: string[] } {
  const answers: Record<string, string> = {};
  const problems: string[] = [];

  for (const config of configs) {
    for (const [key, value] of Object.entries(config.answers ?? {})) {
      const promptId = findPromptId(key, promptIds);
      const rawAnswer = toRawAnswer(value);

      if (promptId == null) {
        problems.push(`Answer "${key}" in config "${config.name}" matches no prompt`);
      } else if (rawAnswer === undefined) {
        problems.push(
          `Answer "${key}" in config "${config.name}" must be a string, number, boolean or array`,
        );
      } else {
        answers[promptId] = rawAnswer;
      }
    }
  }

  return { answers, problems };
}

/**
 * Resolve the `answers` of every configuration into raw answers keyed by prompt id.
 * Configurations are read in load order (extended configurations first), so the config
 * passed to the CLI overrides the answers of the configs it extends.
 * Keys use the same id matching as answer flags.
 * @throws Error listing answers that match no prompt or have an unsupported value
 */
export function resolveConfigAnswers(
  configs: readonly ScaffoldfyConfiguration[],
  prompts: readonly PromptDefinition[] = configs.flatMap(
    (config) => config.prompts ?? [],
  ),
): Record<string, string> {
  const promptIds = prompts.map((prompt) => prompt.id);
  const { answers, problems } = collectConfigAnswers(configs, promptIds);

  if (problems.length > 0) {
    problems.push(
      promptIds.length > 0
        ? `Prompts in this configuration: ${promptIds.join(', ')}`
        : 'This configuration has no prompts',
    );
    throw new Error(problems.join('\n'));
  }

  return answers;
}

const MAX_HELP_TERM_WIDTH = 40;

const VALUE_PLACEHOLDERS: Record<Exclude<PromptDefinition['type'], 'confirm'>, string> = {
  input: '<value>',
  password: '<value>',
  select: '<value>',
  number: '<number>',
  checkbox: '<values>',
};

/**
 * Flag usage for a prompt, e.g. `--[no-]keepExamplePackages` or `--projectName <value>`
 */
function formatPromptFlag(prompt: PromptDefinition): string {
  return prompt.type === 'confirm'
    ? `--[no-]${prompt.id}`
    : `--${prompt.id} ${VALUE_PLACEHOLDERS[prompt.type]}`;
}

/**
 * Prompt message followed by its choices, static default, enabled condition and config answer
 */
function formatPromptDescription(
  prompt: PromptDefinition,
  configAnswer: string | undefined,
): string {
  const details: string[] = [];

  if (prompt.type === 'select' || prompt.type === 'checkbox') {
    details.push(
      `choices: ${prompt.choices.map((choice) => String(choice.value)).join(', ')}`,
    );
  }

  // Only static defaults are shown; executable/conditional defaults are resolved at runtime
  const defaultValue: unknown = prompt.default;
  if (
    ['string', 'number', 'boolean'].includes(typeof defaultValue) ||
    Array.isArray(defaultValue)
  ) {
    details.push(`default: ${String(defaultValue)}`);
  }

  if (prompt.required === true) {
    details.push('required');
  }

  if (typeof prompt.enabled === 'object') {
    details.push(
      prompt.enabled.type === 'condition'
        ? `when: ${prompt.enabled.value}`
        : 'conditional',
    );
  } else if (prompt.enabled === false) {
    details.push('disabled');
  }

  if (configAnswer !== undefined) {
    details.push(`answered in config: ${configAnswer}`);
  }

  return details.length > 0
    ? `${prompt.message} [${details.join('; ')}]`
    : prompt.message;
}

/**
 * Describe the prompts of every configuration for `--help`, grouped by configuration
 */
export function formatPromptsHelp(configs: readonly ScaffoldfyConfiguration[]): string {
  const promptIds = configs.flatMap((config) => (config.prompts ?? []).map((p) => p.id));
  // Help never fails on invalid answers; running the config reports them
  const { answers } = collectConfigAnswers(configs, promptIds);

  const sections = configs
    .map((config) => ({
      name: config.name,
      items: (config.prompts ?? []).map((prompt) => ({
        flag: formatPromptFlag(prompt),
        description: formatPromptDescription(prompt, answers[prompt.id]),
      })),
    }))
    .filter((section) => section.items.length > 0);

  if (sections.length === 0) {
    return 'Prompts:\n  This configuration has no prompts.';
  }

  const termWidth = Math.min(
    MAX_HELP_TERM_WIDTH,
    Math.max(
      ...sections.flatMap((section) => section.items.map((item) => item.flag.length)),
    ),
  );

  const lines = [
    'Prompts (answer with a flag instead of being asked; kebab-case ids work too):',
  ];
  for (const section of sections) {
    lines.push('', `  ${section.name}:`);
    for (const item of section.items) {
      lines.push(`    ${item.flag.padEnd(termWidth)}  ${item.description}`);
    }
  }

  return lines.join('\n');
}
