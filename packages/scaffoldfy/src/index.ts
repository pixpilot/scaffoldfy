import type { PromptDefinition, TaskDefinition, VariableDefinition } from './types';

import process from 'node:process';

import { runTasks } from './run-tasks';
import { log } from './utils';

// ============================================================================
// Constants
// ============================================================================

// Check for dry run mode
const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

// ============================================================================
// Public API
// ============================================================================

/**
 * Execute tasks with custom task definitions
 * @param customTasks - Array of task definitions to execute
 * @param options - Optional configuration
 * @param options.dryRun - Preview changes without applying them
 * @param options.force - Force execution even if checks fail
 * @param options.configFilePath - Path to the tasks file
 * @param options.variables - Optional top-level global variables
 * @param options.prompts - Optional top-level global prompts
 * @param options.configEnabled - Optional config-level enabled condition
 * @param options.transformers - Optional transformer definitions
 */
export async function runWithTasks(
  customTasks: TaskDefinition[],
  options?: {
    dryRun?: boolean | undefined;
    force?: boolean | undefined;
    configFilePath?: string | undefined;
    variables?: VariableDefinition[] | undefined;
    prompts?: PromptDefinition[] | undefined;
    configEnabled?: import('./types').EnabledValue | undefined;
    transformers?: import('./transformers/types').Transformer[] | undefined;
  },
): Promise<void> {
  try {
    await runTasks(customTasks, {
      dryRun: options?.dryRun ?? dryRun,
      force: options?.force ?? force,
      configFilePath: options?.configFilePath ?? undefined,
      ...(options?.variables != null && {
        variables: options.variables,
      }),
      ...(options?.prompts != null && {
        prompts: options.prompts,
      }),
      ...(options?.configEnabled != null && {
        configEnabled: options.configEnabled,
      }),
      ...(options?.transformers != null && {
        transformers: options.transformers,
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

// Configuration and inheritance API (documented in CONFIG_INHERITANCE.md)
export {
  clearConfigurationCache,
  loadAndMergeConfiguration,
  loadConfiguration,
  loadTasksWithInheritance,
  mergeConfigurations,
} from './configurations/index';

// Dry-run and diff API (documented in DRY_RUN.md)
export {
  displayTasksDiff,
  getDeleteDiff,
  getExecDiff,
  getGitInitDiff,
  getRegexReplaceDiff,
  getRenameDiff,
  getReplaceInFileDiff,
  getTaskDiff,
  getUpdateJsonDiff,
} from './dry-run/index';

// Plugin API (documented in PLUGINS.md)
export {
  clearPlugins,
  createTaskPlugin,
  executePluginTask,
  getPlugin,
  getPluginForTaskType,
  isPluginTaskType,
  listPlugins,
  registerHooks,
  registerPlugin,
  unregisterPlugin,
} from './plugin';

// JSON validation API (documented in JSON_VALIDATION.md)
export { validateScaffoldfyJsonFile } from './scaffoldfy-config-json-validator';

// Type exports
export type * from './types';
