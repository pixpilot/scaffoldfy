/**
 * Task validation functions - validates tasks before execution
 */

import type { TaskDefinition } from './types.js';
import { isPluginTaskType } from './plugin.js';
import { validateTemplateConfig } from './template-utils.js';
import { log } from './utils';

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

/**
 * Validate write task configuration
 */
function validateWriteTask(task: TaskDefinition): string[] {
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
 * Display validation errors in a user-friendly format
 */
export function displayValidationErrors(errors: string[]): void {
  log('❌ Template validation failed:', 'error');
  log('', 'error');
  for (const error of errors) {
    log(`  • ${error}`, 'error');
  }
  log('', 'error');
  log('Please fix these errors before continuing.', 'error');
}
