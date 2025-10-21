/**
 * Task validation functions - validates tasks before execution
 */

import type { TaskDefinition } from './types.js';
import { isPluginTaskType } from './plugin.js';
import { log } from './utils.js';

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
    } else if (task.type === 'template') {
      // Validate template tasks specifically
      const templateErrors = validateTemplateTask(task);
      errors.push(...templateErrors);
    }

    // Add more task-type-specific validations here as needed
  }

  return errors;
}

/**
 * Validate template task configuration
 */
function validateTemplateTask(task: TaskDefinition): string[] {
  const errors: string[] = [];
  const config = task.config as Record<string, unknown>;

  const hasInlineTemplate = config['template'] != null && config['template'] !== '';
  const hasTemplateFile = config['templateFile'] != null && config['templateFile'] !== '';

  // Must have either template or templateFile
  if (!hasInlineTemplate && !hasTemplateFile) {
    errors.push(
      `Task "${task.id}" (${task.name}): Template task requires either "template" (inline) or "templateFile" (file path) to be specified`,
    );
  }

  // Cannot have both template and templateFile
  if (hasInlineTemplate && hasTemplateFile) {
    errors.push(
      `Task "${task.id}" (${task.name}): Template task cannot have both "template" and "templateFile" specified. Use one or the other.`,
    );
  }

  // Must have file property
  if (config['file'] == null || config['file'] === '') {
    errors.push(
      `Task "${task.id}" (${task.name}): Template task requires "file" property to specify the output file path`,
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
