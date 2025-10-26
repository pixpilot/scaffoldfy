/**
 * Resolve a default value that may be static or executable
 * This is now a wrapper around the unified resolveValue utility
 */

import type { DefaultValue, InitConfig, PromptDefinition } from '../types.js';
import { resolveValue } from '../utils';

/**
 * Resolve a default value that may be static or executable
 * @param defaultValue - The default value configuration
 * @param promptId - The prompt ID for error reporting
 * @param context - Optional context for interpolating template variables in string defaults
 * @param prompt - Optional prompt definition for accessing $sourceUrl
 * @returns The resolved default value
 */
export async function resolveDefaultValue<T = string | number | boolean>(
  defaultValue: DefaultValue<T> | undefined,
  promptId: string,
  context?: InitConfig,
  prompt?: PromptDefinition,
): Promise<T | undefined> {
  if (defaultValue === undefined) {
    return undefined;
  }

  // Use the unified resolveValue utility
  return resolveValue(defaultValue, {
    id: promptId,
    contextType: 'Prompt',
    ...(context != null && { context }),
    ...(prompt?.$sourceUrl != null && { sourceUrl: prompt.$sourceUrl }),
  });
}
