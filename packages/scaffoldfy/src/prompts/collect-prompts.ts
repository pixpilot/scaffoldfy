/**
 * Collect prompt answers from task-defined prompts
 */

import type { InitConfig, PromptDefinition } from '../types.js';
import { confirm, input, number, password, select } from '@inquirer/prompts';
import { PromptValidationError } from '../errors/other.js';
import { transformerManager } from '../transformers/index.js';
import { evaluateEnabledAsync, log } from '../utils';
import { evaluateRequiredAsync } from '../utils/evaluate-required.js';
import { resolveDefaultValue } from './resolve-default-value.js';

/**
 * Collect prompt answers from task-defined prompts
 * Only prompts with enabled=true (or enabled condition that evaluates to true) will be shown
 * @param prompts - Array of prompt definitions from tasks
 * @param resolvedDefaults - Map of pre-resolved default values
 * @param config - Current configuration context (for evaluating enabled conditions)
 * @returns Object mapping prompt IDs to their values
 */
/* eslint-disable no-await-in-loop */
export async function collectPrompts(
  prompts: PromptDefinition[],
  resolvedDefaults: Map<string, unknown> = new Map(),
  config: InitConfig = {},
): Promise<Record<string, unknown>> {
  const answers: Record<string, unknown> = {};

  if (prompts.length === 0) {
    return answers;
  }

  for (const prompt of prompts) {
    // First check if the template this prompt belongs to is enabled
    // This allows lazy evaluation - templates can be conditionally enabled based on previous prompts
    if (prompt.$templateEnabled != null) {
      const templateIsEnabled = await evaluateEnabledAsync(prompt.$templateEnabled, {
        ...config,
        ...answers,
      });
      if (!templateIsEnabled) {
        // Skip this prompt if its template is disabled
        // eslint-disable-next-line no-continue
        continue;
      }
    }

    // Check if prompt is enabled (evaluate condition if needed)
    // Use current config merged with collected answers for cascading conditions
    const currentContext = { ...config, ...answers };
    if (!(await evaluateEnabledAsync(prompt.enabled, currentContext))) {
      // Skip this prompt if it's disabled or condition evaluates to false
      // eslint-disable-next-line no-continue
      continue;
    }

    try {
      let answer: unknown;

      // Get the resolved default value
      // Re-resolve with current context to support template interpolation
      let defaultValue = resolvedDefaults.get(prompt.id);

      // If the original default was a string template or the prompt has a default,
      // re-resolve it with the current context
      if (prompt.default !== undefined) {
        defaultValue = await resolveDefaultValue(
          prompt.default,
          prompt.id,
          currentContext,
          prompt,
        );
      }

      switch (prompt.type) {
        case 'input': {
          const inputOptions: {
            message: string;
            default?: string;
            required?: boolean;
          } = {
            message: prompt.message,
          };
          if (defaultValue !== undefined) {
            inputOptions.default = String(defaultValue);
          }
          // Evaluate required dynamically
          const isRequired = await evaluateRequiredAsync(prompt.required, currentContext);
          if (isRequired !== undefined) {
            inputOptions.required = isRequired;
          }
          answer = await input(inputOptions);

          // Validate required
          if (
            isRequired &&
            (answer == null || (typeof answer === 'string' && answer.trim() === ''))
          ) {
            log(`${prompt.message} is required`, 'error');
            throw PromptValidationError.required(prompt.id);
          }
          break;
        }

        case 'password': {
          answer = await password({
            message: prompt.message,
            mask: '*',
          });

          // Evaluate required dynamically
          const isRequiredPwd = await evaluateRequiredAsync(
            prompt.required,
            currentContext,
          );

          // Validate required
          if (
            isRequiredPwd &&
            (answer == null || (typeof answer === 'string' && answer.trim() === ''))
          ) {
            log(`${prompt.message} is required`, 'error');
            throw PromptValidationError.required(prompt.id);
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
          // Evaluate required dynamically
          const isRequiredNum = await evaluateRequiredAsync(
            prompt.required,
            currentContext,
          );
          if (isRequiredNum !== undefined) {
            numberOptions.required = isRequiredNum;
          }
          if (prompt.min !== undefined) {
            numberOptions.min = prompt.min;
          }
          if (prompt.max !== undefined) {
            numberOptions.max = prompt.max;
          }
          answer = await number(numberOptions);

          // Validate required
          if (isRequiredNum && answer == null) {
            log(`${prompt.message} is required`, 'error');
            throw PromptValidationError.required(prompt.id);
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
          throw PromptValidationError.unknownType((prompt as { type: string }).type);
        }
      }

      // Apply transformers if defined
      if (prompt.transformers !== undefined) {
        answer = await transformerManager.apply(prompt.transformers, answer, {
          ...currentContext,
          ...answers,
        });
      }

      answers[prompt.id] = answer;
    } catch (error) {
      if (error instanceof Error) {
        log(`Failed to collect prompt "${prompt.id}": ${error.message}`, 'error');
      }
      throw error;
    }
  }

  return answers;
}
/* eslint-enable no-await-in-loop */
