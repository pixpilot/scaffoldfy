/**
 * Resolve a variable value that may be static or executable
 */

import type { DefaultValue } from '../types.js';
import { execSync } from 'node:child_process';
import { log } from '../utils.js';

/**
 * Resolve a variable value that may be static or executable
 * @param value - The variable value configuration
 * @param variableId - The variable ID for error reporting
 * @returns The resolved variable value
 */
export async function resolveVariableValue<T = string | number | boolean>(
  value: DefaultValue<T>,
  variableId: string,
): Promise<T | undefined> {
  if (value === undefined || value === null) {
    return undefined;
  }

  // If it's a simple value (not an object), return it as-is
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return value as T;
  }

  // Check if it's a DefaultValueConfig
  const config = value as { type?: string; value?: unknown };

  if (config.type === 'exec') {
    const command = config.value;
    if (typeof command !== 'string') {
      log(`Variable "${variableId}": exec value must have a string command`, 'error');
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
      log(
        `Variable "${variableId}": failed to execute command: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'warn',
      );
      return undefined;
    }
  } else if (config.type === 'static') {
    return config.value as T;
  }

  // If type is not specified, treat the whole object as the static value
  return value as T;
}
