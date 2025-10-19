/**
 * Task execution functions
 */

import type {
  ConditionalDeleteConfig,
  DeleteConfig,
  ExecConfig,
  GitInitConfig,
  InitConfig,
  RegexReplaceConfig,
  RenameConfig,
  ReplaceInFileConfig,
  TaskDefinition,
  TemplateConfig,
  UpdateJsonConfig,
} from './types.js';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { promisify } from 'node:util';
import {
  evaluateCondition,
  interpolateTemplate,
  log,
  setNestedProperty,
} from './utils.js';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const rename = promisify(fs.rename);

const JSON_INDENT = 2;

/**
 * Execute update-json task
 */
export async function executeUpdateJson(
  config: UpdateJsonConfig,
  initConfig: InitConfig,
): Promise<void> {
  const filePath = path.join(process.cwd(), config.file);
  const { updates } = config;

  const content = await readFile(filePath, 'utf-8');
  const json = JSON.parse(content) as Record<string, unknown>;

  /**
   * Recursively interpolate template strings in objects
   */
  function interpolateValue(value: unknown): unknown {
    if (typeof value === 'string') {
      return interpolateTemplate(value, initConfig);
    }
    if (Array.isArray(value)) {
      return value.map((item) => interpolateValue(item));
    }
    if (value != null && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = interpolateValue(v);
      }
      return result;
    }
    return value;
  }

  // Apply updates
  for (const [key, value] of Object.entries(updates)) {
    const interpolatedValue = interpolateValue(value);

    if (key.includes('.')) {
      setNestedProperty(json, key, interpolatedValue);
    } else {
      json[key] = interpolatedValue;
    }
  }

  await writeFile(filePath, `${JSON.stringify(json, null, JSON_INDENT)}\n`);
}

/**
 * Execute template task
 */
export async function executeTemplate(
  config: TemplateConfig,
  initConfig: InitConfig,
): Promise<void> {
  const filePath = path.join(process.cwd(), config.file);
  const { template } = config;

  const content = interpolateTemplate(template, initConfig);
  await writeFile(filePath, content);
}

/**
 * Execute regex-replace task
 */
export async function executeRegexReplace(
  config: RegexReplaceConfig,
  initConfig: InitConfig,
): Promise<void> {
  const filePath = path.join(process.cwd(), config.file);
  const { pattern } = config;
  const flags = config.flags ?? '';
  const replacement = config.replacement || '';

  let content = await readFile(filePath, 'utf-8');
  const regex = new RegExp(pattern, flags);
  content = content.replace(regex, interpolateTemplate(replacement, initConfig));

  await writeFile(filePath, content);
}

/**
 * Execute replace-in-file task
 */
export async function executeReplaceInFile(
  config: ReplaceInFileConfig,
  initConfig: InitConfig,
): Promise<void> {
  const filePath = path.join(process.cwd(), config.file);
  const { replacements } = config;

  if (!fs.existsSync(filePath)) {
    log(`File not found: ${filePath}, skipping`, 'warn');
    return;
  }

  let content = await readFile(filePath, 'utf-8');

  for (const { find, replace } of replacements) {
    const interpolatedReplace = interpolateTemplate(replace, initConfig);
    content = content.replace(new RegExp(find, 'gu'), interpolatedReplace);
  }

  await writeFile(filePath, content);
}

/**
 * Execute delete task
 */
export async function executeDelete(config: DeleteConfig): Promise<void> {
  const { paths } = config;

  for (const relativePath of paths) {
    const fullPath = path.join(process.cwd(), relativePath);

    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
  }
}

/**
 * Execute conditional-delete task
 */
export async function executeConditionalDelete(
  config: ConditionalDeleteConfig,
  initConfig: InitConfig,
): Promise<void> {
  const { condition } = config;
  const { paths } = config;

  const shouldDelete = evaluateCondition(condition, initConfig);

  if (!shouldDelete) {
    log('Condition not met, skipping deletion', 'info');
    return;
  }

  await executeDelete({ paths });
}

/**
 * Execute rename task
 */
export async function executeRename(
  config: RenameConfig,
  initConfig: InitConfig,
): Promise<void> {
  const from = path.join(process.cwd(), interpolateTemplate(config.from, initConfig));
  const to = path.join(process.cwd(), interpolateTemplate(config.to, initConfig));

  if (!fs.existsSync(from)) {
    log(`Source path does not exist: ${from}`, 'warn');
    return;
  }

  await rename(from, to);
}

/**
 * Execute git-init task
 */
export async function executeGitInit(config: GitInitConfig): Promise<void> {
  if (config.removeExisting) {
    const gitDir = path.join(process.cwd(), '.git');
    if (fs.existsSync(gitDir)) {
      fs.rmSync(gitDir, { recursive: true, force: true });
    }
  }

  execSync('git init', { stdio: 'inherit' });

  if (config.initialCommit) {
    const message = config.message ?? 'Initial commit';
    execSync('git add .', { stdio: 'inherit' });
    execSync(`git commit -m "${message}"`, { stdio: 'inherit' });
  }
}

/**
 * Execute exec task
 */
export async function executeExec(config: ExecConfig): Promise<void> {
  const cwd = config.cwd != null ? path.join(process.cwd(), config.cwd) : process.cwd();

  execSync(config.command, {
    cwd,
    stdio: 'inherit',
  });
}

/**
 * Execute a task based on its type
 */
export async function executeTask(
  task: TaskDefinition,
  config: InitConfig,
  dryRun = false,
): Promise<void> {
  if (dryRun) {
    log(`[DRY RUN] Would execute: ${task.name}`, 'info');
    return;
  }

  switch (task.type) {
    case 'update-json':
      await executeUpdateJson(task.config as UpdateJsonConfig, config);
      break;
    case 'template':
      await executeTemplate(task.config as TemplateConfig, config);
      break;
    case 'regex-replace':
      await executeRegexReplace(task.config as RegexReplaceConfig, config);
      break;
    case 'replace-in-file':
      await executeReplaceInFile(task.config as ReplaceInFileConfig, config);
      break;
    case 'delete':
      await executeDelete(task.config as DeleteConfig);
      break;
    case 'conditional-delete':
      await executeConditionalDelete(task.config as ConditionalDeleteConfig, config);
      break;
    case 'rename':
      await executeRename(task.config as RenameConfig, config);
      break;
    case 'git-init':
      await executeGitInit(task.config as GitInitConfig);
      break;
    case 'exec':
      await executeExec(task.config as ExecConfig);
      break;
    default:
      // eslint-disable-next-line ts/restrict-template-expressions
      throw new Error(`Unknown task type: ${task.type}`);
  }
}

/**
 * Run a single task with error handling
 */
export async function runTask(
  task: TaskDefinition,
  config: InitConfig,
  taskNumber: number,
  totalTasks: number,
  dryRun = false,
): Promise<boolean> {
  try {
    log(`[${taskNumber}/${totalTasks}] Running: ${task.name}...`, 'info');
    await executeTask(task, config, dryRun);
    log(`✓ ${task.name}`, 'success');
    return true;
  } catch (error) {
    log(`✗ Failed: ${task.name}`, 'error');

    // Better error context
    if (error instanceof Error) {
      log(`  Reason: ${error.message}`, 'error');
      if (error.stack != null && process.env['DEBUG'] != null) {
        console.error(error.stack);
      }
    }

    if (task.required) {
      log(`  This is a required task. Initialization cannot continue.`, 'error');
    }

    return false;
  }
}
