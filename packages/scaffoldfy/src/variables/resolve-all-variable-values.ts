/**
 * Resolve all variable values sequentially (to support lazy template evaluation)
 */

/* eslint-disable no-await-in-loop */
import type { InitConfig, VariableDefinition } from '../types.js';
import { evaluateEnabledAsync, resolveValue } from '../utils.js';

/**
 * Resolve all variable values sequentially to allow lazy evaluation of template enabled conditions
 * Each variable can access values from previous variables and prompts
 * @param variables - Array of variable definitions
 * @param context - Optional context for evaluating conditional variables
 * @param options - Optional resolution options
 * @param options.skipConditional - If true, skip conditional variables (they will be resolved later)
 * @returns Map of variable IDs to their resolved values
 */
export async function resolveAllVariableValues(
  variables: VariableDefinition[],
  context?: InitConfig,
  options?: { skipConditional?: boolean },
): Promise<Map<string, unknown>> {
  const resolved = new Map<string, unknown>();

  // Process variables sequentially to allow lazy evaluation of template enabled conditions
  // Each variable can access values from previous variables
  for (const variable of variables) {
    // Skip conditional variables if requested (they will be resolved after prompts)
    if (options?.skipConditional === true) {
      if (
        typeof variable.value === 'object' &&
        variable.value !== null &&
        !Array.isArray(variable.value)
      ) {
        const valueConfig = variable.value as { type?: string };
        if (valueConfig.type === 'conditional') {
          // eslint-disable-next-line no-continue
          continue;
        }
      }
    }
    // Check if the template this variable belongs to is enabled
    // This allows lazy evaluation - templates can be conditionally enabled based on previous variables/prompts
    if (variable.$templateEnabled != null) {
      // Merge resolved variables into context for evaluation
      const currentContext = { ...context };
      for (const [id, value] of resolved.entries()) {
        currentContext[id] = value;
      }

      const templateIsEnabled = await evaluateEnabledAsync(
        variable.$templateEnabled,
        currentContext,
      );

      if (!templateIsEnabled) {
        // Skip this variable if its template is disabled
        // eslint-disable-next-line no-continue
        continue;
      }
    }

    // Merge resolved variables into context before resolving this variable
    const currentContext = { ...context };
    for (const [id, value] of resolved.entries()) {
      currentContext[id] = value;
    }

    const value = await resolveValue(variable.value, {
      id: variable.id,
      contextType: 'Variable',
      context: currentContext,
      ...(variable.$sourceUrl != null && { sourceUrl: variable.$sourceUrl }),
    });

    if (value !== undefined) {
      resolved.set(variable.id, value);
    }
  }

  return resolved;
}
