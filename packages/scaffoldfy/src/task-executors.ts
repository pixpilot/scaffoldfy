/**
 * Task execution functions and built-in plugin registration
 */

import type { InitConfig, TaskDefinition } from './types.js';
import process from 'node:process';
import { executePluginTask, isPluginTaskType, registerPlugin } from './plugin.js';
import { appendPlugin } from './plugins/append/index.js';
import { copyPlugin } from './plugins/copy/index.js';
import { createPlugin } from './plugins/create/index.js';
import { deletePlugin } from './plugins/delete/index.js';
import { execPlugin } from './plugins/exec/index.js';
import { gitInitPlugin } from './plugins/git-init/index.js';
import { mkdirPlugin } from './plugins/mkdir/index.js';
import { movePlugin } from './plugins/move/index.js';
import { regexReplacePlugin } from './plugins/regex-replace/index.js';
import { renamePlugin } from './plugins/rename/index.js';
import { replaceInFilePlugin } from './plugins/replace-in-file/index.js';
import { updateJsonPlugin } from './plugins/update-json/index.js';
import { writePlugin } from './plugins/write/index.js';
import { log } from './utils.js';

// Register all built-in plugins
export function registerBuiltInPlugins(): void {
  // Check if plugins are already registered by testing for a common plugin
  if (isPluginTaskType('update-json')) {
    return;
  }

  registerPlugin(updateJsonPlugin);
  registerPlugin(writePlugin);
  registerPlugin(createPlugin);
  registerPlugin(regexReplacePlugin);
  registerPlugin(replaceInFilePlugin);
  registerPlugin(deletePlugin);
  registerPlugin(renamePlugin);
  registerPlugin(gitInitPlugin);
  registerPlugin(execPlugin);
  registerPlugin(movePlugin);
  registerPlugin(copyPlugin);
  registerPlugin(appendPlugin);
  registerPlugin(mkdirPlugin);
}

/**
 * Execute a task based on its type
 */
export async function executeTask(
  task: TaskDefinition,
  config: InitConfig,
  dryRun = false,
): Promise<void> {
  // Ensure built-in plugins are registered
  registerBuiltInPlugins();

  if (dryRun) {
    log(`[DRY RUN] Would execute: ${task.name}`, 'info');
    return;
  }

  // All task types are now handled by plugins
  if (isPluginTaskType(task.type)) {
    await executePluginTask(task, config, { dryRun });
    return;
  }

  // If no plugin handles this task type, throw an error
  throw new TypeError(`Unknown task type: ${task.type}`);
}

/**
 * Run a single task with error handling
 */
export async function runTask(
  task: TaskDefinition,
  config: InitConfig,
  taskNumber: number,
  totalTasks: number,
  dryRun = false,
): Promise<boolean> {
  try {
    log(`[${taskNumber}/${totalTasks}] Running: ${task.name}...`, 'info');
    await executeTask(task, config, dryRun);
    log(`[${taskNumber}/${totalTasks}] Completed: ${task.name}...`, 'success');
    return true;
  } catch (error) {
    log(`Failed: ${task.name}`, 'error');

    // Better error context
    if (error instanceof Error) {
      log(`  Reason: ${error.message}`, 'error');
      if (error.stack != null && process.env['DEBUG'] != null) {
        console.error(error.stack);
      }
    }

    return false;
  }
}
