/**
 * Collect prompt answers from task-defined prompts
 */

import type { PromptDefinition } from '../types.js';
import { confirm, input, number, password, select } from '@inquirer/prompts';
import { log } from '../utils.js';

/**
 * Collect prompt answers from task-defined prompts
 * @param prompts - Array of prompt definitions from tasks
 * @param resolvedDefaults - Map of pre-resolved default values
 * @returns Object mapping prompt IDs to their values
 */
/* eslint-disable no-await-in-loop */
export async function collectPrompts(
  prompts: PromptDefinition[],
  resolvedDefaults: Map<string, unknown> = new Map(),
): Promise<Record<string, unknown>> {
  const answers: Record<string, unknown> = {};

  if (prompts.length === 0) {
    return answers;
  }

  for (const prompt of prompts) {
    try {
      let answer: unknown;

      // Get the resolved default value
      const defaultValue = resolvedDefaults.get(prompt.id);

      switch (prompt.type) {
        case 'input': {
          const inputOptions: { message: string; default?: string; required?: boolean } =
            {
              message: prompt.message,
            };
          if (defaultValue !== undefined) {
            inputOptions.default = String(defaultValue);
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
          if (defaultValue !== undefined) {
            numberOptions.default = Number(defaultValue);
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
          if (defaultValue !== undefined) {
            selectOptions.default = defaultValue as string | number | boolean;
          }
          answer = await select(selectOptions);
          break;
        }

        case 'confirm': {
          const confirmDefault =
            defaultValue !== undefined ? Boolean(defaultValue) : false;
          answer = await confirm({
            message: prompt.message,
            default: confirmDefault,
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
