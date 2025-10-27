import type { MergeStrategy, TaskDefinition } from '../types';
import { log } from 'node:console';
import { getSourceDisplayName } from '../utils';
import { CONFLICTING_FIELDS } from './constants';
import { mergeConfig } from './merge-config';

/**
 * Detect conflicting fields in config based on task type
 */
function detectConfigConflicts(
  taskType: string,
  config: Record<string, unknown>,
): string[] | null {
  const conflictGroups = CONFLICTING_FIELDS[taskType];
  if (!conflictGroups) {
    return null;
  }

  for (const group of conflictGroups) {
    const presentFields = group.filter(
      (field) => field in config && config[field] != null,
    );
    if (presentFields.length > 1) {
      return presentFields;
    }
  }

  return null;
}

/**
 * Merge two task definitions (later task overrides earlier)
 * @param base - Base task definition
 * @param override - Override task definition
 * @returns Merged task definition
 */
export function mergeTask(
  base: TaskDefinition,
  override: TaskDefinition,
): TaskDefinition {
  // Determine merge strategy
  const strategy: MergeStrategy = override.override ?? 'merge';

  // If strategy is 'replace', completely replace the base task
  if (strategy === 'replace') {
    log(
      `  → Task "${override.id}" using 'replace' strategy - completely replacing base task`,
      'info',
    );
    log(`    Base: ${getSourceDisplayName(base.$sourceUrl)}`, 'info');
    log(`    Override: ${getSourceDisplayName(override.$sourceUrl)}`, 'info');

    // Remove the override field from the final task
    const { override: _override, ...taskWithoutOverrideFlag } = override;
    return taskWithoutOverrideFlag as TaskDefinition;
  }

  // Strategy is 'merge' - intelligent merging
  log(`  → Merging task "${override.id}"`, 'info');
  log(`    Base: ${getSourceDisplayName(base.$sourceUrl)}`, 'info');
  log(`    Override: ${getSourceDisplayName(override.$sourceUrl)}`, 'info');

  // Intelligently merge config objects
  let mergedConfig: Record<string, unknown>;
  if (
    typeof base.config === 'object' &&
    base.config !== null &&
    typeof override.config === 'object' &&
    override.config !== null
  ) {
    mergedConfig = mergeConfig(
      base.config as Record<string, unknown>,
      override.config as Record<string, unknown>,
      override.type,
    );

    // Check for conflicts in the merged config
    const conflicts = detectConfigConflicts(override.type, mergedConfig);
    if (conflicts !== null && conflicts.length > 0) {
      log(
        `    ⚠️  Warning: Conflicting config fields detected: ${conflicts.join(', ')}`,
        'warn',
      );
      log(
        `    Please use override: "replace" or specify only one of these fields`,
        'warn',
      );
    }
  } else {
    mergedConfig = (override.config ?? base.config) as Record<string, unknown>;
  }

  // Merge dependencies arrays
  const mergedDependencies = [
    ...(base.dependencies ?? []),
    ...(override.dependencies ?? []),
  ];
  const uniqueDependencies =
    mergedDependencies.length > 0 ? [...new Set(mergedDependencies)] : undefined;

  // Use override's $sourceUrl if present, otherwise keep base's
  const sourceUrl = override.$sourceUrl ?? base.$sourceUrl;

  const result = {
    ...base,
    ...override,
    config: mergedConfig,
    ...(uniqueDependencies != null && { dependencies: uniqueDependencies }),
    ...(sourceUrl != null && { $sourceUrl: sourceUrl }),
  } as Record<string, unknown>;

  // Remove override field from final task
  delete result['override'];

  return result as unknown as TaskDefinition;
}
