#!/usr/bin/env node

/**
 * CLI for task automation
 */

import type { PromptDefinition, TaskDefinition, VariableDefinition } from './types.js';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Command } from 'commander';
import { EXIT_CODE_ERROR } from './constants.js';
import { runWithTasks } from './index.js';
import { validateTasksSchema } from './schema-validator.js';
import { loadTasksWithInheritance } from './template-inheritance.js';
import { log } from './utils.js';

// Interface for CLI options
interface CliOptions {
  dryRun?: boolean;
  force?: boolean;
  tasksFile?: string;
  tasksTs?: string;
  validate?: boolean;
}

const program = new Command();

// Read package.json for version
const packageJsonPath = path.join(__dirname, '..', 'package.json');
let version = '0.0.0';

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as {
    version?: string;
  };
  version = packageJson.version ?? '0.0.0';
} catch {
  // Use default version if package.json not found
}

program
  .name('scaffoldfy')
  .description('Automate project setup and configuration with customizable tasks')
  .version(version);

program
  .option('--dry-run', 'Run in dry mode without making any changes')
  .option('--force', 'Force execution even if checks fail')
  .option(
    '--tasks-file <path>',
    'Path to JSON file containing task definitions',
    './template-tasks.json',
  )
  .option(
    '--tasks-ts <path>',
    'Path to TypeScript file exporting tasks',
    './template-tasks.ts',
  )
  .option(
    '--no-validate',
    'Skip schema validation of task configuration (validation is enabled by default)',
  )
  .action(async (options: CliOptions) => {
    try {
      let tasks: TaskDefinition[] = [];
      let globalVariables: VariableDefinition[] | undefined;
      let globalPrompts: PromptDefinition[] | undefined;
      let templateEnabled: import('./types.js').EnabledValue | undefined;
      let tasksFilePath: string | undefined;

      // Try to load tasks from TypeScript file first (if specified and exists)
      if (options.tasksTs != null && options.tasksTs !== '') {
        const tsPath = path.resolve(process.cwd(), options.tasksTs);

        if (fs.existsSync(tsPath)) {
          log(`Loading tasks from TypeScript file: ${options.tasksTs}`, 'info');
          tasksFilePath = tsPath;

          try {
            // Dynamic import for ES modules
            const tasksModule = (await import(tsPath)) as {
              default?: TaskDefinition[];
              tasks?: TaskDefinition[];
            };
            tasks = tasksModule.default ?? tasksModule.tasks ?? [];

            if (!Array.isArray(tasks) || tasks.length === 0) {
              log('⚠️  No tasks found in TypeScript file or invalid format', 'warn');
              log(
                'Expected default export or named export "tasks" with TaskDefinition[]',
                'info',
              );
            }
          } catch (error) {
            log(`Failed to load TypeScript tasks file: ${options.tasksTs}`, 'error');
            if (error instanceof Error) {
              log(`  Error: ${error.message}`, 'error');
            }

            process.exit(EXIT_CODE_ERROR);
          }
        }
      }

      // Fall back to JSON file if no tasks loaded from TypeScript
      if (tasks.length === 0 && options.tasksFile != null && options.tasksFile !== '') {
        const jsonPath = path.resolve(process.cwd(), options.tasksFile);

        if (fs.existsSync(jsonPath)) {
          tasksFilePath = jsonPath;

          try {
            // Validate schema if validation is enabled (default: true)
            if (options.validate !== false) {
              log('Validating task configuration against schema...', 'info');

              // Load raw JSON for validation
              const rawJson = fs.readFileSync(jsonPath, 'utf-8');
              const rawConfig = JSON.parse(rawJson) as unknown;

              const validationResult = validateTasksSchema(rawConfig, { silent: false });

              if (!validationResult.valid) {
                log('', 'error');
                log(
                  '💡 You can skip validation with --no-validate flag, but this is not recommended.',
                  'info',
                );
                process.exit(EXIT_CODE_ERROR);
              }

              log('✓ Schema validation passed', 'success');
            }

            // Use template inheritance loader to support extends
            // Use sequential mode to process templates one at a time
            const config = await loadTasksWithInheritance(jsonPath, { sequential: true });

            // If we have templates (sequential mode), run them sequentially
            if (config.templates != null && config.templates.length > 0) {
              log('Using sequential template processing mode', 'info');
              const { runTemplatesSequentially } = await import('./run-tasks.js');
              const { createInitialConfig } = await import('./config.js');

              await runTemplatesSequentially(
                config.templates,
                {
                  dryRun: options.dryRun ?? false,
                  force: options.force ?? false,
                  tasksFilePath: jsonPath,
                },
                createInitialConfig(),
              );

              process.exit(0);
            }

            // Otherwise use the traditional merged approach
            tasks = config.tasks;
            globalVariables = config.variables;
            globalPrompts = config.prompts;
            templateEnabled = config.enabled;

            if (!Array.isArray(tasks)) {
              log('❌ Invalid tasks file format', 'error');
              log('Expected JSON with { "tasks": [...] } structure', 'info');

              process.exit(EXIT_CODE_ERROR);
            }
          } catch (error) {
            log(`Failed to load JSON tasks file: ${options.tasksFile}`, 'error');
            if (error instanceof Error) {
              log(`  Error: ${error.message}`, 'error');
            }

            process.exit(EXIT_CODE_ERROR);
          }
        } else {
          log(`Tasks file not found: ${options.tasksFile}`, 'warn');
        }
      }

      // If no tasks loaded but we have globalPrompts or globalVariables, that's okay (extending template)
      // Otherwise show error
      const hasGlobalData =
        (globalPrompts != null && globalPrompts.length > 0) ||
        (globalVariables != null && globalVariables.length > 0);

      if (tasks.length === 0 && !hasGlobalData) {
        log('❌ No tasks defined', 'error');

        log('Please provide tasks using one of these methods:', 'info');
        log('  1. Create a template-tasks.json file in the current directory', 'info');
        log('  2. Create a template-tasks.ts file in the current directory', 'info');
        log('  3. Use --tasks-file option to specify a different JSON file', 'info');
        log('  4. Use --tasks-ts option to specify a different TypeScript file', 'info');

        log('Example JSON structure:', 'info');
        const JSON_INDENT = 2;
        console.log(
          JSON.stringify(
            {
              tasks: [
                {
                  id: 'update-package',
                  name: 'Update package.json',
                  description: 'Update package.json with repository information',
                  required: true,
                  enabled: true,
                  type: 'update-json',
                  prompts: [
                    {
                      id: 'projectName',
                      type: 'input',
                      message: 'What is your project name?',
                      default: 'my-project',
                      required: true,
                    },
                    {
                      id: 'includeTests',
                      type: 'confirm',
                      message: 'Include test files?',
                      default: true,
                    },
                  ],
                  config: {
                    file: 'package.json',
                    updates: {
                      name: '{{projectName}}',
                      author: '{{author}}',
                    },
                  },
                },
              ],
            },
            null,
            JSON_INDENT,
          ),
        );

        process.exit(EXIT_CODE_ERROR);
      }

      if (tasks.length === 0) {
        log(
          'Loaded template with 0 tasks (template may only provide prompts/variables for extending)',
          'info',
        );
      } else {
        log(`Loaded ${tasks.length} task(s)`, 'success');
      }

      // Run task execution
      await runWithTasks(tasks, {
        dryRun: options.dryRun,
        force: options.force,
        tasksFilePath,
        globalVariables,
        globalPrompts,
        templateEnabled,
      });
    } catch (error) {
      log('❌ CLI execution failed', 'error');

      if (error instanceof Error) {
        log(`Error: ${error.message}`, 'error');

        const debugMode = process.env['DEBUG'];
        if (debugMode != null && debugMode !== '') {
          console.error(error.stack);
        }
      } else {
        console.error(error);
      }

      process.exit(EXIT_CODE_ERROR);
    }
  });

// Parse command line arguments
program.parse(process.argv);
