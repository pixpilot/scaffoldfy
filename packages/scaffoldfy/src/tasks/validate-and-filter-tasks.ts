import type { CurrentConfigurationContext, TaskDefinition } from '../types';

import process from 'node:process';
import { validateTemplateConfig } from '../template';
import { evaluateEnabledAsync } from '../utils';
import { topologicalSort } from './task-resolver';
import { validateAllTasks } from './validate-all-tasks';

/**
 * Validate write task configuration
 */
export function validateWriteTask(task: TaskDefinition): string[] {
  const errors: string[] = [];
  const config = task.config as Record<string, unknown>;

  const template =
    typeof config['template'] === 'string' ? config['template'] : undefined;
  const templateFile =
    typeof config['templateFile'] === 'string' ? config['templateFile'] : undefined;

  const validation = validateTemplateConfig({
    ...(template !== undefined && { template }),
    ...(templateFile !== undefined && { templateFile }),
  });

  if (!validation.isValid && validation.error != null && validation.error !== '') {
    errors.push(`Task "${task.id}" (${task.name}): ${validation.error}`);
  }

  // Must have file property
  if (config['file'] == null || config['file'] === '') {
    errors.push(
      `Task "${task.id}" (${task.name}): Write task requires "file" property to specify the output file path`,
    );
  }

  return errors;
}

/**
 * Validate and filter enabled tasks
 */
export async function validateAndFilterTasks(
  tasks: TaskDefinition[],
  config: CurrentConfigurationContext,
): Promise<TaskDefinition[]> {
  // Validate all tasks
  const validationErrors = validateAllTasks(tasks);
  if (validationErrors.length > 0) {
    console.error('❌ Task validation errors:');
    validationErrors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }

  // Filter enabled tasks
  const enabledTasks = [];
  for (const task of tasks) {
    // eslint-disable-next-line no-await-in-loop
    if (await evaluateEnabledAsync(task.enabled, config)) {
      enabledTasks.push(task);
    }
  }

  return enabledTasks;
}

/**
 * Sort tasks by dependencies
 */
export function sortTasksByDependencies(
  enabledTasks: TaskDefinition[],
): TaskDefinition[] {
  return topologicalSort(enabledTasks);
}
