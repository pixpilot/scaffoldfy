/**
 * Plugin System - Allow custom task types
 *
 * This module provides a plugin architecture for extending
 * the template initialization system with custom task types.
 */

import type { InitConfig, PluginHooks, TaskDefinition, TaskPlugin } from './types.js';
import { debug, log } from './utils.js';

/**
 * Registry of installed plugins
 */
const pluginRegistry = new Map<string, TaskPlugin>();

/**
 * Registry of global hooks
 */
const hooksRegistry: Partial<PluginHooks> = {};

/**
 * Map of task types to their plugins
 */
const taskTypeToPlugin = new Map<string, string>();

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

/**
 * Register global lifecycle hooks
 * @param hooks - Hook functions to register
 */
export function registerHooks(hooks: Partial<PluginHooks>): void {
  if (hooks.beforeAll != null) {
    hooksRegistry.beforeAll = hooks.beforeAll;
  }
  if (hooks.afterAll != null) {
    hooksRegistry.afterAll = hooks.afterAll;
  }
  if (hooks.beforeTask != null) {
    hooksRegistry.beforeTask = hooks.beforeTask;
  }
  if (hooks.afterTask != null) {
    hooksRegistry.afterTask = hooks.afterTask;
  }
  if (hooks.onError != null) {
    hooksRegistry.onError = hooks.onError;
  }
}

/**
 * Call a lifecycle hook
 * @param hookName - Name of the hook
 * @param config - Initialization config for beforeAll/afterAll
 */
export async function callHook(
  hookName: 'beforeAll' | 'afterAll',
  config: InitConfig,
): Promise<void>;
/**
 * Call a lifecycle hook
 * @param hookName - Name of the hook
 * @param task - Task definition for beforeTask/afterTask
 * @param config - Initialization config
 */
export async function callHook(
  hookName: 'beforeTask' | 'afterTask',
  task: TaskDefinition,
  config: InitConfig,
): Promise<void>;
/**
 * Call a lifecycle hook
 * @param hookName - Name of the hook
 * @param error - Error that occurred
 * @param task - Optional task definition
 */
export async function callHook(
  hookName: 'onError',
  error: Error,
  task?: TaskDefinition,
): Promise<void>;
/**
 * Call a lifecycle hook (implementation)
 * @param hookName - Name of the hook
 * @param args - Additional arguments for the hook
 */
export async function callHook(
  hookName: keyof PluginHooks,
  ...args: unknown[]
): Promise<void> {
  const hook = hooksRegistry[hookName];
  if (hook == null) {
    return;
  }

  try {
    if (hookName === 'beforeAll' || hookName === 'afterAll') {
      await (hook as (config: InitConfig) => Promise<void>)(args[0] as InitConfig);
    } else if (hookName === 'beforeTask' || hookName === 'afterTask') {
      await (hook as (task: TaskDefinition, config: InitConfig) => Promise<void>)(
        args[0] as TaskDefinition,
        args[1] as InitConfig,
      );
    } else if (hookName === 'onError') {
      await (hook as (error: Error, task?: TaskDefinition) => Promise<void>)(
        args[0] as Error,
        args[1] as TaskDefinition | undefined,
      );
    }
  } catch (error) {
    log(
      `Error in ${hookName} hook: ${
        error instanceof Error ? error.message : String(error)
      }`,
      'error',
    );
  }
}

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

/**
 * Create a simple task plugin
 * @param name - Plugin name
 * @param taskType - Task type this plugin handles
 * @param execute - Execute function
 * @param options - Optional configuration
 * @param options.version - Plugin version
 * @param options.getDiff - Function to generate diff preview
 * @param options.validate - Function to validate task configuration
 * @returns A TaskPlugin object
 */
export function createTaskPlugin(
  name: string,
  taskType: string,
  execute: (
    task: TaskDefinition,
    config: InitConfig,
    options: { dryRun: boolean },
  ) => Promise<void>,
  options?: {
    version?: string;
    getDiff?: (task: TaskDefinition, config: InitConfig) => Promise<string>;
    validate?: (task: TaskDefinition) => string[];
  },
): TaskPlugin {
  return {
    name,
    ...(options?.version != null && { version: options.version }),
    taskTypes: [taskType],
    execute,
    ...(options?.getDiff != null && { getDiff: options.getDiff }),
    ...(options?.validate != null && { validate: options.validate }),
  };
}
