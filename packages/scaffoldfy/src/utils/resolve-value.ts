/**
 * Unified value resolution for both prompts and variables
 * Supports static, exec, exec-file, conditional, and interpolate types
 */

import type { DefaultValue, InitConfig } from '../types';
import { execSync } from 'node:child_process';
import { executeScriptFile } from '../plugins/exec-file/execute-script-file';
import { evaluateCondition, interpolateTemplate, log } from '../utils';

/**
 * Type of entity being resolved (for error messages)
 */
export type ResolveValueContext = 'Variable' | 'Prompt';

/**
 * Options for value resolution
 */
export interface ResolveValueOptions {
  /**
   * The ID of the prompt or variable being resolved (for error messages)
   */
  id: string;

  /**
   * Context type: 'Variable' or 'Prompt' (for error messages)
   */
  contextType: ResolveValueContext;

  /**
   * Optional context for evaluating conditional values and interpolation
   */
  context?: InitConfig;

  /**
   * Optional source URL for resolving relative file paths in exec-file
   */
  sourceUrl?: string;
}

/**
 * Resolve a value that may be static, executable, or conditional
 * This unified function works for both prompt default values and variable values
 *
 * @param value - The value configuration
 * @param options - Resolution options including ID, context type, and context
 * @returns The resolved value
 */
export async function resolveValue<T = string | number | boolean>(
  value: DefaultValue<T>,
  options: ResolveValueOptions,
): Promise<T | undefined> {
  const { id, contextType, context, sourceUrl } = options;

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

  // Handle conditional values
  if (config.type === 'conditional') {
    if (!context) {
      log(
        `${contextType} "${id}": conditional value requires context but none provided`,
        'warn',
      );
      return undefined;
    }

    if (typeof config.condition !== 'string') {
      log(
        `${contextType} "${id}": conditional value must have a string condition`,
        'error',
      );
      return undefined;
    }

    try {
      // Evaluate the condition
      const conditionResult = evaluateCondition(config.condition, context);

      // Get the appropriate value based on condition
      const selectedValue = conditionResult ? config.ifTrue : config.ifFalse;

      // If the selected value is an object with type, recursively resolve it
      if (typeof selectedValue === 'object' && selectedValue !== null) {
        return await resolveValue(selectedValue as DefaultValue<T>, options);
      }

      return selectedValue as T;
    } catch (error) {
      log(
        `${contextType} "${id}": failed to evaluate conditional value: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'warn',
      );
      return undefined;
    }
  }

  // Handle exec command type
  if (config.type === 'exec') {
    const command = config.value;
    if (typeof command !== 'string') {
      log(`${contextType} "${id}": exec value must have a string command`, 'error');
      return undefined;
    }

    try {
      // Execute the command and capture output
      const output = execSync(command, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 10000, // 10 second timeout
      });

      const result = parseOutput<T>(output.trim());
      return result;
    } catch (error) {
      log(
        `${contextType} "${id}": failed to execute command: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'warn',
      );
      return undefined;
    }
  }

  // Handle exec-file type
  if (config.type === 'exec-file') {
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
      log(`${contextType} "${id}": exec-file value must have a file path`, 'error');
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
        context ?? {},
      );

      if (output === undefined) {
        return undefined;
      }

      const result = parseOutput<T>(output.trim());
      return result;
    } catch (error) {
      log(
        `${contextType} "${id}": failed to execute script file: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'warn',
      );
      return undefined;
    }
  }

  // Handle static type
  if (config.type === 'static') {
    return config.value as T;
  }

  // Handle interpolate type
  if (config.type === 'interpolate') {
    const interpolateValue = config.value;
    if (typeof interpolateValue !== 'string') {
      log(
        `${contextType} "${id}": interpolate value must be a string with {{variable}} placeholders`,
        'error',
      );
      return undefined;
    }

    if (!context) {
      log(
        `${contextType} "${id}": interpolate value requires context but none provided`,
        'warn',
      );
      return interpolateValue as T;
    }

    try {
      const resolved = interpolateTemplate(interpolateValue, context);
      return resolved as T;
    } catch (error) {
      log(
        `${contextType} "${id}": failed to interpolate value: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'warn',
      );
      return interpolateValue as T;
    }
  }

  // Unknown type specified
  if (config.type !== undefined) {
    log(
      `${contextType} "${id}": unknown value type "${config.type}". Expected "static", "exec", "exec-file", "conditional", or "interpolate".`,
      'error',
    );
    return undefined;
  }

  // If type is not specified, treat the whole object as the static value
  return value as T;
}

/**
 * Parse output from exec or exec-file commands
 * Attempts to parse as JSON, number, or boolean
 * @param output - The trimmed output string
 * @returns The parsed value
 */
function parseOutput<T>(output: string): T {
  // Try to parse as JSON if it looks like JSON
  if (output.startsWith('{') || output.startsWith('[')) {
    try {
      return JSON.parse(output) as T;
    } catch {
      // Not JSON, return as string
      return output as T;
    }
  }

  // Try to parse as number if it looks like a number
  if (/^-?\d+(?:\.\d+)?$/u.test(output)) {
    const numValue = Number.parseFloat(output);
    if (!Number.isNaN(numValue)) {
      return numValue as T;
    }
  }

  // Try to parse as boolean if it looks like a boolean
  if (output === 'true' || output === 'false') {
    return (output === 'true') as T;
  }

  return output as T;
}
