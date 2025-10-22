/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
import type { PromptDefinition, TaskDefinition, VariableDefinition } from './types.js';
import process from 'node:process';
import { createInitialConfig } from './config.js';
import { displayTasksDiff } from './dry-run.js';
import { callHook } from './plugin.js';
import {
  collectPrompts,
  resolveAllDefaultValues,
  validatePrompts,
} from './prompts/index.js';
import { registerBuiltInPlugins, runTask } from './task-executors.js';
import { topologicalSort } from './task-resolver.js';
import { evaluateEnabled, log } from './utils.js';
import { displayValidationErrors, validateAllTasks } from './validation.js';
import {
  collectVariables,
  resolveAllVariableValues,
  validateVariables,
} from './variables/index.js';

// =================================================================
// Main Execution
// ============================================================================

/**
 * Core task execution logic shared by both main() and runWithTasks()
 */
export async function runTasks(
  tasks: TaskDefinition[],
  options: {
    dryRun: boolean;
    force: boolean;
    tasksFilePath: string | undefined;
    globalVariables?: VariableDefinition[];
    globalPrompts?: PromptDefinition[];
  },
): Promise<void> {
  // ============================================================================
  // Register Built-in Plugins First
  // ============================================================================
  // IMPORTANT: Plugins must be registered before validation, as validation
  // checks if task types are known (i.e., handled by a registered plugin).
  registerBuiltInPlugins();

  // ============================================================================
  // Early Validation - Before any user input
  // ============================================================================
  log('Validating task configurations...', 'info');
  const validationErrors = validateAllTasks(tasks);
  if (validationErrors.length > 0) {
    displayValidationErrors(validationErrors);
    process.exit(1);
  }
  log('✓ All tasks validated successfully', 'success');

  // Get enabled tasks (evaluate conditional enabled)
  // Initially evaluate with empty config, will re-evaluate later with full config
  const enabledTasks = tasks.filter((task) =>
    evaluateEnabled(task.enabled, createInitialConfig()),
  );

  // Sort tasks by dependencies
  log('Resolving task dependencies...', 'info');
  const sortedTasks = topologicalSort(enabledTasks);

  // Create initial empty configuration
  log("Welcome! Let's execute your tasks.", 'info');

  if (options.dryRun) {
    log('🔍 DRY RUN MODE - No changes will be made', 'warn');
  }

  log('This will execute your project tasks based on the defined configuration.', 'info');

  const config = createInitialConfig();

  // ============================================================================
  // Process Variables (no user interaction)
  // ============================================================================

  // Collect all variables from top-level config and task-scoped
  const globalVariables: VariableDefinition[] = options.globalVariables ?? [];
  const taskSpecificVariables: VariableDefinition[] = [];
  const allVariables: VariableDefinition[] = [...globalVariables];

  // Collect task-scoped variables
  for (const task of sortedTasks) {
    if (task.variables && task.variables.length > 0) {
      for (const variable of task.variables) {
        taskSpecificVariables.push(variable);
        allVariables.push(variable);
      }
    }
  }

  // Validate variables
  if (allVariables.length > 0) {
    const variableErrors = validateVariables(allVariables);
    if (variableErrors.length > 0) {
      log('❌ Variable validation errors:', 'error');
      variableErrors.forEach((err) => log(`  - ${err}`, 'error'));

      process.exit(1);
    }

    // Resolve all variable values (execute commands in parallel)
    log('Resolving variable values...', 'info');
    const resolvedVariableValues = await resolveAllVariableValues(allVariables);

    // Collect all variable values and merge into config
    const variableValues = collectVariables(allVariables, resolvedVariableValues);
    Object.assign(config, variableValues);

    // Log resolved variables if any
    if (Object.keys(variableValues).length > 0) {
      log(`✓ Resolved ${Object.keys(variableValues).length} variable(s)`, 'success');
    }
  }

  // ============================================================================
  // Process Prompts (user interaction required)
  // ============================================================================

  // Collect top-level prompts (always global) and task-scoped prompts
  const topLevelPrompts: PromptDefinition[] = options.globalPrompts ?? [];
  const taskSpecificPrompts: PromptDefinition[] = [];
  const allPrompts: PromptDefinition[] = [...topLevelPrompts];

  // Collect task-scoped prompts
  for (const task of sortedTasks) {
    if (task.prompts && task.prompts.length > 0) {
      for (const prompt of task.prompts) {
        taskSpecificPrompts.push(prompt);
        allPrompts.push(prompt);
      }
    }
  }

  // Validate prompts
  if (allPrompts.length > 0) {
    const promptErrors = validatePrompts(allPrompts);
    if (promptErrors.length > 0) {
      log('❌ Prompt validation errors:', 'error');
      promptErrors.forEach((err) => log(`  - ${err}`, 'error'));

      process.exit(1);
    }

    // Pre-resolve all default values (execute commands in parallel)
    log('Resolving prompt default values...', 'info');
    const resolvedDefaults = await resolveAllDefaultValues(allPrompts);

    // Collect top-level prompts first (always global)
    let globalAnswers: Record<string, unknown> = {};
    if (topLevelPrompts.length > 0) {
      log('📋 Top-level prompts (available to all tasks):', 'info');

      globalAnswers = await collectPrompts(topLevelPrompts, resolvedDefaults, config);
      // Merge global answers into config immediately
      Object.assign(config, globalAnswers);
    }

    // Collect task-specific prompts
    if (taskSpecificPrompts.length > 0) {
      if (topLevelPrompts.length > 0) {
        log('📋 Task-specific prompts:', 'info');
      }
      const taskAnswers = await collectPrompts(
        taskSpecificPrompts,
        resolvedDefaults,
        config,
      );
      // Merge task-specific answers into config
      Object.assign(config, taskAnswers);
    }
  }

  // Re-evaluate enabled tasks now that we have full config with all variables and prompts
  // Filter the already-sorted tasks to only keep enabled ones
  const finalEnabledTasks = sortedTasks.filter((task) =>
    evaluateEnabled(task.enabled, config),
  );

  log(
    `${finalEnabledTasks.length} of ${sortedTasks.length} task(s) enabled for execution`,
    'info',
  );

  // If dry-run mode, show diff and exit
  if (options.dryRun) {
    await displayTasksDiff(finalEnabledTasks, config);
    log('🔍 Dry run completed - no changes were made', 'info');
    log('Run without --dry-run to apply changes', 'info');
    return;
  }

  log('Starting task execution...', 'info');

  // Call beforeAll hook
  await callHook('beforeAll', config);

  // Execute all enabled tasks
  const totalTasks = finalEnabledTasks.length;
  let completedTasks = 0;
  let failedTasks = 0;
  const completedTaskIds: string[] = [];

  for (let i = 0; i < finalEnabledTasks.length; i++) {
    const task = finalEnabledTasks[i];
    if (task == null) continue; // Skip if task is undefined

    // Call beforeTask hook
    await callHook('beforeTask', task, config);

    const success = await runTask(task, config, i + 1, totalTasks, options.dryRun);

    if (success) {
      completedTasks++;
      completedTaskIds.push(task.id);

      // Call afterTask hook
      await callHook('afterTask', task, config);
    } else if (task.required ?? true) {
      // Default to true if undefined
      failedTasks++;

      // Call onError hook
      await callHook('onError', new Error(`Task ${task.name} failed`), task);

      break; // Stop on required task failure
    } else {
      log('⚠️  Non-critical task failed, continuing...', 'warn');

      // Call onError hook
      await callHook('onError', new Error(`Task ${task.name} failed`), task);
    }
  }

  if (failedTasks > 0) {
    log(`❌ Task execution failed with ${failedTasks} critical error(s)`, 'error');
    log(`✓ Completed: ${completedTasks}/${totalTasks} tasks`, 'info');
    process.exit(1);
  }

  // Call afterAll hook
  await callHook('afterAll', config);

  log('✅ All tasks completed successfully!', 'success');

  log(`✓ Completed: ${completedTasks}/${totalTasks} tasks`, 'success');

  if (!options.dryRun) {
    log('Next steps:', 'info');
    log('1. Review the changes made to your project', 'info');
    log('2. Commit the changes to git', 'info');
  }
}
