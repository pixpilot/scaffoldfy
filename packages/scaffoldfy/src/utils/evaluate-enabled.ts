/**
 * Evaluate enabled value (boolean or conditional expression)
 */

import type { DynamicBooleanValue, EnabledValue, InitConfig } from '../types.js';
import { evaluateCondition } from '../utils.js';

/**
 * Normalize old EnabledValue format to new DynamicBooleanValue format
 * Provides backwards compatibility for old string and {condition} formats
 */
function normalizeEnabledValue(
  enabled: EnabledValue | DynamicBooleanValue | undefined,
): DynamicBooleanValue | undefined {
  if (enabled === undefined || typeof enabled === 'boolean') {
    return enabled;
  }

  // Handle old string format (shorthand condition) -> convert to new format
  if (typeof enabled === 'string') {
    return { type: 'condition', value: enabled };
  }

  // Handle old {condition: "..."} format -> convert to new format
  if (typeof enabled === 'object' && 'condition' in enabled && !('type' in enabled)) {
    return { type: 'condition', value: enabled.condition };
  }

  // Already in new format or ExecutableConfig
  return enabled as DynamicBooleanValue;
}

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
  // Normalize to new format for consistent handling
  const normalizedEnabled = normalizeEnabledValue(enabled);

  // If enabled is not specified, default to true
  if (normalizedEnabled === undefined) {
    return true;
  }

  // If it's a boolean, return it directly
  if (typeof normalizedEnabled === 'boolean') {
    return normalizedEnabled;
  }

  // If it's an object, check the type
  if (typeof normalizedEnabled === 'object' && 'type' in normalizedEnabled) {
    // For exec type, we can't execute synchronously
    if (normalizedEnabled.type === 'exec') {
      return options?.lazy === true;
    }

    // For condition type, evaluate the expression
    if (normalizedEnabled.type === 'condition') {
      return evaluateCondition(
        normalizedEnabled.value,
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
  // Normalize to new format for consistent handling
  const normalizedEnabled = normalizeEnabledValue(enabled);

  // If enabled is not specified, default to true
  if (normalizedEnabled === undefined) {
    return true;
  }

  // If it's a boolean, return it directly
  if (typeof normalizedEnabled === 'boolean') {
    return normalizedEnabled;
  }

  // If it's an object, check the type
  if (typeof normalizedEnabled === 'object' && 'type' in normalizedEnabled) {
    // For exec type, execute the command
    if (normalizedEnabled.type === 'exec') {
      try {
        const { execSync } = await import('node:child_process');
        const { interpolateTemplate } = await import('../utils.js');

        // Interpolate template variables in the command
        const command = interpolateTemplate(normalizedEnabled.value, config);

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
        log(`Failed to execute enabled command: ${normalizedEnabled.value}`, 'warn');
        if (error instanceof Error) {
          log(`  Error: ${error.message}`, 'warn');
        }
        return false;
      }
    }

    // For condition type, evaluate the expression
    if (normalizedEnabled.type === 'condition') {
      return evaluateCondition(
        normalizedEnabled.value,
        config,
        options?.lazy === true ? { lazy: true } : undefined,
      );
    }
  }

  // Default to false for any unexpected value
  return false;
}
