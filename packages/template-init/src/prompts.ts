/**
 * Prompt collection and validation for task-embedded prompts
 */

import type { PromptDefinition } from './types.js';
import { confirm, input, number, password, select } from '@inquirer/prompts';
import { log } from './utils.js';

/**
 * Collect prompt answers from task-defined prompts
 * @param prompts - Array of prompt definitions from tasks
 * @returns Object mapping prompt IDs to their values
 */
/* eslint-disable no-await-in-loop */
export async function collectPrompts(
  prompts: PromptDefinition[],
): Promise<Record<string, unknown>> {
  const answers: Record<string, unknown> = {};

  if (prompts.length === 0) {
    return answers;
  }

  for (const prompt of prompts) {
    try {
      let answer: unknown;

      switch (prompt.type) {
        case 'input': {
          const inputOptions: { message: string; default?: string; required?: boolean } =
            {
              message: prompt.message,
            };
          if (prompt.default !== undefined) {
            inputOptions.default = prompt.default;
          }
          if (prompt.required !== undefined) {
            inputOptions.required = prompt.required;
          }
          answer = await input(inputOptions);

          // Validate required
          if (
            prompt.required &&
            (answer == null || (typeof answer === 'string' && answer.trim() === ''))
          ) {
            log(`${prompt.message} is required`, 'error');
            throw new Error(`Prompt "${prompt.id}" is required`);
          }
          break;
        }

        case 'password': {
          answer = await password({
            message: prompt.message,
            mask: '*',
          });

          // Validate required
          if (
            prompt.required &&
            (answer == null || (typeof answer === 'string' && answer.trim() === ''))
          ) {
            log(`${prompt.message} is required`, 'error');
            throw new Error(`Prompt "${prompt.id}" is required`);
          }
          break;
        }

        case 'number': {
          const numberOptions: {
            message: string;
            default?: number;
            required?: boolean;
            min?: number;
            max?: number;
          } = {
            message: prompt.message,
          };
          if (prompt.default !== undefined) {
            numberOptions.default = prompt.default;
          }
          if (prompt.required !== undefined) {
            numberOptions.required = prompt.required;
          }
          if (prompt.min !== undefined) {
            numberOptions.min = prompt.min;
          }
          if (prompt.max !== undefined) {
            numberOptions.max = prompt.max;
          }
          answer = await number(numberOptions);

          // Validate required
          if (prompt.required && answer == null) {
            log(`${prompt.message} is required`, 'error');
            throw new Error(`Prompt "${prompt.id}" is required`);
          }
          break;
        }

        case 'select': {
          const selectOptions: {
            message: string;
            choices: Array<{ name: string; value: string | number | boolean }>;
            default?: string | number | boolean;
          } = {
            message: prompt.message,
            choices: prompt.choices.map((choice) => ({
              name: choice.name,
              value: choice.value,
            })),
          };
          if (prompt.default !== undefined) {
            selectOptions.default = prompt.default;
          }
          answer = await select(selectOptions);
          break;
        }

        case 'confirm': {
          answer = await confirm({
            message: prompt.message,
            default: prompt.default ?? false,
          });
          break;
        }

        default: {
          log(`Unknown prompt type: ${(prompt as { type: string }).type}`, 'error');
          throw new Error(`Unknown prompt type: ${(prompt as { type: string }).type}`);
        }
      }

      answers[prompt.id] = answer;
    } catch (error) {
      if (error instanceof Error) {
        log(`Failed to collect prompt "${prompt.id}": ${error.message}`, 'error');
      }
      throw error;
    }
  }

  console.log('');
  return answers;
}
/* eslint-enable no-await-in-loop */

/**
 * Validate prompt definitions
 * @param prompts - Array of prompt definitions to validate
 * @returns Array of validation error messages
 */
export function validatePrompts(prompts: PromptDefinition[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const globalIds = new Set<string>();
  const taskSpecificIds = new Set<string>();

  for (const prompt of prompts) {
    // Check for duplicate IDs
    if (ids.has(prompt.id)) {
      errors.push(`Duplicate prompt ID: ${prompt.id}`);
    }
    ids.add(prompt.id);

    // Track global vs task-specific IDs
    if (prompt.global) {
      globalIds.add(prompt.id);
    } else {
      // Check if a task-specific prompt conflicts with a global prompt
      if (globalIds.has(prompt.id)) {
        errors.push(
          `Prompt ID "${prompt.id}" is used as both global and task-specific. Use unique IDs or mark all instances as global.`,
        );
      }
      taskSpecificIds.add(prompt.id);
    }

    // Check if a global prompt conflicts with a task-specific prompt
    if (prompt.global && taskSpecificIds.has(prompt.id)) {
      errors.push(
        `Prompt ID "${prompt.id}" is used as both global and task-specific. Use unique IDs or mark all instances as global.`,
      );
    }

    // Validate ID format (alphanumeric and underscores only)
    if (!/^[\w-]+$/u.test(prompt.id)) {
      errors.push(
        `Invalid prompt ID "${prompt.id}": must contain only alphanumeric characters, underscores, and hyphens`,
      );
    }

    // Validate message is not empty
    if (!prompt.message || prompt.message.trim() === '') {
      errors.push(`Prompt "${prompt.id}" must have a non-empty message`);
    }

    // Type-specific validation
    if (prompt.type === 'select') {
      if (prompt.choices.length === 0) {
        errors.push(`Select prompt "${prompt.id}" must have at least one choice`);
      }

      // Validate choice structure
      for (const choice of prompt.choices) {
        if (!choice.name || choice.name.trim() === '') {
          errors.push(`Select prompt "${prompt.id}" has a choice with empty name`);
        }
        if (choice.value === undefined) {
          errors.push(`Select prompt "${prompt.id}" has a choice with undefined value`);
        }
      }
    }

    if (prompt.type === 'number') {
      if (
        prompt.min !== undefined &&
        prompt.max !== undefined &&
        prompt.min > prompt.max
      ) {
        errors.push(`Number prompt "${prompt.id}" has min greater than max`);
      }
    }
  }

  return errors;
}
