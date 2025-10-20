/**
 * Resolve a default value that may be static or executable
 */

import type { DefaultValue } from '../types.js';
import { execSync } from 'node:child_process';
import { log } from '../utils.js';

/**
 * Resolve a default value that may be static or executable
 * @param defaultValue - The default value configuration
 * @param promptId - The prompt ID for error reporting
 * @returns The resolved default value
 */
export async function resolveDefaultValue<T = string | number | boolean>(
  defaultValue: DefaultValue<T> | undefined,
  promptId: string,
): Promise<T | undefined> {
  if (defaultValue === undefined) {
    return undefined;
  }

  // If it's a simple value (not an object), return it as-is
  if (
    typeof defaultValue !== 'object' ||
    defaultValue === null ||
    Array.isArray(defaultValue)
  ) {
    return defaultValue as T;
  }

  // Check if it's a DefaultValueConfig
  const config = defaultValue as { type?: string; value?: unknown };

  if (config.type === 'execute') {
    const command = config.value;
    if (typeof command !== 'string') {
      log(
        `Prompt "${promptId}": execute default value must have a string command`,
        'error',
      );
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
        `Prompt "${promptId}": failed to execute default value command: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'warn',
      );
      return undefined;
    }
  } else if (config.type === 'value') {
    return config.value as T;
  }

  // If type is not specified, treat the whole object as the static value
  return defaultValue as T;
}
