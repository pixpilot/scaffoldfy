import type { TaskDefinition } from '../types';
import { isPluginTaskType } from '../plugin-registry';
import { validateWriteTask } from './validate-and-filter-tasks';

/**
 * Validate all tasks before user starts inputting
 * This catches configuration errors early
 * @param tasks - Array of tasks to validate
 * @returns Array of validation errors (empty if all valid)
 */
export function validateAllTasks(tasks: TaskDefinition[]): string[] {
  const errors: string[] = [];

  for (const task of tasks) {
    // Validate plugin exists for task type
    if (!isPluginTaskType(task.type)) {
      errors.push(`Task "${task.id}" (${task.name}): Unknown task type "${task.type}"`);
    } else if (task.type === 'write') {
      // Validate write tasks specifically
      const writeErrors = validateWriteTask(task);
      errors.push(...writeErrors);
    }

    // Add more task-type-specific validations here as needed
  }

  return errors;
}
