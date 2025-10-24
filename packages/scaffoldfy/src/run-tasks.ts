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
import { callHook } from './plugin.js';
import {
  collectPrompts,
  resolveAllDefaultValues,
  validatePrompts,
} from './prompts/index.js';
import { registerBuiltInPlugins, runTask } from './task-executors.js';
import { topologicalSort } from './task-resolver.js';
import { evaluateEnabled, evaluateEnabledAsync, log } from './utils.js';
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
    templateEnabled?: EnabledValue;
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
    log('⊘ Template is disabled - skipping all execution', 'info');
    return;
  }
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
  // Use lazy evaluation - tasks with conditions referencing prompts will be included
  // and re-evaluated later with full config after prompts are collected
  const enabledTasks = tasks.filter((task) =>
    evaluateEnabled(task.enabled, createInitialConfig(), { lazy: true }),
  );

  // Sort tasks by dependencies
  log('Resolving task dependencies...', 'info');
  const sortedTasks = topologicalSort(enabledTasks);

  // Create initial empty configuration (reuse the one we created earlier)
  log("Welcome! Let's execute your tasks.", 'info');

  if (options.dryRun) {
    log('🔍 DRY RUN MODE - No changes will be made', 'warn');
  }

  log('This will execute your project tasks based on the defined configuration.', 'info');

  const config = initialConfig;

  // ============================================================================
  // Process Variables (no user interaction)
  // ============================================================================

  // Collect all variables from top-level config
  const globalVariables: VariableDefinition[] = options.globalVariables ?? [];
  const allVariables: VariableDefinition[] = [...globalVariables];

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
    log('Resolving variable values...', 'info');
    const resolvedVariableValues = await resolveAllVariableValues(allVariables, config, {
      skipConditional: true,
    });

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

  // Collect top-level prompts (always global)
  const topLevelPrompts: PromptDefinition[] = options.globalPrompts ?? [];
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
    log('Resolving prompt default values...', 'info');
    const resolvedDefaults = await resolveAllDefaultValues(allPrompts);

    // Collect top-level prompts (always global)
    if (topLevelPrompts.length > 0) {
      log('📋 Collecting prompts (available to all tasks):', 'info');

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
      log('Re-resolving conditional variables with prompt values...', 'info');
      const resolvedConditionalValues = await resolveAllVariableValues(
        conditionalVariables,
        config,
      );

      // Merge conditional variable values into config
      const conditionalValues = collectVariables(
        conditionalVariables,
        resolvedConditionalValues,
      );
      Object.assign(config, conditionalValues);

      if (Object.keys(conditionalValues).length > 0) {
        log(
          `✓ Resolved ${Object.keys(conditionalValues).length} conditional variable(s)`,
          'success',
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
    log(
      '⊘ Template is disabled after variable resolution - skipping all execution',
      'info',
    );
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
  log('Running templates with sequential variable/prompt resolution...', 'info');
  log(`Total templates to process: ${templates.length}`, 'info');

  // Register built-in plugins first
  registerBuiltInPlugins();

  const SEPARATOR_LENGTH = 60;
  const allTasks: TaskDefinition[] = [];

  // ============================================================================
  // PHASE 1: Process Variables and Prompts Sequentially
  // ============================================================================
  log('\n📋 Phase 1: Resolving variables and prompts from all templates...', 'info');

  for (let templateIndex = 0; templateIndex < templates.length; templateIndex++) {
    const template = templates[templateIndex];
    if (template == null) continue;

    const separatorLine = '='.repeat(SEPARATOR_LENGTH);
    log(`\n${separatorLine}`, 'info');
    log(
      `Processing template ${templateIndex + 1}/${templates.length}: "${template.name}"`,
      'info',
    );
    log(separatorLine, 'info');

    // Debug: Show current config keys
    if (process.env['DEBUG'] != null) {
      log(`Current config keys: ${Object.keys(config).join(', ')}`, 'info');
    }

    // Check if this template is enabled
    // Now we have the full context from previous templates
    const templateIsEnabled = await evaluateEnabledAsync(template.enabled, config);

    if (!templateIsEnabled) {
      log(`⊘ Template "${template.name}" is disabled - skipping`, 'info');
      if (template.enabled != null && process.env['DEBUG'] != null) {
        log(`  Enabled condition: ${JSON.stringify(template.enabled)}`, 'info');
      }
      continue;
    }

    // Process variables for this template
    const templateVariables = template.variables ?? [];
    if (templateVariables.length > 0) {
      log(
        `Processing ${templateVariables.length} variable(s) for template "${template.name}"...`,
        'info',
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
      const variableValues = collectVariables(templateVariables, resolvedVariableValues);
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
        const conditionalValues = collectVariables(
          conditionalVariables,
          resolvedConditionalValues,
        );
        conditionalValuesCount = Object.keys(conditionalValues).length;
        Object.assign(config, conditionalValues);

        if (conditionalValuesCount > 0) {
          log(`✓ Resolved ${conditionalValuesCount} conditional variable(s)`, 'success');
          if (process.env['DEBUG'] != null) {
            for (const [key, value] of Object.entries(conditionalValues)) {
              log(`  ${key} = ${JSON.stringify(value)}`, 'info');
            }
          }
        }
      }

      const totalResolved = Object.keys(variableValues).length + conditionalValuesCount;
      if (totalResolved > 0) {
        log(`✓ Total variables resolved for template: ${totalResolved}`, 'success');
      }
    }

    // Process prompts for this template
    const templatePrompts = template.prompts ?? [];
    if (templatePrompts.length > 0) {
      log(
        `Processing ${templatePrompts.length} prompt(s) for template "${template.name}"...`,
        'info',
      );

      // Validate prompts
      const promptErrors = validatePrompts(templatePrompts);
      if (promptErrors.length > 0) {
        log('❌ Prompt validation errors:', 'error');
        promptErrors.forEach((err) => log(`  - ${err}`, 'error'));
        process.exit(1);
      }

      // Resolve default values
      const resolvedDefaults = await resolveAllDefaultValues(templatePrompts);

      // Collect prompts
      const promptAnswers = await collectPrompts(
        templatePrompts,
        resolvedDefaults,
        config,
      );

      // Merge into config
      Object.assign(config, promptAnswers);

      log(`✓ Collected ${Object.keys(promptAnswers).length} prompt answer(s)`, 'success');
    }

    // Re-check template enabled condition after variables and prompts are resolved
    const templateStillEnabled = await evaluateEnabledAsync(template.enabled, config);
    if (!templateStillEnabled) {
      log(
        `⊘ Template "${template.name}" became disabled after variable/prompt resolution - skipping tasks`,
        'info',
      );
      continue;
    }

    // Collect tasks from this template (don't execute yet)
    const templateTasks = template.tasks ?? [];
    if (templateTasks.length > 0) {
      log(
        `Found ${templateTasks.length} task(s) in template "${template.name}" (will execute later)`,
        'info',
      );
      // Add tasks to the collection for later execution
      allTasks.push(...templateTasks);
    }
  }

  // ============================================================================
  // PHASE 2: Validate and Filter All Tasks
  // ============================================================================
  log('\n🔧 Phase 2: Validating and filtering all collected tasks...', 'info');

  if (allTasks.length === 0) {
    log('No tasks found in any template', 'info');
    return;
  }

  log(`Total tasks collected: ${allTasks.length}`, 'info');

  // Validate all tasks
  const validationErrors = validateAllTasks(allTasks);
  if (validationErrors.length > 0) {
    displayValidationErrors(validationErrors);
    process.exit(1);
  }
  log('✓ All tasks validated successfully', 'success');

  // Filter enabled tasks (now we have full config with all variables/prompts)
  const enabledTasks = [];
  for (const task of allTasks) {
    if (await evaluateEnabledAsync(task.enabled, config)) {
      enabledTasks.push(task);
    }
  }

  log(`${enabledTasks.length} of ${allTasks.length} task(s) enabled`, 'info');

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
    log('\n🔍 Phase 3: Dry run - showing task changes...', 'info');
    await displayTasksDiff(sortedTasks, config);
    log('\n🔍 Dry run completed - no changes were made', 'info');
    log('Run without --dry-run to apply changes', 'info');
    return;
  }

  log('\n⚙️  Phase 3: Executing all tasks...', 'info');
  log(`Starting task execution (${sortedTasks.length} tasks)...`, 'info');

  await callHook('beforeAll', config);

  let completedTasks = 0;
  let failedTasks = 0;

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
    } else if (task.required ?? true) {
      failedTasks++;
      await callHook('onError', new Error(`Task ${task.name} failed`), task);
      log(`❌ Critical task failed: ${task.name}`, 'error');
      break; // Stop on critical failure
    } else {
      log(`⚠️  Non-critical task failed: ${task.name}, continuing...`, 'warn');
      await callHook('onError', new Error(`Task ${task.name} failed`), task);
    }
  }

  await callHook('afterAll', config);

  if (failedTasks > 0) {
    log(`\n❌ Task execution failed with ${failedTasks} critical error(s)`, 'error');
    log(`✓ Completed: ${completedTasks}/${sortedTasks.length} tasks`, 'info');
    process.exit(1);
  }

  log('\n✅ All tasks completed successfully!', 'success');
  log(`✓ Completed: ${completedTasks}/${sortedTasks.length} tasks`, 'success');
}
