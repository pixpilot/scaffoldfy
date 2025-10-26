/**
 * Resolve a variable value that may be static or executable
 */

import type { DefaultValue, InitConfig } from '../types.js';
import { execSync } from 'node:child_process';
import { executeScriptFile } from '../plugins/exec-file/execute-script-file.js';
import { interpolateTemplate, log } from '../utils';

/**
 * Resolve a variable value that may be static, executable, or conditional
 * @param value - The variable value configuration
 * @param variableId - The variable ID for error reporting
 * @param context - Optional context for evaluating conditional values
 * @param sourceUrl - Optional source URL for resolving relative file paths in exec-file
 * @returns The resolved variable value
 */
export async function resolveVariableValue<T = string | number | boolean>(
  value: DefaultValue<T>,
  variableId: string,
  context?: InitConfig,
  sourceUrl?: string,
): Promise<T | undefined> {
  if (value === undefined || value === null) {
    return undefined;
  }

  // If it's a simple value (not an object), return it as-is
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return value as T;
  }

  // Check if it's a DefaultValueConfig
  const config = value as {
    type?: string;
    value?: unknown;
    condition?: string;
    ifTrue?: unknown;
    ifFalse?: unknown;
  };

  if (config.type === 'conditional') {
    // Handle conditional variables
    if (!context) {
      log(
        `Variable "${variableId}": conditional value requires context but none provided`,
        'warn',
      );
      return undefined;
    }

    if (typeof config.condition !== 'string') {
      log(
        `Variable "${variableId}": conditional value must have a string condition`,
        'error',
      );
      return undefined;
    }

    try {
      // Evaluate the condition
      const { evaluateCondition } = await import('../utils');
      const conditionResult = evaluateCondition(config.condition, context);

      // Get the appropriate value based on condition
      const selectedValue = conditionResult ? config.ifTrue : config.ifFalse;

      // If the selected value is an object with type, recursively resolve it
      if (typeof selectedValue === 'object' && selectedValue !== null) {
        return await resolveVariableValue(
          selectedValue as DefaultValue<T>,
          variableId,
          context,
          sourceUrl,
        );
      }

      return selectedValue as T;
    } catch (error) {
      log(
        `Variable "${variableId}": failed to evaluate conditional value: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'warn',
      );
      return undefined;
    }
  }

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
  } else if (config.type === 'interpolate') {
    // Handle interpolate type - interpolate {{variable}} placeholders
    const interpolateValue = config.value;
    if (typeof interpolateValue !== 'string') {
      log(
        `Variable "${variableId}": interpolate value must be a string with {{variable}} placeholders`,
        'error',
      );
      return undefined;
    }

    if (!context) {
      log(
        `Variable "${variableId}": interpolate value requires context but none provided`,
        'warn',
      );
      return interpolateValue as T;
    }

    // Interpolate the interpolate string with context
    try {
      const resolved = interpolateTemplate(interpolateValue, context);
      return resolved as T;
    } catch (error) {
      log(
        `Variable "${variableId}": failed to interpolate interpolate value: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'warn',
      );
      return interpolateValue as T;
    }
  } else if (config.type === 'exec-file') {
    // Handle exec-file type - execute a script file and return its output
    if (!context) {
      log(
        `Variable "${variableId}": exec-file value requires context but none provided`,
        'warn',
      );
      return undefined;
    }

    // Type assertion for exec-file config
    const execFileConfig = config as {
      type: 'exec-file';
      file: string;
      runtime?: string;
      args?: string[];
      parameters?: Record<string, string>;
      cwd?: string;
    };

    if (typeof execFileConfig.file !== 'string') {
      log(`Variable "${variableId}": exec-file value must have a file path`, 'error');
      return undefined;
    }

    try {
      // Execute the script file and capture output
      const output = await executeScriptFile(
        {
          file: execFileConfig.file,
          ...(execFileConfig.runtime != null &&
            execFileConfig.runtime.trim() !== '' && {
              runtime: execFileConfig.runtime as
                | 'node'
                | 'bash'
                | 'sh'
                | 'pwsh'
                | 'powershell',
            }),
          ...(execFileConfig.args && { args: execFileConfig.args }),
          ...(execFileConfig.parameters && { parameters: execFileConfig.parameters }),
          ...(execFileConfig.cwd !== undefined &&
            execFileConfig.cwd.trim() !== '' && { cwd: execFileConfig.cwd }),
          ...(sourceUrl != null && { sourceUrl }),
          captureOutput: true,
        },
        context,
      );

      if (output === undefined) {
        return undefined;
      }

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
        `Variable "${variableId}": failed to execute script file: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'warn',
      );
      return undefined;
    }
  } else if (config.type !== undefined) {
    // Unknown type specified
    log(
      `Variable "${variableId}": unknown value type "${config.type}". Expected "static", "exec", "conditional", "interpolate", or "exec-file".`,
      'error',
    );
    return undefined;
  }

  // If type is not specified, treat the whole object as the static value
  return value as T;
}
