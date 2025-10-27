/**
 * Evaluate enabled value (boolean or conditional expression)
 */

import type { DynamicBooleanValue, EnabledValue, InitConfig } from '../types';
import { evaluateCondition } from '../utils';

/**
 * Evaluate whether a prompt or task is enabled (synchronous version)
 * @param enabled - The enabled value (boolean or dynamic config object)
 * @param config - Current configuration context for evaluating conditions
 * @param options - Optional evaluation options
 * @param options.lazy - If true, return true (assume enabled) when condition fails due to missing variables
 * @returns True if enabled, false otherwise
 * @note This is the synchronous version that does NOT support executable enabled values
 */
export function evaluateEnabled(
  enabled: EnabledValue | DynamicBooleanValue | undefined,
  config: InitConfig,
  options?: { lazy?: boolean },
): boolean {
  // If enabled is not specified, default to true
  if (enabled === undefined) {
    return true;
  }

  // If it's a boolean, return it directly
  if (typeof enabled === 'boolean') {
    return enabled;
  }

  // If it's an object, check the type
  if (typeof enabled === 'object' && 'type' in enabled) {
    // For exec type, we can't execute synchronously
    if (enabled.type === 'exec') {
      return options?.lazy === true;
    }

    // For condition type, evaluate the expression
    if (enabled.type === 'condition') {
      return evaluateCondition(
        enabled.value,
        config,
        options?.lazy === true ? { lazy: true } : undefined,
      );
    }
  }

  // Default to false for any unexpected value
  return false;
}

/**
 * Evaluate whether a template/task is enabled (asynchronous version)
 * Supports all enabled value types including executable commands
 * @param enabled - The enabled value (boolean or dynamic config object)
 * @param config - Current configuration context for evaluating conditions
 * @param options - Optional evaluation options
 * @param options.lazy - If true, return true (assume enabled) when condition fails due to missing variables
 * @returns True if enabled, false otherwise
 */
export async function evaluateEnabledAsync(
  enabled: EnabledValue | DynamicBooleanValue | undefined,
  config: InitConfig,
  options?: { lazy?: boolean },
): Promise<boolean> {
  // If enabled is not specified, default to true
  if (enabled === undefined) {
    return true;
  }

  // If it's a boolean, return it directly
  if (typeof enabled === 'boolean') {
    return enabled;
  }

  // If it's an object, check the type
  if (typeof enabled === 'object' && 'type' in enabled) {
    // For exec type, execute the command
    if (enabled.type === 'exec') {
      try {
        const { execSync } = await import('node:child_process');
        const { interpolateTemplate } = await import('../utils');

        // Interpolate template variables in the command
        const command = interpolateTemplate(enabled.value, config);

        // Execute the command and get output
        const output = execSync(command, { encoding: 'utf-8' }).trim();

        // Parse output as boolean
        // Empty string, "0", "false", "no" (case-insensitive) = false
        // Everything else = true
        if (output === '' || output === '0') {
          return false;
        }
        const lowerOutput = output.toLowerCase();
        if (lowerOutput === 'false' || lowerOutput === 'no') {
          return false;
        }
        return true;
      } catch (error) {
        // If command fails, log warning and return false
        const { log } = await import('../utils');
        log(`Failed to execute enabled command: ${enabled.value}`, 'warn');
        if (error instanceof Error) {
          log(`  Error: ${error.message}`, 'warn');
        }
        return false;
      }
    }

    // For condition type, evaluate the expression
    if (enabled.type === 'condition') {
      return evaluateCondition(
        enabled.value,
        config,
        options?.lazy === true ? { lazy: true } : undefined,
      );
    }
  }

  // Default to false for any unexpected value
  return false;
}
