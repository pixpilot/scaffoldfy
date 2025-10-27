import type { InitConfig, TaskDefinition } from '../types';
import { getPluginForTaskType } from './task-type-mapping';

/**
 * Execute a plugin task
 * @param task - The task to execute
 * @param config - The initialization config
 * @param options - Execution options
 * @param options.dryRun - Whether to run in dry-run mode
 * @returns Promise that resolves when the task is complete
 */
export async function executePluginTask(
  task: TaskDefinition,
  config: InitConfig,
  options: { dryRun: boolean },
): Promise<void> {
  const plugin = getPluginForTaskType(task.type);
  if (plugin == null) {
    throw new TypeError(`No plugin found for task type: ${task.type}`);
  }

  await plugin.execute(task, config, options);
}

/**
 * Get diff for a plugin task
 * @param task - The task to generate diff for
 * @param config - The initialization config
 * @returns Diff string or undefined if not supported
 */
export async function getPluginTaskDiff(
  task: TaskDefinition,
  config: InitConfig,
): Promise<string | undefined> {
  const plugin = getPluginForTaskType(task.type);
  if (plugin == null || plugin.getDiff == null) {
    return undefined;
  }

  return plugin.getDiff(task, config);
}

/**
 * Validate a plugin task
 * @param task - The task to validate
 * @returns Array of validation errors
 */
export function validatePluginTask(task: TaskDefinition): string[] {
  const plugin = getPluginForTaskType(task.type);
  if (plugin == null) {
    return [`No plugin found for task type: ${task.type}`];
  }

  if (plugin.validate == null) {
    return [];
  }

  return plugin.validate(task);
}
