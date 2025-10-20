/**
 * Template Initialization Library
 *
 * Enhanced version with:
 * - Dry run mode
 * - Task dependencies
 * - Rollback support
 * - Progress indicators
 * - Advanced conditional evaluation
 * - More task types (rename, git-init, exec)
 * - Better error messages
 * - Skip already initialized check
 * - Configuration validation
 * - TypeScript type safety
 */

import type { TaskDefinition } from './types.js';

import process from 'node:process';

import { runInitialization } from './run-initialization.js';
import { log } from './utils.js';

// ============================================================================
// Constants
// ============================================================================

// Check for dry run mode
const dryRun = process.argv.includes('--dry-run');
const forceReInit = process.argv.includes('--force');

// =================================================================
// Main Execution
// ============================================================================

/**
 * Main function for running initialization with default/empty tasks
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
      console.log('');
      log('Example: scaffoldfy --tasks-file ./tasks.json', 'info');
      console.log('');
      process.exit(1);
    }

    await runInitialization(tasks, {
      dryRun,
      force: forceReInit,
      tasksFilePath: undefined,
    });
  } catch (error) {
    log('❌ Initialization failed', 'error');

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
 * Run initialization with custom tasks
 * @param customTasks - Array of task definitions to execute
 * @param options - Optional configuration
 * @param options.dryRun - Preview changes without applying them
 * @param options.force - Force re-initialization even if already initialized

 * @param options.tasksFilePath - Path to the tasks file
 */
export async function runWithTasks(
  customTasks: TaskDefinition[],
  options?: {
    dryRun?: boolean | undefined;
    force?: boolean | undefined;

    tasksFilePath?: string | undefined;
  },
): Promise<void> {
  try {
    await runInitialization(customTasks, {
      dryRun: options?.dryRun ?? dryRun,
      force: options?.force ?? forceReInit,

      tasksFilePath: options?.tasksFilePath ?? undefined,
    });
  } catch (error) {
    log('❌ Initialization failed', 'error');

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

// Re-export everything from modules for convenience
export { collectConfig, validateConfig } from './config.js';
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
export { loadInitializationState, saveInitializationState } from './state.js';
export { executeTask, runTask } from './task-executors.js';
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

export { main };
