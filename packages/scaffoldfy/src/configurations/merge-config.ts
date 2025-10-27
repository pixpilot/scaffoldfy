import { CONFLICTING_FIELDS } from './constants';

/**
 * Intelligently merge config objects, handling conflicts
 */
export function mergeConfig(
  baseConfig: Record<string, unknown>,
  overrideConfig: Record<string, unknown>,
  taskType: string,
): Record<string, unknown> {
  // Start with base config
  const merged = { ...baseConfig };

  // Get conflict groups for this task type
  const conflictGroups = CONFLICTING_FIELDS[taskType] ?? [];

  // For each field in override, decide how to merge
  for (const [key, value] of Object.entries(overrideConfig)) {
    // Check if this field is part of a conflict group
    for (const group of conflictGroups) {
      if (group.includes(key)) {
        // This field is part of a conflict group
        // Remove ALL other fields in this group from merged config
        for (const conflictField of group) {
          if (conflictField !== key) {
            delete merged[conflictField];
          }
        }
        break;
      }
    }

    // Set the override value
    merged[key] = value;
  }

  return merged;
}
