/**
 * Evaluate required value (boolean or conditional expression)
 */

import type { CurrentConfigurationContext, DynamicBooleanValue } from '../types';

/**
 * Evaluate a condition for the 'required' property
 * Unlike evaluateCondition which returns false on errors,
 * this returns true on errors (fail-safe: treat as required when uncertain)
 */
function evaluateRequiredCondition(
  condition: string,
  config: CurrentConfigurationContext,
): boolean {
  try {
    // Use all config properties as context
    const context = { ...config };

    // Simple safe eval using Function constructor
    // eslint-disable-next-line no-new-func, ts/no-implied-eval
    const func = new Function(
      ...Object.keys(context),
      `'use strict'; return (${condition})`,
    ) as (...args: unknown[]) => boolean;

    return func(...Object.values(context));
  } catch {
    // For 'required', any error (syntax, reference, etc.) defaults to true
    // This is fail-safe: when in doubt, treat as required
    return true;
  }
}

/**
 * Normalize old required format to new DynamicBooleanValue format
 * Provides backwards compatibility for old string and {condition} formats
 */
function normalizeRequiredValue(
  required: DynamicBooleanValue | undefined,
): DynamicBooleanValue | undefined {
  if (required === undefined || typeof required === 'boolean') {
    return required;
  }

  // Handle old string format (shorthand condition) -> convert to new format
  if (typeof required === 'string') {
    return { type: 'condition', value: required };
  }

  // Handle old {condition: "..."} format -> convert to new format
  if (
    typeof required === 'object' &&
    required !== null &&
    'condition' in required &&
    !('type' in required)
  ) {
    return {
      type: 'condition',
      value: (required as { condition: string }).condition,
    };
  }

  // Already in new format or ExecutableConfig
  return required as DynamicBooleanValue;
}

/**
 * Evaluate whether a prompt, variable, or task is required (synchronous version)
 * @param required - The required value (boolean or dynamic config object)
 * @param config - Current configuration context for evaluating conditions
 * @returns True if required, false otherwise
 * @note This is the synchronous version that does NOT support executable required values
 * @note For required, we use a fail-safe approach: errors default to true (treat as required)
 */
export function evaluateRequired(
  required: DynamicBooleanValue | undefined,
  config: CurrentConfigurationContext,
): boolean {
  // Normalize to new format for consistent handling
  const normalizedRequired = normalizeRequiredValue(required);

  // If required is not specified, default to true
  if (normalizedRequired === undefined) {
    return true;
  }

  // If it's a boolean, return it directly
  if (typeof normalizedRequired === 'boolean') {
    return normalizedRequired;
  }

  // If it's an object, check the type
  if (
    typeof normalizedRequired === 'object' &&
    normalizedRequired !== null &&
    'type' in normalizedRequired
  ) {
    // For exec type, we can't execute synchronously
    // Default to false in non-lazy mode
    if (normalizedRequired.type === 'exec') {
      return false;
    }

    // For condition type, evaluate the expression
    // For 'required', we use our own evaluation that defaults to true on errors
    if (normalizedRequired.type === 'condition') {
      return evaluateRequiredCondition(normalizedRequired.value, config);
    }
  }

  // Default to true for any unexpected value (fail safe - require by default)
  return true;
}

/**
 * Evaluate whether a prompt, variable, or task is required (asynchronous version)
 * Supports all required value types including executable commands
 * @param required - The required value (boolean or dynamic config object)
 * @param config - Current configuration context for evaluating conditions
 * @returns True if required, false otherwise
 */
export async function evaluateRequiredAsync(
  required: DynamicBooleanValue | undefined,
  config: CurrentConfigurationContext,
): Promise<boolean> {
  // Normalize to new format for consistent handling
  const normalizedRequired = normalizeRequiredValue(required);

  // If required is not specified, default to true
  if (normalizedRequired === undefined) {
    return true;
  }

  // If it's a boolean, return it directly
  if (typeof normalizedRequired === 'boolean') {
    return normalizedRequired;
  }

  // If it's an object, check the type
  if (
    typeof normalizedRequired === 'object' &&
    normalizedRequired !== null &&
    'type' in normalizedRequired
  ) {
    // For exec type, execute the command and check exit code
    if (normalizedRequired.type === 'exec') {
      try {
        const { execSync } = await import('node:child_process');
        const { interpolateTemplate } = await import('../utils');

        // Interpolate template variables in the command
        const command = interpolateTemplate(normalizedRequired.value, config);

        // Execute the command
        // If exit code is 0, command succeeded -> return true (required)
        // If exit code is non-zero, command failed -> return false (not required)
        execSync(command, { encoding: 'utf-8', stdio: 'ignore' });
        return true; // Exit code 0 = success = required
      } catch (error) {
        // Command failed (non-zero exit code) or error executing
        const { log } = await import('../utils');

        // Check if it's an error with status property (exit code)
        if (
          typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          typeof (error as { status: unknown }).status === 'number'
        ) {
          const { status } = error as { status: number };
          const MAX_EXIT_CODE = 255;
          // Exit code 1-255 = command ran but failed -> not required
          // status null or undefined or other = command not found -> fail-safe to false (don't block)
          if (status >= 1 && status <= MAX_EXIT_CODE) {
            log(
              `Failed to execute required command: ${normalizedRequired.value}`,
              'warn',
            );
            if (error instanceof Error) {
              log(`  Error: ${error.message}`, 'warn');
            }
            return false;
          }
        }

        // If command execution error (not found, etc), default to false (don't block execution)
        log(`Failed to execute required command: ${normalizedRequired.value}`, 'warn');
        if (error instanceof Error) {
          log(`  Error: ${error.message}`, 'warn');
        }
        return false;
      }
    }

    // For condition type, evaluate the expression
    // For 'required', we use our own evaluation that defaults to true on errors
    if (normalizedRequired.type === 'condition') {
      return evaluateRequiredCondition(normalizedRequired.value, config);
    }
  }

  // Default to true for any unexpected value (fail safe - require by default)
  return true;
}
