import type {
  DynamicBooleanValue,
  EnabledValue,
  PromptDefinition,
  ScaffoldfyConfiguration,
  TaskDefinition,
  VariableDefinition,
} from '../types';

import { IdConflictError } from '../errors/index';
import { getSourceDisplayName, log } from '../utils';
import { mergeVariable } from '../variables';
import { mergePrompt } from './merge-prompt';
import { mergeTask } from './merge-task';
import { validateUniqueIds } from './validate-unique-ids';

/**
 * Merge multiple configurations
 * Later configurations override earlier ones for conflicting task IDs
 * @param configurations - Array of configurations to merge (in priority order)
 * @returns Merged configuration
 */
export function mergeConfigurations(
  configurations: ScaffoldfyConfiguration[],
): ScaffoldfyConfiguration {
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

  const result: ScaffoldfyConfiguration = {
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
