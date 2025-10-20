/**
 * Validate variable definitions for errors and conflicts
 */

import type { VariableDefinition } from '../types.js';

/**
 * Validate variable definitions for common errors
 * @param variables - Array of variable definitions to validate
 * @returns Array of error messages (empty if no errors)
 */
export function validateVariables(variables: VariableDefinition[]): string[] {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const variable of variables) {
    // Check for duplicate IDs
    if (seenIds.has(variable.id)) {
      errors.push(`Duplicate variable ID: "${variable.id}"`);
    }
    seenIds.add(variable.id);

    // Validate ID format (must be valid JavaScript identifier)
    if (!/^[\w$]+$/u.test(variable.id)) {
      errors.push(
        `Variable ID "${variable.id}" is invalid. Must contain only letters, numbers, underscore, or dollar sign.`,
      );
    }

    // Validate value is provided
    if (variable.value === undefined || variable.value === null) {
      errors.push(`Variable "${variable.id}" must have a value`);
    }

    // If value is an object, validate it's a proper DefaultValueConfig
    else if (
      typeof variable.value === 'object' &&
      !Array.isArray(variable.value) &&
      variable.value !== null
    ) {
      const config = variable.value as { type?: string; value?: unknown };

      // Check if type is provided
      if (config.type == null || config.type === '') {
        errors.push(
          `Variable "${variable.id}": value object must have a "type" field ("static" or "exec")`,
        );
      }

      // Validate type
      else if (config.type !== 'static' && config.type !== 'exec') {
        errors.push(
          `Variable "${variable.id}": type must be "static" or "exec", got "${config.type}"`,
        );
      }

      // Check if value is provided
      if (config.value === undefined || config.value === null) {
        errors.push(`Variable "${variable.id}": value config must have a "value" field`);
      }

      // For exec type, value must be a string command
      if (config.type === 'exec' && typeof config.value !== 'string') {
        errors.push(
          `Variable "${variable.id}": exec type must have a string command as value`,
        );
      }
    }
  }

  return errors;
}
