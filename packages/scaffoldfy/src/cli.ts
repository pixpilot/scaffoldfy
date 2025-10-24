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
import { debug, setDebugMode } from './logger.js';
import { validateTasksSchema } from './schema-validator.js';
import { loadTasksWithInheritance } from './template-inheritance.js';
import { log } from './utils.js';

// Interface for CLI options
interface CliOptions {
  dryRun?: boolean;
  force?: boolean;
  config?: string;
  validate?: boolean;
  debug?: boolean;
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
    '--config <path>',
    'Path to task configuration file (JSON or TypeScript)',
    './template-tasks.json',
  )
  .option(
    '--no-validate',
    'Skip schema validation of task configuration (validation is enabled by default)',
  )
  .option('--debug', 'Enable debug logging for verbose output')
  .action(async (options: CliOptions) => {
    // Set debug mode globally if --debug flag is present
    if (options.debug === true) {
      setDebugMode(true);
    }

    try {
      let tasks: TaskDefinition[] = [];
      let globalVariables: VariableDefinition[] | undefined;
      let globalPrompts: PromptDefinition[] | undefined;
      let templateEnabled: import('./types.js').EnabledValue | undefined;
      let tasksFilePath: string | undefined;

      // Load config file (supports both .json and .ts/.mjs)
      if (options.config != null && options.config !== '') {
        const configPath = path.resolve(process.cwd(), options.config);

        if (fs.existsSync(configPath)) {
          tasksFilePath = configPath;
          const isTypeScript = configPath.endsWith('.ts') || configPath.endsWith('.mts');

          // Try TypeScript/ESM file
          if (isTypeScript) {
            log(`Loading tasks from TypeScript file: ${options.config}`, 'info');

            try {
              // Dynamic import for ES modules
              const tasksModule = (await import(configPath)) as {
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
              log(`Failed to load TypeScript config file: ${options.config}`, 'error');
              if (error instanceof Error) {
                log(`  Error: ${error.message}`, 'error');
              }

              process.exit(EXIT_CODE_ERROR);
            }
          } else {
            // JSON file
            try {
              // Validate schema if validation is enabled (default: true)
              if (options.validate !== false) {
                debug('Validating task configuration against schema...');

                // Load raw JSON for validation
                const rawJson = fs.readFileSync(configPath, 'utf-8');
                const rawConfig = JSON.parse(rawJson) as unknown;

                const validationResult = validateTasksSchema(rawConfig, {
                  silent: false,
                });

                if (!validationResult.valid) {
                  log('', 'error');
                  log(
                    '💡 You can skip validation with --no-validate flag, but this is not recommended.',
                    'info',
                  );
                  process.exit(EXIT_CODE_ERROR);
                }

                log('Configuration validated', 'success');
              }

              // Use template inheritance loader to support extends
              // Use sequential mode to process templates one at a time
              const config = await loadTasksWithInheritance(configPath, {
                sequential: true,
              });

              // If we have templates (sequential mode), run them sequentially
              if (config.templates != null && config.templates.length > 0) {
                const { runTemplatesSequentially } = await import('./run-tasks.js');
                const { createInitialConfig } = await import('./config.js');

                await runTemplatesSequentially(
                  config.templates,
                  {
                    dryRun: options.dryRun ?? false,
                    force: options.force ?? false,
                    tasksFilePath: configPath,
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
                log('❌ Invalid config file format', 'error');
                log('Expected JSON with { "tasks": [...] } structure', 'info');

                process.exit(EXIT_CODE_ERROR);
              }
            } catch (error) {
              log(`Failed to load JSON config file: ${options.config}`, 'error');
              if (error instanceof Error) {
                log(`  Error: ${error.message}`, 'error');
              }

              process.exit(EXIT_CODE_ERROR);
            }
          }
        } else {
          log(`Config file not found: ${options.config}`, 'warn');
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
        log('  3. Use --config option to specify a different config file', 'info');

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
