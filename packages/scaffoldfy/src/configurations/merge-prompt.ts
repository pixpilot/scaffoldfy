import type { MergeStrategy, PromptDefinition } from '../types';
import { log } from '../utils';

/**
 * Merge two prompt definitions (later prompt overrides earlier)
 * @param base - Base prompt definition
 * @param override - Override prompt definition
 * @returns Merged prompt definition
 */
export function mergePrompt(
  base: PromptDefinition,
  override: PromptDefinition,
): PromptDefinition {
  // Determine merge strategy
  const strategy: MergeStrategy = override.override ?? 'merge';

  // If strategy is 'replace', completely replace the base prompt
  if (strategy === 'replace') {
    log(`  → Prompt "${override.id}" using 'replace' strategy`, 'info');
    // Remove the override field from the final prompt
    const { override: _override, ...promptWithoutOverrideFlag } = override;
    return promptWithoutOverrideFlag as PromptDefinition;
  }

  // Strategy is 'merge' - intelligently merge prompt properties
  log(`  → Prompt "${override.id}" merged`, 'info');

  // Use override's $sourceUrl if present, otherwise keep base's
  const sourceUrl = override.$sourceUrl ?? base.$sourceUrl;

  const result = {
    ...base,
    ...override,
    ...(sourceUrl != null && { $sourceUrl: sourceUrl }),
  } as Record<string, unknown>;

  // Remove override field from final prompt
  delete result['override'];

  return result as unknown as PromptDefinition;
}
