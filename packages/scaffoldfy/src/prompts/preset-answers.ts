/**
 * Preset prompt answers supplied from outside (e.g. `--set key=value` on the CLI).
 * A prompt with a preset answer is not shown; the preset value is used instead.
 */

import type { PromptDefinition } from '../types';
import { PromptValidationError } from '../errors/other';

const TRUE_VALUES = new Set(['true', '1', 'yes', 'y']);
const FALSE_VALUES = new Set(['false', '0', 'no', 'n']);

let presetAnswers = new Map<string, string>();

/**
 * Replace the preset answers
 */
export function setPresetAnswers(answers: Record<string, string>): void {
  presetAnswers = new Map(Object.entries(answers));
}

/**
 * Get the raw preset answer for a prompt, if one was supplied
 */
export function getPresetAnswer(promptId: string): string | undefined {
  return presetAnswers.get(promptId);
}

/**
 * Parse a `key=value` pair (split on the first `=`)
 * @throws Error when the pair has no `=` or an empty key
 */
export function parsePresetPair(pair: string): [string, string] {
  const separatorIndex = pair.indexOf('=');
  if (separatorIndex <= 0) {
    throw new Error(`Invalid --set value "${pair}". Expected format: key=value`);
  }
  return [pair.slice(0, separatorIndex).trim(), pair.slice(separatorIndex + 1)];
}

/**
 * Convert a raw preset string to the value type the prompt would produce
 * @throws PromptValidationError when the value does not fit the prompt
 */
export function coercePresetAnswer(prompt: PromptDefinition, raw: string): unknown {
  switch (prompt.type) {
    case 'confirm': {
      const normalized = raw.trim().toLowerCase();
      if (TRUE_VALUES.has(normalized)) return true;
      if (FALSE_VALUES.has(normalized)) return false;
      throw PromptValidationError.invalidValue(prompt.id, raw, 'expected true or false');
    }

    case 'number': {
      const value = Number(raw);
      if (raw.trim() === '' || Number.isNaN(value)) {
        throw PromptValidationError.invalidValue(prompt.id, raw, 'expected a number');
      }
      return value;
    }

    case 'select': {
      const choice = prompt.choices.find((c) => String(c.value) === raw);
      if (choice == null) {
        throw PromptValidationError.invalidValue(
          prompt.id,
          raw,
          `expected one of ${prompt.choices.map((c) => String(c.value)).join(', ')}`,
        );
      }
      return choice.value;
    }

    case 'checkbox': {
      const selected = raw
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value !== '');
      return selected.map((value) => {
        const choice = prompt.choices.find((c) => String(c.value) === value);
        if (choice == null) {
          throw PromptValidationError.invalidValue(
            prompt.id,
            value,
            `expected one of ${prompt.choices.map((c) => String(c.value)).join(', ')}`,
          );
        }
        return choice.value;
      });
    }

    case 'input':
    case 'password':
      return raw;

    default:
      throw PromptValidationError.unknownType((prompt as { type: string }).type);
  }
}
