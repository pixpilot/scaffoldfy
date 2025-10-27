import type { MergeStrategy, VariableDefinition } from '../types';
import { log } from '../utils';

/**
 * Merge two variable definitions (later variable overrides earlier)
 * @param base - Base variable definition
 * @param override - Override variable definition
 * @returns Merged variable definition
 */
export function mergeVariable(
  base: VariableDefinition,
  override: VariableDefinition,
): VariableDefinition {
  // Determine merge strategy
  const strategy: MergeStrategy = override.override ?? 'merge';

  // If strategy is 'replace', completely replace the base variable
  if (strategy === 'replace') {
    log(`  → Variable "${override.id}" using 'replace' strategy`, 'info');
    // Remove the override field from the final variable
    const { override: _override, ...variableWithoutOverrideFlag } = override;
    return variableWithoutOverrideFlag as VariableDefinition;
  }

  // Strategy is 'merge' - for variables, this essentially means replace since variables are simple
  // But we log it for clarity
  log(`  → Variable "${override.id}" merged (value replaced)`, 'info');

  // Use override's $sourceUrl if present, otherwise keep base's
  const sourceUrl = override.$sourceUrl ?? base.$sourceUrl;

  const result = {
    ...base,
    ...override,
    ...(sourceUrl != null && { $sourceUrl: sourceUrl }),
  } as Record<string, unknown>;

  // Remove override field from final variable
  delete result['override'];

  return result as unknown as VariableDefinition;
}
