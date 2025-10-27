import type {
  DynamicBooleanValue,
  EnabledValue,
  MergeStrategy,
  PromptDefinition,
  TaskDefinition,
  TasksConfiguration,
  VariableDefinition,
} from '../types.js';
import path from 'node:path';
import process from 'node:process';
import { IdConflictError } from '../errors/index.js';
import { isUrl, log } from '../utils';
import { validateUniqueIds } from './validate-unique-ids';

/**
 * Conflicting field groups for different task types
 * These fields cannot coexist in the same config
 */
const CONFLICTING_FIELDS: Record<string, string[][]> = {
  template: [['template', 'templateFile']], // template tasks can have either inline template OR templateFile
};

/**
 * Get display name for source URL
 */
function getSourceDisplayName(sourceUrl?: string): string {
  if (sourceUrl == null || sourceUrl === '') {
    return 'current configuration';
  }
  if (isUrl(sourceUrl)) {
    return sourceUrl;
  }
  // For local files, show relative path if possible
  const cwd = process.cwd();
  if (sourceUrl.startsWith(cwd)) {
    return path.relative(cwd, sourceUrl);
  }
  return sourceUrl;
}

/**
 * Merge two variable definitions (later variable overrides earlier)
 * @param base - Base variable definition
 * @param override - Override variable definition
 * @returns Merged variable definition
 */
function mergeVariable(
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

/**
 * Merge two prompt definitions (later prompt overrides earlier)
 * @param base - Base prompt definition
 * @param override - Override prompt definition
 * @returns Merged prompt definition
 */
function mergePrompt(
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

/**
 * Merge multiple configurations
 * Later configurations override earlier ones for conflicting task IDs
 * @param configurations - Array of configurations to merge (in priority order)
 * @returns Merged configuration
 */
export function mergeConfigurations(
  configurations: TasksConfiguration[],
): TasksConfiguration {
  if (configurations.length === 0) {
    // This should not happen in practice but return a minimal valid config
    return { name: 'Empty Configuration', tasks: [] };
  }

  if (configurations.length === 1) {
    const configuration = configurations[0]!;
    // Validate even for single configurations
    validateUniqueIds(
      configuration.tasks ?? [],
      configuration.variables,
      configuration.prompts,
    );
    return configuration;
  }

  // Use a Map to handle task overriding by ID
  const taskMap = new Map<string, TaskDefinition>();

  // Use a Map to handle variable overriding by ID
  const variableMap = new Map<string, VariableDefinition>();

  // Use a Map to handle prompt overriding by ID
  const promptMap = new Map<string, PromptDefinition>();

  // Track configuration enabled conditions for lazy evaluation
  const configurationEnabledMap: Record<string, DynamicBooleanValue | EnabledValue> = {};

  // Process configurations in order (earlier configurations have lower priority)
  for (const configuration of configurations) {
    // Store the configuration's enabled condition (if any)
    if (configuration.enabled != null) {
      configurationEnabledMap[configuration.name] = configuration.enabled;
    }

    // Skip configurations that are explicitly disabled (enabled: false)
    // Note: undefined or true means enabled
    // Only skip if it's the literal boolean false (not conditional expressions)
    if (configuration.enabled === false) {
      log(
        `⊘ Skipping disabled configuration "${configuration.name}" - its tasks, prompts, and variables will not be included`,
        'info',
      );
      // eslint-disable-next-line no-continue
      continue;
    }

    // Merge top-level prompts if present
    if (configuration.prompts != null) {
      for (const prompt of configuration.prompts) {
        if (promptMap.has(prompt.id)) {
          // Prompt already exists - require explicit override strategy
          if (prompt.override == null) {
            throw IdConflictError.forPrompt(prompt.id);
          }
          const existingPrompt = promptMap.get(prompt.id)!;
          const mergedPrompt = mergePrompt(existingPrompt, prompt);
          // Add configuration enabled condition for lazy evaluation
          if (configuration.enabled != null) {
            mergedPrompt.$configEnabled = configuration.enabled;
          }
          promptMap.set(prompt.id, mergedPrompt);
        } else {
          // New prompt, add it with configuration enabled condition
          const newPrompt = { ...prompt };
          if (configuration.enabled != null) {
            newPrompt.$configEnabled = configuration.enabled;
          }
          promptMap.set(prompt.id, newPrompt);
        }
      }
    }

    // Merge top-level variables if present
    if (configuration.variables != null) {
      for (const variable of configuration.variables) {
        if (variableMap.has(variable.id)) {
          // Variable already exists - require explicit override strategy
          if (variable.override == null) {
            throw IdConflictError.forVariable(variable.id);
          }
          const existingVariable = variableMap.get(variable.id)!;
          const mergedVariable = mergeVariable(existingVariable, variable);
          // Add configuration enabled condition for lazy evaluation
          if (configuration.enabled != null) {
            mergedVariable.$configEnabled = configuration.enabled;
          }
          variableMap.set(variable.id, mergedVariable);
        } else {
          // New variable, add it with configuration enabled condition
          const newVariable = { ...variable };
          if (configuration.enabled != null) {
            newVariable.$configEnabled = configuration.enabled;
          }
          variableMap.set(variable.id, newVariable);
        }
      }
    }

    // Merge tasks
    for (const task of configuration.tasks ?? []) {
      if (taskMap.has(task.id)) {
        // Task already exists - require explicit override strategy
        if (task.override == null) {
          const existing = taskMap.get(task.id)!;
          throw IdConflictError.forTask(
            task.id,
            getSourceDisplayName(existing.$sourceUrl),
            getSourceDisplayName(task.$sourceUrl),
          );
        }
        const existingTask = taskMap.get(task.id)!;
        const mergedTask = mergeTask(existingTask, task);
        // Add configuration enabled condition for lazy evaluation
        if (configuration.enabled != null) {
          mergedTask.$configEnabled = configuration.enabled;
        }
        taskMap.set(task.id, mergedTask);
      } else {
        // New task, add it with configuration enabled condition
        const newTask = { ...task };
        if (configuration.enabled != null) {
          newTask.$configEnabled = configuration.enabled;
        }
        taskMap.set(task.id, newTask);
      }
    }
  }

  // Convert maps back to arrays
  const tasks = Array.from(taskMap.values());
  const prompts = promptMap.size > 0 ? Array.from(promptMap.values()) : undefined;
  const variables = variableMap.size > 0 ? Array.from(variableMap.values()) : undefined;

  // Validate that all IDs are unique across tasks, variables, and prompts
  validateUniqueIds(tasks, variables, prompts);

  // Use the last configuration's name, description, and dependencies (highest priority)
  const lastConfiguration = configurations[configurations.length - 1]!;

  const result: TasksConfiguration = {
    name: lastConfiguration.name,
    tasks,
  };

  // Add optional fields from last configuration if they exist
  if (lastConfiguration.description != null) {
    result.description = lastConfiguration.description;
  }

  if (lastConfiguration.dependencies != null) {
    result.dependencies = lastConfiguration.dependencies;
  }

  if (lastConfiguration.enabled != null) {
    result.enabled = lastConfiguration.enabled;
  }

  // Add prompts if any exist
  if (prompts != null) {
    result.prompts = prompts;
  }

  // Add variables if any exist
  if (variables != null) {
    result.variables = variables;
  }

  return result;
}

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
 * Intelligently merge config objects, handling conflicts
 */
function mergeConfigs(
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

/**
 * Merge two task definitions (later task overrides earlier)
 * @param base - Base task definition
 * @param override - Override task definition
 * @returns Merged task definition
 */
function mergeTask(base: TaskDefinition, override: TaskDefinition): TaskDefinition {
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
    mergedConfig = mergeConfigs(
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
