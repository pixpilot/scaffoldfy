import type { InitConfig, TaskDefinition, TaskPlugin } from '../types';

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
