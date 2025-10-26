/* eslint-disable no-await-in-loop */
/* eslint-disable no-continue */
import type {
  EnabledValue,
  PromptDefinition,
  TaskDefinition,
  VariableDefinition,
} from './types.js';
import process from 'node:process';
import { createInitialConfig } from './config.js';
import { displayTasksDiff } from './dry-run.js';
import { debug, info, success as logSuccess, warn } from './logger.js';
import { callHook } from './plugin.js';
import {
  collectPrompts,
  resolveAllDefaultValues,
  validatePrompts,
} from './prompts/index.js';
import { registerBuiltInPlugins, runTask } from './task-executors.js';
import { topologicalSort } from './task-resolver.js';
import { transformerManager } from './transformers/index.js';
import { evaluateEnabled, evaluateEnabledAsync, log, logInfo } from './utils.js';
import { evaluateRequiredAsync } from './utils/evaluate-required.js';
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
    variables?: VariableDefinition[];
    prompts?: PromptDefinition[];
    templateEnabled?: EnabledValue;
    transformers?: import('./transformers/types.js').Transformer[];
  },
): Promise<void> {
  // ============================================================================
  // Check Root-Level Template Enabled (Early Check with Lazy Mode)
  // ============================================================================
  // First check if the entire template is disabled before doing any work
  // Use lazy mode to allow conditions that reference variables/prompts
  // (they will be re-evaluated later after variables/prompts are collected)
  const initialConfig = createInitialConfig();

  // Evaluate template-level enabled (lazy mode returns true for undefined variables)
  const templateIsEnabled = await evaluateEnabledAsync(
    options.templateEnabled,
    initialConfig,
    { lazy: true },
  );

  if (!templateIsEnabled) {
    info('⊘ Template is disabled - skipping all execution');
    return;
  }

  // ============================================================================
  // Register Transformers
  // ============================================================================
  if (options.transformers !== undefined && options.transformers.length > 0) {
    debug(`Registering ${options.transformers.length} transformer(s)...`);
    transformerManager.registerAll(options.transformers);
  }

  // ============================================================================
  // Register Built-in Plugins First
  // ============================================================================
  // IMPORTANT: Plugins must be registered before validation, as validation
  // checks if task types are known (i.e., handled by a registered plugin).
  debug('Registering built-in plugins...');
  registerBuiltInPlugins();

  // ============================================================================
  // Early Validation - Before any user input
  // ============================================================================
  debug('Validating task configurations...');
  const validationErrors = validateAllTasks(tasks);
  if (validationErrors.length > 0) {
    displayValidationErrors(validationErrors);
    process.exit(1);
  }
  debug('All tasks validated successfully');

  // Get enabled tasks (evaluate conditional enabled)
  // Use lazy evaluation - tasks with conditions referencing prompts will be included
  // and re-evaluated later with full config after prompts are collected
  const enabledTasks = tasks.filter((task) =>
    evaluateEnabled(task.enabled, createInitialConfig(), { lazy: true }),
  );

  // Sort tasks by dependencies
  debug('Resolving task dependencies...');
  const sortedTasks = topologicalSort(enabledTasks);
  debug(`Sorted ${sortedTasks.length} task(s) by dependencies`);

  // Create initial empty configuration (reuse the one we created earlier)
  info("Welcome! Let's execute your tasks.");

  if (options.dryRun) {
    warn('🔍 DRY RUN MODE - No changes will be made');
  }

  info('This will execute your project tasks based on the defined configuration.');

  const config = initialConfig;

  // ============================================================================
  // Process Variables (no user interaction)
  // ============================================================================

  // Collect all variables from top-level config
  const variables: VariableDefinition[] = options.variables ?? [];
  const allVariables: VariableDefinition[] = [...variables];

  // Validate variables
  if (allVariables.length > 0) {
    const variableErrors = validateVariables(allVariables);
    if (variableErrors.length > 0) {
      log('❌ Variable validation errors:', 'error');
      variableErrors.forEach((err) => log(`  - ${err}`, 'error'));

      process.exit(1);
    }

    // Resolve non-conditional variable values first (execute commands in parallel)
    // Conditional variables will be resolved after prompts are collected
    debug('Resolving variable values...');
    const resolvedVariableValues = await resolveAllVariableValues(allVariables, config, {
      skipConditional: true,
    });

    // Collect all variable values and merge into config
    const variableValues = await collectVariables(
      allVariables,
      resolvedVariableValues,
      config,
    );
    Object.assign(config, variableValues);

    // Log resolved variables if any
    if (Object.keys(variableValues).length > 0) {
      debug(`Resolved ${Object.keys(variableValues).length} variable(s)`);
      debug(`Variable values: ${JSON.stringify(variableValues)}`);
    }
  }

  // ============================================================================
  // Process Prompts (user interaction required)
  // ============================================================================

  // Collect top-level prompts (always global)
  const topLevelPrompts: PromptDefinition[] = options.prompts ?? [];
  const allPrompts: PromptDefinition[] = [...topLevelPrompts];

  // Validate prompts
  if (allPrompts.length > 0) {
    const promptErrors = validatePrompts(allPrompts);
    if (promptErrors.length > 0) {
      log('❌ Prompt validation errors:', 'error');
      promptErrors.forEach((err) => log(`  - ${err}`, 'error'));

      process.exit(1);
    }

    // Pre-resolve all default values (execute commands in parallel)
    debug('Resolving prompt default values...');
    const resolvedDefaults = await resolveAllDefaultValues(allPrompts, config);

    // Collect top-level prompts (always global)
    if (topLevelPrompts.length > 0) {
      info('📋 Collecting prompts (available to all tasks):');

      const globalAnswers = await collectPrompts(
        topLevelPrompts,
        resolvedDefaults,
        config,
      );
      // Merge global answers into config immediately
      Object.assign(config, globalAnswers);
    }
  }

  // ============================================================================
  // Re-resolve Conditional Variables (after prompts are collected)
  // ============================================================================
  // Now that we have all prompt values in config, resolve conditional variables
  if (allVariables.length > 0) {
    // Check if there are any conditional variables
    const conditionalVariables = allVariables.filter((v) => {
      if (typeof v.value === 'object' && v.value !== null && !Array.isArray(v.value)) {
        const valueConfig = v.value as { type?: string };
        return valueConfig.type === 'conditional';
      }
      return false;
    });

    if (conditionalVariables.length > 0) {
      debug('Re-resolving conditional variables with prompt values...');
      const resolvedConditionalValues = await resolveAllVariableValues(
        conditionalVariables,
        config,
      );

      // Merge conditional variable values into config
      const conditionalValues = await collectVariables(
        conditionalVariables,
        resolvedConditionalValues,
        config,
      );
      Object.assign(config, conditionalValues);

      if (Object.keys(conditionalValues).length > 0) {
        debug(
          `Resolved ${Object.keys(conditionalValues).length} conditional variable(s)`,
        );
      }
    }
  }

  // ============================================================================
  // Re-check Template-Level Enabled (After All Variables Resolved)
  // ============================================================================
  // Now that we have the full config with all variables and prompts,
  // re-evaluate the template-level enabled field in case it depends on variables
  const templateIsEnabledAfterConfig = await evaluateEnabledAsync(
    options.templateEnabled,
    config,
  );

  if (!templateIsEnabledAfterConfig) {
    info('⊘ Template is disabled after variable resolution - skipping all execution');
    return;
  }

  // Re-evaluate enabled tasks now that we have full config with all variables and prompts
  // Filter the already-sorted tasks to only keep enabled ones
  // Use async evaluation to support exec-type enabled
  const finalEnabledTasks = [];
  for (const task of sortedTasks) {
    // First check if the template this task belongs to is enabled
    if (task.$templateEnabled != null) {
      const taskTemplateIsEnabled = await evaluateEnabledAsync(
        task.$templateEnabled,
        config,
      );
      if (!taskTemplateIsEnabled) {
        // Skip this task if its template is disabled
        continue;
      }
    }

    // Then check if the task itself is enabled
    if (await evaluateEnabledAsync(task.enabled, config)) {
      finalEnabledTasks.push(task);
    }
  }

  log(
    `${finalEnabledTasks.length} of ${sortedTasks.length} task(s) enabled for execution`,
    'info',
  );

  // If dry-run mode, show diff and exit
  if (options.dryRun) {
    await displayTasksDiff(finalEnabledTasks, config);
    info('🔍 Dry run completed - no changes were made');
    info('Run without --dry-run to apply changes');
    return;
  }
  // Call beforeAll hook
  debug('Calling beforeAll hook...');
  await callHook('beforeAll', config);

  // Execute all enabled tasks
  const totalTasks = finalEnabledTasks.length;
  let completedTasks = 0;
  let failedTasks = 0;
  const completedTaskIds: string[] = [];
  const failedTaskNames: string[] = [];

  for (let i = 0; i < finalEnabledTasks.length; i++) {
    const task = finalEnabledTasks[i];
    if (task == null) continue; // Skip if task is undefined

    // Call beforeTask hook
    debug(`Calling beforeTask hook for task: ${task.name}`);
    await callHook('beforeTask', task, config);

    const taskSuccess = await runTask(task, config, i + 1, totalTasks, options.dryRun);

    if (taskSuccess) {
      completedTasks++;
      completedTaskIds.push(task.id);

      // Call afterTask hook
      debug(`Calling afterTask hook for task: ${task.name}`);
      await callHook('afterTask', task, config);
    } else {
      // Evaluate if task is required (defaults to true)
      const isRequired = await evaluateRequiredAsync(task.required, config);

      // Only count as failure if task is required
      if (isRequired) {
        failedTasks++;
        failedTaskNames.push(task.name);
      }

      // Call onError hook
      debug(`Calling onError hook for task: ${task.name}`);
      await callHook('onError', new Error(`Task ${task.name} failed`), task);

      // Log warning but continue execution
      warn(`⚠️  Task "${task.name}" failed, continuing with remaining tasks...`);
    }
  }

  if (failedTasks > 0) {
    log(`\n❌ Task execution completed with ${failedTasks} error(s)`, 'error');
    log(`Completed: ${completedTasks}/${totalTasks} tasks`, 'info');
    log(`Failed tasks: ${failedTaskNames.join(', ')}`, 'error');
    process.exit(1);
  }

  // Call afterAll hook
  debug('Calling afterAll hook...');
  await callHook('afterAll', config);

  logSuccess('✅ All tasks completed successfully!');

  logSuccess(` Completed: ${completedTasks}/${totalTasks} tasks`);
}

/**
 * Run templates sequentially for variables/prompts, then all tasks together
 * Phase 1: Process variables and prompts sequentially from each template
 * Phase 2: Collect all tasks from all enabled templates
 * Phase 3: Execute all tasks together at the end
 * This allows later templates to use values from earlier templates in their conditions,
 * while still executing all tasks together after all variables/prompts are resolved
 */
export async function runTemplatesSequentially(
  templates: import('./types.js').TasksConfiguration[],
  options: {
    dryRun: boolean;
    force: boolean;
    tasksFilePath: string | undefined;
  },
  config: import('./types.js').InitConfig = {},
): Promise<void> {
  debug('Running templates with sequential variable/prompt resolution...');
  debug(`Total templates to process: ${templates.length}`);

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

  for (let templateIndex = 0; templateIndex < templates.length; templateIndex++) {
    const template = templates[templateIndex];
    if (template == null) continue;

    const separatorLine = '='.repeat(SEPARATOR_LENGTH);
    debug(`\n${separatorLine}`);
    debug(
      `Processing template ${templateIndex + 1}/${templates.length}: "${template.name}"`,
    );
    debug(separatorLine);

    // Debug: Show current config keys
    debug(`Current config keys: ${Object.keys(config).join(', ')}`);

    // Check if this template is enabled
    // Now we have the full context from previous templates
    const templateIsEnabled = await evaluateEnabledAsync(template.enabled, config);

    if (!templateIsEnabled) {
      info(`⊘ Template "${template.name}" is disabled - skipping`);
      debug(`  Enabled condition: ${JSON.stringify(template.enabled)}`);
      continue;
    }

    // Process variables for this template
    const templateVariables = template.variables ?? [];
    if (templateVariables.length > 0) {
      debug(
        `Processing ${templateVariables.length} variable(s) for template "${template.name}"...`,
      );

      // Validate variables
      const variableErrors = validateVariables(templateVariables);
      if (variableErrors.length > 0) {
        log('❌ Variable validation errors:', 'error');
        variableErrors.forEach((err) => log(`  - ${err}`, 'error'));
        process.exit(1);
      }

      // Resolve non-conditional variables first
      const resolvedVariableValues = await resolveAllVariableValues(
        templateVariables,
        config,
        { skipConditional: true },
      );

      // Collect and merge into config
      const variableValues = await collectVariables(
        templateVariables,
        resolvedVariableValues,
        config,
      );
      Object.assign(config, variableValues);

      // Resolve conditional variables
      const conditionalVariables = templateVariables.filter((v) => {
        if (typeof v.value === 'object' && v.value !== null && !Array.isArray(v.value)) {
          const valueConfig = v.value as { type?: string };
          return valueConfig.type === 'conditional';
        }
        return false;
      });

      let conditionalValuesCount = 0;
      if (conditionalVariables.length > 0) {
        const resolvedConditionalValues = await resolveAllVariableValues(
          conditionalVariables,
          config,
        );
        const conditionalValues = await collectVariables(
          conditionalVariables,
          resolvedConditionalValues,
          config,
        );
        conditionalValuesCount = Object.keys(conditionalValues).length;
        Object.assign(config, conditionalValues);

        if (conditionalValuesCount > 0) {
          debug(`Resolved ${conditionalValuesCount} conditional variable(s)`);
          for (const [key, value] of Object.entries(conditionalValues)) {
            debug(`  ${key} = ${JSON.stringify(value)}`);
          }
        }
      }

      const totalResolved = Object.keys(variableValues).length + conditionalValuesCount;
      if (totalResolved > 0) {
        debug(`Total variables resolved for template: ${totalResolved}`);
        for (const [key, value] of Object.entries(variableValues)) {
          debug(`  ${key} = ${JSON.stringify(value)}`);
        }
      }
    }

    // Process prompts for this template
    const templatePrompts = template.prompts ?? [];
    if (templatePrompts.length > 0) {
      debug(
        `Processing ${templatePrompts.length} prompt(s) for template "${template.name}"...`,
      );

      // Validate prompts
      const promptErrors = validatePrompts(templatePrompts);
      if (promptErrors.length > 0) {
        log('❌ Prompt validation errors:', 'error');
        promptErrors.forEach((err) => log(`  - ${err}`, 'error'));
        process.exit(1);
      }

      // Resolve default values
      const resolvedDefaults = await resolveAllDefaultValues(templatePrompts, config);

      // Collect prompts
      const promptAnswers = await collectPrompts(
        templatePrompts,
        resolvedDefaults,
        config,
      );

      // Merge into config
      Object.assign(config, promptAnswers);

      debug(`Collected ${Object.keys(promptAnswers).length} prompt answer(s)`);
    }

    // Re-check template enabled condition after variables and prompts are resolved
    const templateStillEnabled = await evaluateEnabledAsync(template.enabled, config);
    if (!templateStillEnabled) {
      info(
        `⊘ Template "${template.name}" became disabled after variable/prompt resolution - skipping tasks`,
      );
      continue;
    }

    // Collect tasks from this template (don't execute yet)
    const templateTasks = template.tasks ?? [];
    if (templateTasks.length > 0) {
      debug(
        `Found ${templateTasks.length} task(s) in template "${template.name}" (will execute later)`,
      );
      // Add tasks to the collection for later execution
      allTasks.push(...templateTasks);
    }
  }

  // ============================================================================
  // PHASE 2: Validate and Filter All Tasks
  // ============================================================================
  debug('\n🔧 Validating and filtering all collected tasks...');

  if (allTasks.length === 0) {
    log('No tasks found in any template', 'info');
    return;
  }

  // Validate all tasks
  const validationErrors = validateAllTasks(allTasks);
  if (validationErrors.length > 0) {
    displayValidationErrors(validationErrors);
    process.exit(1);
  }

  console.log('');
  log('🛠️  Preparing tasks...', 'info');

  // Filter enabled tasks (now we have full config with all variables/prompts)
  const enabledTasks = [];
  for (const task of allTasks) {
    if (await evaluateEnabledAsync(task.enabled, config)) {
      enabledTasks.push(task);
    }
  }
  console.log('');
  log(`Found ${allTasks.length} tasks (${enabledTasks.length} enabled)`, 'info');
  log('All tasks validated successfully', 'success');
  // Already logged above with the new format

  if (enabledTasks.length === 0) {
    log('No enabled tasks to execute', 'info');
    return;
  }

  // Sort by dependencies
  const sortedTasks = topologicalSort(enabledTasks);

  // ============================================================================
  // PHASE 3: Execute All Tasks Together
  // ============================================================================
  if (options.dryRun) {
    log('\n🔍 Dry run - showing task changes...', 'info');
    await displayTasksDiff(sortedTasks, config);
    log('\n🔍 Dry run completed - no changes were made', 'info');
    log('Run without --dry-run to apply changes', 'info');
    return;
  }

  console.log('');
  logInfo('⚙️  Executing tasks...');
  console.log('');

  await callHook('beforeAll', config);

  let completedTasks = 0;
  let failedTasks = 0;
  const failedTaskNames: string[] = [];

  for (let i = 0; i < sortedTasks.length; i++) {
    const task = sortedTasks[i];
    if (task == null) continue;

    await callHook('beforeTask', task, config);

    const success = await runTask(
      task,
      config,
      i + 1,
      sortedTasks.length,
      options.dryRun,
    );

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

  await callHook('afterAll', config);

  if (failedTasks > 0) {
    log(`\n❌ Task execution completed with ${failedTasks} error(s)`, 'error');
    log(`Completed: ${completedTasks}/${sortedTasks.length} tasks`, 'info');
    log(`Failed tasks: ${failedTaskNames.join(', ')}`, 'error');
    process.exit(1);
  }

  log(`Completed: ${completedTasks}/${sortedTasks.length} tasks`, 'success');
}
