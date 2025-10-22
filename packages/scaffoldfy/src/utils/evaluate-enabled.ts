/**
 * Evaluate enabled value (boolean or conditional expression)
 */

import type { EnabledValue, InitConfig } from '../types.js';
import { evaluateCondition } from '../utils.js';

/**
 * Evaluate whether a prompt or task is enabled
 * @param enabled - The enabled value (boolean, string condition, or conditional object)
 * @param config - Current configuration context for evaluating conditions
 * @param options - Optional evaluation options
 * @param options.lazy - If true, return true (assume enabled) when condition fails due to missing variables
 * @returns True if enabled, false otherwise
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
