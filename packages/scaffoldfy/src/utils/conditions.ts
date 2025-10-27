/**
 * Utility functions for template initialization
 */

import type { CurrentConfigurationContext } from '../types';
import { log } from './logger';

// Re-export logger functions for convenience
export {
  debug,
  error as logError,
  info as logInfo,
  success as logSuccess,
  warn as logWarn,
} from './logger';

/**
 * Evaluate a condition expression with the given config
 * @param condition - JavaScript expression to evaluate
 * @param config - Configuration context for evaluation
 * @param options - Optional evaluation options
 * @param options.lazy - If true, return true (assume enabled) when condition fails due to missing variables
 * @param options.silent - If true, suppress warning messages
 * @returns The result of condition evaluation
 */
export function evaluateCondition(
  condition: string,
  config: CurrentConfigurationContext,
  options?: { lazy?: boolean; silent?: boolean },
): boolean {
  try {
    // Use all config properties (including dynamic prompt values) as context
    const context = { ...config };

    // Simple safe eval using Function constructor
    // Only allow access to the context variables
    // This is intentional for dynamic condition evaluation with controlled context
    // eslint-disable-next-line no-new-func, ts/no-implied-eval
    const func = new Function(
      ...Object.keys(context),
      `'use strict'; return (${condition})`,
    ) as (...args: unknown[]) => boolean;

    return func(...Object.values(context));
  } catch (error) {
    // In lazy mode, if the error is about an undefined variable,
    // assume the task should be included and will be filtered later
    if (options?.lazy === true && error instanceof ReferenceError) {
      // Don't log warnings in lazy mode - this is expected
      return true;
    }

    // Log warning unless silent mode is enabled
    if (options?.silent !== true) {
      log(`Failed to evaluate condition: ${condition}`, 'warn');
      if (error instanceof Error) {
        log(`  Error: ${error.message}`, 'warn');
      }
    }

    return false;
  }
}
