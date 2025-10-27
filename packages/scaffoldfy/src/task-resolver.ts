/**
 * Task dependency resolution and topological sorting
 */

import type { TaskDefinition } from './types';
import { CircularDependencyError } from './errors/base';
import { TaskNotFoundError } from './errors/other';

/**
 * Sort tasks by dependencies using topological sort
 */
export function topologicalSort(tasks: TaskDefinition[]): TaskDefinition[] {
  const sorted: TaskDefinition[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  function visit(taskId: string) {
    if (visited.has(taskId)) return;

    if (visiting.has(taskId)) {
      throw CircularDependencyError.forTaskDependency(taskId);
    }

    visiting.add(taskId);

    const task = taskMap.get(taskId);
    if (!task) {
      throw TaskNotFoundError.forId(taskId);
    }

    // Visit dependencies first
    if (task.dependencies) {
      for (const depId of task.dependencies) {
        visit(depId);
      }
    }

    visiting.delete(taskId);
    visited.add(taskId);
    sorted.push(task);
  }

  for (const task of tasks) {
    if (!visited.has(task.id)) {
      visit(task.id);
    }
  }

  return sorted;
}
