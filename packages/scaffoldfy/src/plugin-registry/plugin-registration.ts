import type { TaskPlugin } from '../types';
import { debug } from '../utils';
import { pluginRegistry, taskTypeToPlugin } from './registries';

/**
 * Register a plugin
 * @param plugin - The plugin to register
 */
export function registerPlugin(plugin: TaskPlugin): void {
  // Validate plugin
  if (plugin.name == null || plugin.name === '') {
    throw new TypeError('Plugin name is required');
  }

  if (!Array.isArray(plugin.taskTypes) || plugin.taskTypes.length === 0) {
    throw new TypeError(`Plugin ${plugin.name} must define at least one task type`);
  }

  if (typeof plugin.execute !== 'function') {
    throw new TypeError(`Plugin ${plugin.name} must provide an execute function`);
  }

  // Check for duplicate plugin names
  if (pluginRegistry.has(plugin.name)) {
    throw new TypeError(`Plugin ${plugin.name} is already registered`);
  }

  // Check for duplicate task types
  for (const taskType of plugin.taskTypes) {
    if (taskTypeToPlugin.has(taskType)) {
      const existingPlugin = taskTypeToPlugin.get(taskType);
      throw new TypeError(
        `Task type "${taskType}" is already registered by plugin "${existingPlugin}"`,
      );
    }
  }

  // Register the plugin
  pluginRegistry.set(plugin.name, plugin);

  // Map task types to plugin
  for (const taskType of plugin.taskTypes) {
    taskTypeToPlugin.set(taskType, plugin.name);
  }

  debug(
    `Registered plugin: ${plugin.name}${
      plugin.version != null ? ` v${plugin.version}` : ''
    }`,
  );
}

/**
 * Unregister a plugin
 * @param pluginName - Name of the plugin to unregister
 */
export function unregisterPlugin(pluginName: string): void {
  const plugin = pluginRegistry.get(pluginName);
  if (plugin == null) {
    return;
  }

  // Remove task type mappings
  for (const taskType of plugin.taskTypes) {
    taskTypeToPlugin.delete(taskType);
  }

  // Remove plugin
  pluginRegistry.delete(pluginName);
}

/**
 * Get a plugin by name
 * @param pluginName - Name of the plugin
 * @returns The plugin or undefined if not found
 */
export function getPlugin(pluginName: string): TaskPlugin | undefined {
  return pluginRegistry.get(pluginName);
}

/**
 * List all registered plugins
 * @returns Array of plugin names
 */
export function listPlugins(): string[] {
  return Array.from(pluginRegistry.keys());
}

/**
 * Clear all registered plugins (useful for testing)
 */
export function clearPlugins(): void {
  pluginRegistry.clear();
  taskTypeToPlugin.clear();
}
