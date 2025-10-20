/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
import type { PromptDefinition, TaskDefinition } from './types.js';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { createInitialConfig } from './config.js';
import { displayTasksDiff } from './dry-run.js';
import { callHook } from './plugin.js';
import {
  collectPrompts,
  resolveAllDefaultValues,
  validatePrompts,
} from './prompts/index.js';
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

  // Create initial empty configuration
  log('Welcome to the template initialization script!', 'info');
  console.log('');

  if (options.dryRun) {
    log('🔍 DRY RUN MODE - No changes will be made', 'warn');
    console.log('');
  }

  log('This will initialize your project based on the defined tasks.', 'info');
  console.log('');

  const config = createInitialConfig();

  // Collect all prompts from tasks and separate global vs task-specific
  const globalPrompts: PromptDefinition[] = [];
  const taskSpecificPrompts: PromptDefinition[] = [];
  const allPrompts: PromptDefinition[] = [];

  for (const task of sortedTasks) {
    if (task.prompts && task.prompts.length > 0) {
      for (const prompt of task.prompts) {
        if (prompt.global) {
          // Check if this global prompt was already added from another task
          if (!globalPrompts.some((p) => p.id === prompt.id)) {
            globalPrompts.push(prompt);
            allPrompts.push(prompt);
          }
        } else {
          taskSpecificPrompts.push(prompt);
          allPrompts.push(prompt);
        }
      }
    }
  }

  // Validate prompts
  if (allPrompts.length > 0) {
    const promptErrors = validatePrompts(allPrompts);
    if (promptErrors.length > 0) {
      log('❌ Prompt validation errors:', 'error');
      promptErrors.forEach((err) => log(`  - ${err}`, 'error'));
      console.log('');
      process.exit(1);
    }

    // Pre-resolve all default values (execute commands in parallel)
    log('Resolving prompt default values...', 'info');
    const resolvedDefaults = await resolveAllDefaultValues(allPrompts);
    console.log('');

    // Collect global prompts first
    let globalAnswers: Record<string, unknown> = {};
    if (globalPrompts.length > 0) {
      console.log('');
      log('📋 Global prompts (available to all tasks):', 'info');
      console.log('');
      globalAnswers = await collectPrompts(globalPrompts, resolvedDefaults);
      // Merge global answers into config immediately
      Object.assign(config, globalAnswers);
    }

    // Collect task-specific prompts
    if (taskSpecificPrompts.length > 0) {
      if (globalPrompts.length > 0) {
        log('📋 Task-specific prompts:', 'info');
        console.log('');
      }
      const taskAnswers = await collectPrompts(taskSpecificPrompts, resolvedDefaults);
      // Merge task-specific answers into config
      Object.assign(config, taskAnswers);
    }
  }

  // If dry-run mode, show diff and exit
  if (options.dryRun) {
    await displayTasksDiff(sortedTasks, config);
    log('🔍 Dry run completed - no changes were made', 'info');
    log('Run without --dry-run to apply changes', 'info');
    return;
  }

  console.log('');
  log('Starting initialization tasks...', 'info');
  console.log('');

  // Call beforeAll hook
  await callHook('beforeAll', config);

  // Execute all tasks
  const totalTasks = sortedTasks.length;
  let completedTasks = 0;
  let failedTasks = 0;
  const completedTaskIds: string[] = [];

  for (let i = 0; i < sortedTasks.length; i++) {
    const task = sortedTasks[i];
    if (task == null) continue; // Skip if task is undefined

    // Call beforeTask hook
    await callHook('beforeTask', task, config);

    const success = await runTask(task, config, i + 1, totalTasks, options.dryRun);

    if (success) {
      completedTasks++;
      completedTaskIds.push(task.id);

      // Call afterTask hook
      await callHook('afterTask', task, config);
    } else if (task.required) {
      failedTasks++;

      // Call onError hook
      await callHook('onError', new Error(`Task ${task.name} failed`), task);

      break; // Stop on required task failure
    } else {
      log('⚠️  Non-critical task failed, continuing...', 'warn');

      // Call onError hook
      await callHook('onError', new Error(`Task ${task.name} failed`), task);
    }

    console.log('');
  }

  if (failedTasks > 0) {
    log(`❌ Initialization failed with ${failedTasks} critical error(s)`, 'error');
    log(`✓ Completed: ${completedTasks}/${totalTasks} tasks`, 'info');
    process.exit(1);
  }

  // Call afterAll hook
  await callHook('afterAll', config);

  // Save initialization state
  saveInitializationState(config, completedTaskIds, options.dryRun);

  log('✅ Initialization completed successfully!', 'success');
  console.log('');
  log(`✓ Completed: ${completedTasks}/${totalTasks} tasks`, 'success');
  console.log('');

  // Remove tasks file if not in dry run mode
  if (
    !options.dryRun &&
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
  }

  console.log('');
}
