import type { TaskPlugin } from '../types';
import { pluginRegistry, taskTypeToPlugin } from './registries';

/**
 * Get a plugin for a task type
 * @param taskType - The task type
 * @returns The plugin or undefined if not found
 */
export function getPluginForTaskType(taskType: string): TaskPlugin | undefined {
  const pluginName = taskTypeToPlugin.get(taskType);
  if (pluginName == null) {
    return undefined;
  }
  return pluginRegistry.get(pluginName);
}

/**
 * Check if a task type is handled by a plugin
 * @param taskType - The task type to check
 * @returns True if a plugin handles this task type
 */
export function isPluginTaskType(taskType: string): boolean {
  return taskTypeToPlugin.has(taskType);
}
