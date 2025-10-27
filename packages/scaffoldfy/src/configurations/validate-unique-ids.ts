import type { PromptDefinition, TaskDefinition, VariableDefinition } from '../types';
import { DuplicateIdError } from '../errors';

/**
 * Validate that there are no duplicate IDs across tasks, variables, and prompts
 * @param tasks - Array of tasks
 * @param variables - Array of variables
 * @param prompts - Array of prompts
 * @throws Error if duplicate IDs are found
 */
export function validateUniqueIds(
  tasks: TaskDefinition[],
  variables?: VariableDefinition[],
  prompts?: PromptDefinition[],
): void {
  const allIds = new Map<string, string>();

  // Check task IDs
  for (const task of tasks) {
    if (allIds.has(task.id)) {
      throw DuplicateIdError.forId(task.id, 'task', allIds.get(task.id));
    }
    allIds.set(task.id, 'task');
  }

  // Check variable IDs
  if (variables != null) {
    for (const variable of variables) {
      if (allIds.has(variable.id)) {
        throw DuplicateIdError.forId(variable.id, 'variable', allIds.get(variable.id));
      }
      allIds.set(variable.id, 'variable');
    }
  }

  // Check prompt IDs
  if (prompts != null) {
    for (const prompt of prompts) {
      if (allIds.has(prompt.id)) {
        throw DuplicateIdError.forId(prompt.id, 'prompt', allIds.get(prompt.id));
      }
      allIds.set(prompt.id, 'prompt');
    }
  }
}
