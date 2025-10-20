/**
 * Collect variable values (no user interaction - just resolve and return)
 */

import type { VariableDefinition } from '../types.js';

/**
 * Collect variable values from resolved variables
 * Variables don't require user interaction - they're just resolved from static
 * values or executable commands
 *
 * @param variables - Array of variable definitions
 * @param resolvedValues - Map of pre-resolved variable values
 * @returns Object mapping variable IDs to their values
 */
export function collectVariables(
  variables: VariableDefinition[],
  resolvedValues: Map<string, unknown> = new Map(),
): Record<string, unknown> {
  const collected: Record<string, unknown> = {};

  for (const variable of variables) {
    const value = resolvedValues.get(variable.id);
    if (value !== undefined) {
      collected[variable.id] = value;
    }
  }

  return collected;
}
