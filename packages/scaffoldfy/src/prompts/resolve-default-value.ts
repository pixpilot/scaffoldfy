/**
 * Resolve a default value that may be static or executable
 */

import type { DefaultValue, InitConfig } from '../types.js';
import { execSync } from 'node:child_process';
import { debug, interpolateTemplate, log } from '../utils.js';

/**
 * Resolve a default value that may be static or executable
 * @param defaultValue - The default value configuration
 * @param promptId - The prompt ID for error reporting
 * @param context - Optional context for interpolating template variables in string defaults
 * @returns The resolved default value
 */
export async function resolveDefaultValue<T = string | number | boolean>(
  defaultValue: DefaultValue<T> | undefined,
  promptId: string,
  context?: InitConfig,
): Promise<T | undefined> {
  if (defaultValue === undefined) {
    return undefined;
  }

  // If it's a simple value (not an object), return it as-is
  // But if it's a string and we have context, interpolate template variables
  if (
    typeof defaultValue !== 'object' ||
    defaultValue === null ||
    Array.isArray(defaultValue)
  ) {
    // If it's a string with template variables and we have context, interpolate
    if (
      typeof defaultValue === 'string' &&
      context &&
      /\{\{\w+\}\}/u.test(defaultValue)
    ) {
      const resolved = interpolateTemplate(defaultValue, context);
      return resolved as T;
    }
    return defaultValue as T;
  }

  // Check if it's a DefaultValueConfig
  const config = defaultValue as {
    type?: string;
    value?: unknown;
    condition?: string;
    ifTrue?: unknown;
    ifFalse?: unknown;
  };

  if (config.type === 'conditional') {
    // Handle conditional defaults
    if (!context) {
      return undefined;
    }

    if (typeof config.condition !== 'string') {
      log(
        `Prompt "${promptId}": conditional default must have a string condition`,
        'error',
      );
      return undefined;
    }

    try {
      // Evaluate the condition
      const { evaluateCondition } = await import('../utils.js');
      const conditionResult = evaluateCondition(config.condition, context);

      // Get the appropriate value based on condition
      let selectedValue = conditionResult ? config.ifTrue : config.ifFalse;

      // If the selected value is a string with template variables, interpolate it
      if (typeof selectedValue === 'string' && /\{\{\w+\}\}/u.test(selectedValue)) {
        selectedValue = interpolateTemplate(selectedValue, context);
      }

      return selectedValue as T;
    } catch (error) {
      log(
        `Prompt "${promptId}": failed to evaluate conditional default: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'warn',
      );
      // Return undefined so the prompt will have no default value
      // This is safer than returning the entire config object
      return undefined;
    }
  }

  if (config.type === 'exec') {
    const command = config.value;
    if (typeof command !== 'string') {
      log(`Prompt "${promptId}": exec default value must have a string command`, 'error');
      return undefined;
    }

    try {
      // Execute the command and capture output
      const output = execSync(command, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 10000, // 10 second timeout
      });

      // Trim whitespace and newlines
      const result = output.trim();

      // Try to parse as JSON if it looks like JSON
      if (result.startsWith('{') || result.startsWith('[')) {
        try {
          return JSON.parse(result) as T;
        } catch {
          // Not JSON, return as string
          return result as T;
        }
      }

      // Try to parse as number if it looks like a number
      if (/^-?\d+(?:\.\d+)?$/u.test(result)) {
        const numValue = Number.parseFloat(result);
        if (!Number.isNaN(numValue)) {
          return numValue as T;
        }
      }

      // Try to parse as boolean if it looks like a boolean
      if (result === 'true' || result === 'false') {
        return (result === 'true') as T;
      }

      return result as T;
    } catch (error) {
      debug(
        `Prompt "${promptId}": failed to execute default value command: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      return undefined;
    }
  } else if (config.type === 'static') {
    return config.value as T;
  } else if (config.type !== undefined) {
    // Unknown type specified
    log(
      `Prompt "${promptId}": unknown default value type "${config.type}". Expected "static", "exec", or "conditional".`,
      'error',
    );
    return undefined;
  }

  // If type is not specified, treat the whole object as the static value
  return defaultValue as T;
}
