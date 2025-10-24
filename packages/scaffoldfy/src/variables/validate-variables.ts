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
    // eslint-disable-next-line regexp/prefer-w
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/u.test(variable.id)) {
      errors.push(
        `Variable ID "${variable.id}" is invalid. Must be a valid JavaScript identifier (start with letter, underscore, or $, followed by letters, digits, underscores, or $).`,
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
      const config = variable.value as {
        type?: string;
        value?: unknown;
        condition?: string;
        ifTrue?: unknown;
        ifFalse?: unknown;
      };

      // Check if type is provided
      if (config.type == null || config.type === '') {
        errors.push(
          `Variable "${variable.id}": value object must have a "type" field ("static", "exec", or "conditional")`,
        );
      }

      // Validate type
      else if (
        config.type !== 'static' &&
        config.type !== 'exec' &&
        config.type !== 'conditional'
      ) {
        errors.push(
          `Variable "${variable.id}": type must be "static", "exec", or "conditional", got "${config.type}"`,
        );
      }

      // For static and exec types, check if value is provided
      if (
        (config.type === 'static' || config.type === 'exec') &&
        (config.value === undefined || config.value === null)
      ) {
        errors.push(`Variable "${variable.id}": value config must have a "value" field`);
      }

      // For exec type, value must be a string command
      if (config.type === 'exec' && typeof config.value !== 'string') {
        errors.push(
          `Variable "${variable.id}": exec type must have a string command as value`,
        );
      }

      // For conditional type, validate required fields
      if (config.type === 'conditional') {
        if (
          config.condition === undefined ||
          config.condition === null ||
          config.condition === '' ||
          typeof config.condition !== 'string'
        ) {
          errors.push(
            `Variable "${variable.id}": conditional type must have a "condition" field with a string expression`,
          );
        }
        if (config.ifTrue === undefined) {
          errors.push(
            `Variable "${variable.id}": conditional type must have an "ifTrue" field`,
          );
        }
        if (config.ifFalse === undefined) {
          errors.push(
            `Variable "${variable.id}": conditional type must have an "ifFalse" field`,
          );
        }
      }
    }
  }

  return errors;
}
