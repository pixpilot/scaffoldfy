/**
 * Template Task Automation Library
 *
 * Enhanced version with:
 * - Dry run mode
 * - Task dependencies
 * - Rollback support
 * - Progress indicators
 * - Advanced conditional evaluation
 * - More task types (rename, git-init, exec)
 * - Better error messages
 * - Configuration validation
 * - TypeScript type safety
 */

import type { PromptDefinition, TaskDefinition, VariableDefinition } from './types.js';

import process from 'node:process';

import { runTasks } from './run-tasks.js';
import { log } from './utils.js';

// ============================================================================
// Constants
// ============================================================================

// Check for dry run mode
const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

// =================================================================
// Main Execution
// ============================================================================

/**
 * Main function for executing tasks with default/empty tasks array
 * For most use cases, you should use runWithTasks() with your custom tasks
 */
// eslint-disable-next-line ts/explicit-module-boundary-types
async function main(customTasks?: TaskDefinition[]) {
  try {
    // Use custom tasks or empty array
    const tasks = customTasks || [];

    if (tasks.length === 0) {
      log(
        '⚠️  No tasks defined. Use --tasks-file to specify tasks or call runWithTasks() programmatically.',
        'warn',
      );

      log('Example: scaffoldfy --tasks-file ./tasks.json', 'info');

      process.exit(1);
    }

    await runTasks(tasks, {
      dryRun,
      force,
      tasksFilePath: undefined,
    });
  } catch (error) {
    log('❌ Task execution failed', 'error');

    if (error instanceof Error) {
      log(`Error: ${error.message}`, 'error');

      if (process.env['DEBUG'] != null) {
        console.error(error.stack);
      }
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Execute tasks with custom task definitions
 * @param customTasks - Array of task definitions to execute
 * @param options - Optional configuration
 * @param options.dryRun - Preview changes without applying them
 * @param options.force - Force execution even if checks fail
 * @param options.tasksFilePath - Path to the tasks file
 * @param options.globalVariables - Optional top-level global variables
 * @param options.globalPrompts - Optional top-level global prompts
 */
export async function runWithTasks(
  customTasks: TaskDefinition[],
  options?: {
    dryRun?: boolean | undefined;
    force?: boolean | undefined;
    tasksFilePath?: string | undefined;
    globalVariables?: VariableDefinition[] | undefined;
    globalPrompts?: PromptDefinition[] | undefined;
  },
): Promise<void> {
  try {
    await runTasks(customTasks, {
      dryRun: options?.dryRun ?? dryRun,
      force: options?.force ?? force,
      tasksFilePath: options?.tasksFilePath ?? undefined,
      ...(options?.globalVariables != null && {
        globalVariables: options.globalVariables,
      }),
      ...(options?.globalPrompts != null && {
        globalPrompts: options.globalPrompts,
      }),
    });
  } catch (error) {
    log('❌ Task execution failed', 'error');

    if (error instanceof Error) {
      log(`Error: ${error.message}`, 'error');

      if (process.env['DEBUG'] != null) {
        console.error(error.stack);
      }
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

export {
  displayTasksDiff,
  getDeleteDiff,
  getExecDiff,
  getGitInitDiff,
  getRegexReplaceDiff,
  getRenameDiff,
  getReplaceInFileDiff,
  getTaskDiff,
  getTemplateDiff,
  getUpdateJsonDiff,
} from './dry-run.js';
export {
  callHook,
  clearPlugins,
  createPlugin,
  executePluginTask,
  getPlugin,
  getPluginForTaskType,
  getPluginTaskDiff,
  isPluginTaskType,
  listPlugins,
  registerHooks,
  registerPlugin,
  unregisterPlugin,
  validatePluginTask,
} from './plugin.js';
export {
  collectPrompts,
  resolveAllDefaultValues,
  resolveDefaultValue,
  validatePrompts,
} from './prompts/index.js';
export { executeTask, registerBuiltInPlugins, runTask } from './task-executors.js';
export { topologicalSort } from './task-resolver.js';
export {
  clearTemplateCache,
  loadAndMergeTemplate,
  loadTasksWithInheritance,
  loadTemplate,
  mergeTemplates,
} from './template-inheritance.js';
export type * from './types.js';
export {
  evaluateCondition,
  getGitRepoInfo,
  interpolateTemplate,
  log,
  prompt,
  promptYesNo,
  setNestedProperty,
} from './utils.js';
export {
  collectVariables,
  resolveAllVariableValues,
  resolveVariableValue,
  validateVariables,
} from './variables/index.js';

export { main };
