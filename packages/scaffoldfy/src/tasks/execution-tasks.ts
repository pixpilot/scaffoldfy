/* eslint-disable no-await-in-loop */
import type { CurrentConfigurationContext, TaskDefinition } from '../types';
import process from 'node:process';
import { callHook } from '../plugin-registry';
import { runTask } from '../task-executors';
import { evaluateRequiredAsync, log, warn } from '../utils';

/**
 * Execute all sorted tasks
 */
export async function executeTasks(
  tasks: TaskDefinition[],
  config: CurrentConfigurationContext,
  options: { dryRun: boolean },
): Promise<void> {
  await callHook('beforeAll', config);

  let completedTasks = 0;
  let failedTasks = 0;
  const failedTaskNames: string[] = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    if (task != null) {
      await callHook('beforeTask', task, config);

      const success = await runTask(task, config, i + 1, tasks.length, options.dryRun);

      if (success) {
        completedTasks++;
        await callHook('afterTask', task, config);
      } else {
        // Evaluate if task is required (defaults to true)
        const isRequired = await evaluateRequiredAsync(task.required, config);

        // Only count as failure if task is required
        if (isRequired) {
          failedTasks++;
          failedTaskNames.push(task.name);
        }
        await callHook('onError', new Error(`Task ${task.name} failed`), task);

        // Log warning but continue execution
        warn(`⚠️  Task "${task.name}" failed, continuing with remaining tasks...`);
      }
    }
  }

  await callHook('afterAll', config);

  if (failedTasks > 0) {
    log(`\n❌ Task execution completed with ${failedTasks} error(s)`, 'error');
    log(`Completed: ${completedTasks}/${tasks.length} tasks`, 'info');
    log(`Failed tasks: ${failedTaskNames.join(', ')}`, 'error');
    process.exit(1);
  }

  log(`Completed: ${completedTasks}/${tasks.length} tasks`, 'success');
}
