/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */

import type {
  CurrentConfigurationContext,
  ScaffoldfyConfiguration,
  TaskDefinition,
} from '../types';
import { displayTasksDiff } from '../dry-run';
import { registerBuiltInPlugins } from '../task-executors';
import { sortTasksByDependencies, validateAndFilterTasks } from '../tasks';
import { executeTasks } from '../tasks/execution-tasks';
import { debug, info, log, logInfo } from '../utils';
import { processConfig } from './process-config';

/**
 * Run configs sequentially for variables/prompts, then all tasks together
 * Phase 1: Process variables and prompts sequentially from each config
 * Phase 2: Collect all tasks from all enabled configs
 * Phase 3: Execute all tasks together at the end
 * This allows later configs to use values from earlier configs in their conditions,
 * while still executing all tasks together after all variables/prompts are resolved
 */
export async function runConfigurationSequentially(
  configs: ScaffoldfyConfiguration[],
  options: {
    dryRun: boolean;
    force: boolean;
    configFilePath: string | undefined;
  },
  context: CurrentConfigurationContext = {},
): Promise<void> {
  debug('Running configs with sequential variable/prompt resolution...');
  debug(`Total configs to process: ${configs.length}`);

  // Register built-in plugins first
  debug('Registering built-in plugins...');
  registerBuiltInPlugins();

  const SEPARATOR_LENGTH = 60;
  const allTasks: TaskDefinition[] = [];

  // ============================================================================
  // PHASE 1: Process Variables and Prompts Sequentially
  // ============================================================================
  console.log('');
  info('📋 Collecting input...');
  console.log('');

  for (let configIndex = 0; configIndex < configs.length; configIndex++) {
    const config = configs[configIndex];
    if (config == null) continue;

    const separatorLine = '='.repeat(SEPARATOR_LENGTH);
    debug(`\n${separatorLine}`);
    debug(`Processing config ${configIndex + 1}/${configs.length}: "${config.name}"`);
    debug(separatorLine);

    // Debug: Show current config keys
    debug(`Current config keys: ${Object.keys(context).join(', ')}`);

    const isEnabled = await processConfig(config, context);
    if (isEnabled) {
      // Collect tasks from this config (don't execute yet)
      const configTasks = config.tasks ?? [];
      if (configTasks.length > 0) {
        debug(
          `Found ${configTasks.length} task(s) in config "${config.name}" (will execute later)`,
        );
        // Add tasks to the collection for later execution
        allTasks.push(...configTasks);
      }
    }
  }

  // ============================================================================
  // PHASE 2: Validate and Filter All Tasks
  // ============================================================================
  debug('\n🔧 Validating and filtering all collected tasks...');

  if (allTasks.length === 0) {
    log('No tasks found in any config', 'info');
    return;
  }

  console.log('');
  log('🛠️  Preparing tasks...', 'info');

  // Filter enabled tasks (now we have full config with all variables/prompts)
  const enabledTasks = await validateAndFilterTasks(allTasks, context);
  console.log('');
  log(`Found ${allTasks.length} tasks (${enabledTasks.length} enabled)`, 'info');
  log('All tasks validated successfully', 'success');

  if (enabledTasks.length === 0) {
    log('No enabled tasks to execute', 'info');
    return;
  }

  // Sort by dependencies
  const sortedTasks = sortTasksByDependencies(enabledTasks);

  // ============================================================================
  // PHASE 3: Execute All Tasks Together
  // ============================================================================
  if (options.dryRun) {
    log('\n🔍 Dry run - showing task changes...', 'info');
    await displayTasksDiff(sortedTasks, context);
    log('\n🔍 Dry run completed - no changes were made', 'info');
    log('Run without --dry-run to apply changes', 'info');
    return;
  }

  console.log('');
  logInfo('⚙️  Executing tasks...');
  console.log('');

  await executeTasks(sortedTasks, context, options);
}
