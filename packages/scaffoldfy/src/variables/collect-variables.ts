/**
 * Collect variable values (no user interaction - just resolve and return)
 */

import type { InitConfig, VariableDefinition } from '../types';
import { transformerManager } from '../transformers/index';

/**
 * Collect variable values from resolved variables
 * Variables don't require user interaction - they're just resolved from static
 * values or executable commands
 *
 * @param variables - Array of variable definitions
 * @param resolvedValues - Map of pre-resolved variable values
 * @param context - Current configuration context (for transformer evaluation)
 * @returns Object mapping variable IDs to their values
 */
export async function collectVariables(
  variables: VariableDefinition[],
  resolvedValues: Map<string, unknown> = new Map(),
  context: InitConfig = {},
): Promise<Record<string, unknown>> {
  const collected: Record<string, unknown> = {};

  /* eslint-disable no-await-in-loop */
  for (const variable of variables) {
    let value = resolvedValues.get(variable.id);
    if (value !== undefined) {
      // Apply transformers if defined
      if (variable.transformers !== undefined) {
        value = await transformerManager.apply(variable.transformers, value, {
          ...context,
          ...collected,
        });
      }
      collected[variable.id] = value;
    }
  }
  /* eslint-enable no-await-in-loop */

  return collected;
}
