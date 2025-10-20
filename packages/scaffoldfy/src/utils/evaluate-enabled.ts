/**
 * Evaluate enabled value (boolean or conditional expression)
 */

import type { EnabledValue, InitConfig } from '../types.js';
import { evaluateCondition } from '../utils.js';

/**
 * Evaluate whether a prompt or task is enabled
 * @param enabled - The enabled value (boolean or conditional object)
 * @param config - Current configuration context for evaluating conditions
 * @returns True if enabled, false otherwise
 */
export function evaluateEnabled(
  enabled: EnabledValue | undefined,
  config: InitConfig,
): boolean {
  // If enabled is not specified, default to true
  if (enabled === undefined) {
    return true;
  }

  // If it's a boolean, return it directly
  if (typeof enabled === 'boolean') {
    return enabled;
  }

  // If it's a conditional object, evaluate the condition
  if (typeof enabled === 'object' && 'condition' in enabled) {
    return evaluateCondition(enabled.condition, config);
  }

  // Default to false for any unexpected value
  return false;
}
