/**
 * Evaluate enabled value (boolean or conditional expression)
 */

import type { EnabledValue, InitConfig } from '../types.js';
import { evaluateCondition } from '../utils.js';

/**
 * Evaluate whether a prompt or task is enabled (synchronous version)
 * @param enabled - The enabled value (boolean, string condition, or conditional object)
 * @param config - Current configuration context for evaluating conditions
 * @param options - Optional evaluation options
 * @param options.lazy - If true, return true (assume enabled) when condition fails due to missing variables
 * @returns True if enabled, false otherwise
 * @note This is the synchronous version that does NOT support executable enabled values
 */
export function evaluateEnabled(
  enabled: EnabledValue | undefined,
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

  // If it's a string, treat it as a condition expression (shorthand syntax)
  if (typeof enabled === 'string') {
    return evaluateCondition(
      enabled,
      config,
      options?.lazy === true ? { lazy: true } : undefined,
    );
  }

  // If it's an executable object, we can't execute it synchronously
  // Return true if lazy mode (to be evaluated later), false otherwise
  if (typeof enabled === 'object' && 'type' in enabled && enabled.type === 'exec') {
    return options?.lazy === true;
  }

  // If it's a conditional object, evaluate the condition
  if (typeof enabled === 'object' && 'condition' in enabled) {
    return evaluateCondition(
      enabled.condition,
      config,
      options?.lazy === true ? { lazy: true } : undefined,
    );
  }

  // Default to false for any unexpected value
  return false;
}

/**
 * Evaluate whether a template/task is enabled (asynchronous version)
 * Supports all enabled value types including executable commands
 * @param enabled - The enabled value (boolean, string condition, conditional object, or executable)
 * @param config - Current configuration context for evaluating conditions
 * @param options - Optional evaluation options
 * @param options.lazy - If true, return true (assume enabled) when condition fails due to missing variables
 * @returns True if enabled, false otherwise
 */
export async function evaluateEnabledAsync(
  enabled: EnabledValue | undefined,
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

  // If it's a string, treat it as a condition expression (shorthand syntax)
  if (typeof enabled === 'string') {
    return evaluateCondition(
      enabled,
      config,
      options?.lazy === true ? { lazy: true } : undefined,
    );
  }

  // If it's an executable object, execute the command
  if (typeof enabled === 'object' && 'type' in enabled && enabled.type === 'exec') {
    try {
      const { execSync } = await import('node:child_process');
      const { interpolateTemplate } = await import('../utils.js');

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
      const { log } = await import('../utils.js');
      log(`Failed to execute enabled command: ${enabled.value}`, 'warn');
      if (error instanceof Error) {
        log(`  Error: ${error.message}`, 'warn');
      }
      return false;
    }
  }

  // If it's a conditional object, evaluate the condition
  if (typeof enabled === 'object' && 'condition' in enabled) {
    return evaluateCondition(
      enabled.condition,
      config,
      options?.lazy === true ? { lazy: true } : undefined,
    );
  }

  // Default to false for any unexpected value
  return false;
}
