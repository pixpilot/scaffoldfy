/**
 * Validate prompt definitions
 */

import type { PromptDefinition } from '../types.js';

/**
 * Validate prompt definitions
 * @param prompts - Array of prompt definitions to validate
 * @returns Array of validation error messages
 */
export function validatePrompts(prompts: PromptDefinition[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const prompt of prompts) {
    // Check for duplicate IDs
    if (ids.has(prompt.id)) {
      errors.push(`Duplicate prompt ID: ${prompt.id}`);
    }
    ids.add(prompt.id);

    // Validate ID format (must be valid JavaScript identifier)
    // eslint-disable-next-line regexp/prefer-w
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/u.test(prompt.id)) {
      errors.push(
        `Invalid prompt ID "${prompt.id}": must be a valid JavaScript identifier (start with letter, underscore, or $, followed by letters, digits, underscores, or $)`,
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
