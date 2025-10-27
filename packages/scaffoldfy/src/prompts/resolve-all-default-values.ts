/**
 * Pre-resolve all executable default values in parallel
 */

import type { CurrentConfigurationContext, PromptDefinition } from '../types';
import { resolveDefaultValue } from './resolve-default-value';

/**
 * Pre-resolve all executable default values in parallel
 * @param prompts - Array of prompt definitions
 * @param context - Optional context for interpolating template variables
 * @returns Map of prompt IDs to their resolved default values
 */
export async function resolveAllDefaultValues(
  prompts: PromptDefinition[],
  context?: CurrentConfigurationContext,
): Promise<Map<string, unknown>> {
  const resolvedDefaults = new Map<string, unknown>();

  // Collect all prompts with defaults to resolve
  const resolutionPromises = prompts.map(async (prompt) => {
    if (prompt.default !== undefined) {
      const resolved = await resolveDefaultValue(
        prompt.default,
        prompt.id,
        context,
        prompt,
      );
      if (resolved !== undefined) {
        resolvedDefaults.set(prompt.id, resolved);
      }
    }
  });

  // Execute all resolutions in parallel
  await Promise.all(resolutionPromises);

  return resolvedDefaults;
}
