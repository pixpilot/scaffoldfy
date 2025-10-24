/**
 * Validate variable definitions for errors and conflicts
 * Note: Most validation is handled by JSON Schema (AJV) in schema-validator.ts.
 * This function only checks for duplicate IDs, which JSON Schema cannot validate.
 */

import type { VariableDefinition } from '../types.js';

/**
 * Validate variable definitions for duplicate IDs
 * @param variables - Array of variable definitions to validate
 * @returns Array of error messages (empty if no errors)
 */
export function validateVariables(variables: VariableDefinition[]): string[] {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const variable of variables) {
    // Check for duplicate IDs
    // This is the only validation not covered by JSON Schema
    if (seenIds.has(variable.id)) {
      errors.push(`Duplicate variable ID: "${variable.id}"`);
    }
    seenIds.add(variable.id);
  }

  return errors;
}
