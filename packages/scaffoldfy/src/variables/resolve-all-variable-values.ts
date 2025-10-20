/**
 * Resolve all variable values in parallel
 */

import type { VariableDefinition } from '../types.js';
import { resolveVariableValue } from './resolve-variable-value.js';

/**
 * Pre-resolve all variable values (execute commands in parallel for efficiency)
 * @param variables - Array of variable definitions
 * @returns Map of variable IDs to their resolved values
 */
export async function resolveAllVariableValues(
  variables: VariableDefinition[],
): Promise<Map<string, unknown>> {
  const resolved = new Map<string, unknown>();

  // Resolve all values in parallel
  const resolvePromises = variables.map(async (variable) => {
    const value = await resolveVariableValue(variable.value, variable.id);
    return { id: variable.id, value };
  });

  const results = await Promise.all(resolvePromises);

  // Populate the map
  for (const result of results) {
    if (result.value !== undefined) {
      resolved.set(result.id, result.value);
    }
  }

  return resolved;
}
