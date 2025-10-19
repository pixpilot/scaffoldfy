/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
import type { TaskDefinition } from './types.js';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { collectConfig, validateConfig } from './config.js';
import { loadInitializationState, saveInitializationState } from './state.js';
import { runTask } from './task-executors.js';
import { topologicalSort } from './task-resolver.js';
import { log, promptYesNo } from './utils.js';

const readFile = promisify(fs.readFile);

// =================================================================
// Main Execution
// ============================================================================

/**
 * Core initialization logic shared by both main() and runWithTasks()
 */
export async function runInitialization(
  tasks: TaskDefinition[],
  options: {
    dryRun: boolean;
    force: boolean;
    keepTasksFile: boolean | undefined;
    tasksFilePath: string | undefined;
  },
): Promise<void> {
  // Check if already initialized
  const existingState = loadInitializationState();

  if (existingState && !options.force) {
    console.log('');
    log('⚠️  This template has already been initialized!', 'warn');
    console.log('');
    log(
      `  Initialized at: ${new Date(existingState.initializedAt).toLocaleString()}`,
      'info',
    );

    log(`  Repo: ${existingState.config.repoName}`, 'info');
    console.log('');

    const shouldReInit = await promptYesNo(
      'Do you want to re-initialize? This may cause issues',
      false,
    );

    if (!shouldReInit) {
      log('Initialization cancelled', 'info');
      process.exit(0);
    }

    console.log('');
    log('⚠️  Proceeding with re-initialization...', 'warn');
    console.log('');
  }

  // Get enabled tasks
  const enabledTasks = tasks.filter((task) => task.enabled);

  // Sort tasks by dependencies
  log('Resolving task dependencies...', 'info');
  const sortedTasks = topologicalSort(enabledTasks);
  console.log('');

  // Collect configuration
  const config = await collectConfig(options.dryRun);

  // Validate configuration
  const validationErrors = validateConfig(config);
  if (validationErrors.length > 0) {
    log('❌ Configuration errors:', 'error');
    validationErrors.forEach((err) => log(`  - ${err}`, 'error'));
    console.log('');
    process.exit(1);
  }

  console.log('');
  log('Starting initialization tasks...', 'info');
  console.log('');

  // Execute all tasks
  const totalTasks = sortedTasks.length;
  let completedTasks = 0;
  let failedTasks = 0;
  const completedTaskIds: string[] = [];

  for (let i = 0; i < sortedTasks.length; i++) {
    const task = sortedTasks[i];
    if (!task) continue; // Skip if task is undefined

    const success = await runTask(task, config, i + 1, totalTasks, options.dryRun);

    if (success) {
      completedTasks++;
      completedTaskIds.push(task.id);
    } else if (task.required) {
      failedTasks++;
      break; // Stop on required task failure
    } else {
      log(`⚠️  Non-critical task failed, continuing...`, 'warn');
    }

    console.log('');
  }

  if (failedTasks > 0) {
    log(`❌ Initialization failed with ${failedTasks} critical error(s)`, 'error');
    log(`✓ Completed: ${completedTasks}/${totalTasks} tasks`, 'info');
    process.exit(1);
  }

  // Save initialization state
  saveInitializationState(config, completedTaskIds, options.dryRun);

  log('✅ Initialization completed successfully!', 'success');
  console.log('');
  log(`✓ Completed: ${completedTasks}/${totalTasks} tasks`, 'success');
  console.log('');

  // Remove tasks file if not keeping it and not in dry run mode
  if (
    !options.dryRun &&
    !options.keepTasksFile &&
    options.tasksFilePath != null &&
    fs.existsSync(options.tasksFilePath)
  ) {
    try {
      fs.unlinkSync(options.tasksFilePath);
      log(`🗑️  Removed tasks file: ${path.basename(options.tasksFilePath)}`, 'info');
      console.log('');
    } catch (error) {
      log(
        `⚠️  Failed to remove tasks file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'warn',
      );
    }
  }

  if (!options.dryRun) {
    log('Next steps:', 'info');
    log('1. Review the changes made to your project', 'info');
    log('2. Commit the changes to git', 'info');

    // Check if turbo:gen:init exists in package.json
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8')) as {
        scripts?: Record<string, string>;
      };

      if (packageJson.scripts?.['turbo:gen:init'] != null) {
        log('3. Run "pnpm run turbo:gen:init" to create your first package', 'info');
        console.log('');

        // Ask if user wants to run it now
        const runNow = await promptYesNo(
          'Would you like to run turbo:gen:init now?',
          true,
        );

        if (runNow) {
          console.log('');
          log('Running turbo:gen:init...', 'info');
          execSync('pnpm run turbo:gen:init', { stdio: 'inherit' });
        }
      }
    }
  } else {
    log('🔍 Dry run completed - no changes were made', 'info');
    log('Run without --dry-run to apply changes', 'info');
  }

  console.log('');
}
