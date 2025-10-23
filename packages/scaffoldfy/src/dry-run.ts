/**
 * Dry-run Diff - Show what would change before applying
 *
 * This module generates diffs showing what changes would be made
 * by each task without actually applying them.
 */

import type {
  AppendConfig,
  CopyConfig,
  CreateConfig,
  DeleteConfig,
  ExecConfig,
  GitInitConfig,
  InitConfig,
  MkdirConfig,
  MoveConfig,
  RegexReplaceConfig,
  RenameConfig,
  ReplaceInFileConfig,
  TaskDefinition,
  UpdateJsonConfig,
  WriteConfig,
} from './types.js';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import {
  getTemplateSourceDescription,
  hasInlineTemplate,
  processTemplate,
} from './template-utils.js';
import { evaluateCondition, interpolateTemplate, setNestedProperty } from './utils.js';

const readFile = promisify(fs.readFile);
const JSON_INDENT = 2;
const PREVIEW_LINES = 10;
const SEPARATOR_LENGTH = 55;

/**
 * Color codes for terminal output
 */
const colors = {
  reset: '\x1B[0m',
  red: '\x1B[31m',
  green: '\x1B[32m',
  yellow: '\x1B[33m',
  blue: '\x1B[34m',
  cyan: '\x1B[36m',
  gray: '\x1B[90m',
};

/**
 * Format a diff line with colors
 */
function formatDiffLine(line: string, type: 'add' | 'remove' | 'context'): string {
  switch (type) {
    case 'add':
      return `${colors.green}+ ${line}${colors.reset}`;
    case 'remove':
      return `${colors.red}- ${line}${colors.reset}`;
    case 'context':
      return `${colors.gray}  ${line}${colors.reset}`;
    default:
      return line;
  }
}

/**
 * Generate a simple diff between two strings
 */
function generateDiff(original: string, modified: string): string[] {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  const diff: string[] = [];

  // Simple line-by-line comparison
  const maxLength = Math.max(originalLines.length, modifiedLines.length);

  for (let i = 0; i < maxLength; i++) {
    const origLine = originalLines[i];
    const modLine = modifiedLines[i];

    if (origLine === modLine) {
      // Line unchanged
      if (origLine !== undefined) {
        diff.push(formatDiffLine(origLine, 'context'));
      }
    } else {
      // Line changed
      if (origLine !== undefined) {
        diff.push(formatDiffLine(origLine, 'remove'));
      }
      if (modLine !== undefined) {
        diff.push(formatDiffLine(modLine, 'add'));
      }
    }
  }

  return diff;
}

/**
 * Get diff for update-json task
 */
export async function getUpdateJsonDiff(
  config: UpdateJsonConfig,
  initConfig: InitConfig,
): Promise<string> {
  // Check condition
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      return `${colors.yellow}⊘ Condition not met - task would be skipped${colors.reset}`;
    }
  }

  const filePath = path.join(process.cwd(), config.file);

  if (!fs.existsSync(filePath)) {
    return `${colors.red}✗ File not found: ${config.file}${colors.reset}`;
  }

  try {
    const content = await readFile(filePath, 'utf-8');
    const json = JSON.parse(content) as Record<string, unknown>;
    const originalJson = { ...json };

    // Apply updates to a copy
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

    for (const [key, value] of Object.entries(config.updates)) {
      const interpolatedValue = interpolateValue(value);
      if (key.includes('.')) {
        setNestedProperty(json, key, interpolatedValue);
      } else {
        json[key] = interpolatedValue;
      }
    }

    const originalContent = JSON.stringify(originalJson, null, JSON_INDENT);
    const modifiedContent = JSON.stringify(json, null, JSON_INDENT);

    if (originalContent === modifiedContent) {
      return `${colors.cyan}→ No changes${colors.reset}`;
    }

    const diff = generateDiff(originalContent, modifiedContent);
    return `${colors.blue}File: ${config.file}${colors.reset}\n${diff.join('\n')}`;
  } catch (error) {
    return `${colors.red}✗ Error: ${
      error instanceof Error ? error.message : String(error)
    }${colors.reset}`;
  }
}

/**
 * Get diff for write task
 */
export async function getWriteDiff(
  config: WriteConfig,
  initConfig: InitConfig,
): Promise<string> {
  // Check condition
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      return `${colors.yellow}⊘ Condition not met - task would be skipped${colors.reset}`;
    }
  }

  if (config.template == null || config.template === '') {
    return `${colors.red}✗ No template content provided for file: ${config.file}${colors.reset}`;
  }

  const filePath = path.join(process.cwd(), config.file);
  const templateContent = interpolateTemplate(config.template, initConfig);

  if (!fs.existsSync(filePath)) {
    const previewLines = templateContent.split('\n').slice(0, PREVIEW_LINES);
    const preview = previewLines.join('\n');
    const hasMore = templateContent.split('\n').length > PREVIEW_LINES;
    return `${colors.blue}File: ${config.file}${colors.reset}\n${
      colors.green
    }+ New file would be created${colors.reset}\n${
      colors.gray
    }Content preview:${colors.reset}\n${preview}${hasMore ? '\n...' : ''}`;
  }

  try {
    const currentContent = await readFile(filePath, 'utf-8');

    if (currentContent === templateContent) {
      return `${colors.cyan}→ No changes${colors.reset}`;
    }

    const diff = generateDiff(currentContent, templateContent);
    return `${colors.blue}File: ${config.file}${colors.reset}\n${diff.join('\n')}`;
  } catch (error) {
    return `${colors.red}✗ Error: ${
      error instanceof Error ? error.message : String(error)
    }${colors.reset}`;
  }
}

/**
 * Get diff for create task
 */
export async function getCreateDiff(
  config: CreateConfig,
  initConfig: InitConfig,
  task?: TaskDefinition,
): Promise<string> {
  // Check condition
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      return `${colors.yellow}⊘ Condition not met - task would be skipped${colors.reset}`;
    }
  }

  const filePath = path.join(process.cwd(), config.file);

  // Check if file already exists
  if (fs.existsSync(filePath)) {
    return `${colors.cyan}→ File already exists, would be skipped: ${config.file}${colors.reset}`;
  }

  try {
    // Use the template-utils to check if we have inline or file
    const inline = hasInlineTemplate(config);

    if (inline) {
      // Process inline template to show preview
      const templateContent = await processTemplate(config, initConfig, task);
      const previewLines = templateContent.split('\n').slice(0, PREVIEW_LINES);
      const preview = previewLines.join('\n');
      const hasMore = templateContent.split('\n').length > PREVIEW_LINES;
      return `${colors.blue}File: ${config.file}${colors.reset}\n${
        colors.green
      }+ New file would be created${colors.reset}\n${
        colors.gray
      }Content preview:${colors.reset}\n${preview}${hasMore ? '\n...' : ''}`;
    }

    // For external template files, show source description
    const sourceDesc = getTemplateSourceDescription(config);
    return `${colors.blue}File: ${config.file}${colors.reset}\n${colors.green}+ New file would be created from ${sourceDesc}${colors.reset}`;
  } catch (error) {
    return `${colors.red}✗ Error: ${
      error instanceof Error ? error.message : String(error)
    }${colors.reset}`;
  }
}

/**
 * Get diff for regex-replace task
 */
export async function getRegexReplaceDiff(
  config: RegexReplaceConfig,
  initConfig: InitConfig,
): Promise<string> {
  // Check condition
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      return `${colors.yellow}⊘ Condition not met - task would be skipped${colors.reset}`;
    }
  }

  const filePath = path.join(process.cwd(), config.file);

  if (!fs.existsSync(filePath)) {
    return `${colors.red}✗ File not found: ${config.file}${colors.reset}`;
  }

  try {
    const content = await readFile(filePath, 'utf-8');
    const regex = new RegExp(config.pattern, config.flags ?? 'g');
    const replacement = interpolateTemplate(config.replacement, initConfig);
    const modifiedContent = content.replace(regex, replacement);

    if (content === modifiedContent) {
      return `${colors.cyan}→ No matches found${colors.reset}`;
    }

    const diff = generateDiff(content, modifiedContent);
    return `${colors.blue}File: ${config.file}${colors.reset}\n${diff.join('\n')}`;
  } catch (error) {
    return `${colors.red}✗ Error: ${
      error instanceof Error ? error.message : String(error)
    }${colors.reset}`;
  }
}

/**
 * Get diff for replace-in-file task
 */
export async function getReplaceInFileDiff(
  config: ReplaceInFileConfig,
  initConfig: InitConfig,
): Promise<string> {
  // Check condition
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      return `${colors.yellow}⊘ Condition not met - task would be skipped${colors.reset}`;
    }
  }

  const filePath = path.join(process.cwd(), config.file);

  if (!fs.existsSync(filePath)) {
    return `${colors.red}✗ File not found: ${config.file}${colors.reset}`;
  }

  try {
    let content = await readFile(filePath, 'utf-8');
    const originalContent = content;

    for (const { find, replace } of config.replacements) {
      const findInterpolated = interpolateTemplate(find, initConfig);
      const replaceInterpolated = interpolateTemplate(replace, initConfig);
      content = content.replace(findInterpolated, replaceInterpolated);
    }

    if (originalContent === content) {
      return `${colors.cyan}→ No changes${colors.reset}`;
    }

    const diff = generateDiff(originalContent, content);
    return `${colors.blue}File: ${config.file}${colors.reset}\n${diff.join('\n')}`;
  } catch (error) {
    return `${colors.red}✗ Error: ${
      error instanceof Error ? error.message : String(error)
    }${colors.reset}`;
  }
}

/**
 * Get diff for delete task
 */
export function getDeleteDiff(config: DeleteConfig, initConfig: InitConfig): string {
  // Check condition
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      return `${colors.yellow}⊘ Condition not met - task would be skipped${colors.reset}`;
    }
  }

  const paths = config.paths.map((p) => interpolateTemplate(p, initConfig));
  const existingPaths = paths.filter((p) => fs.existsSync(path.join(process.cwd(), p)));

  if (existingPaths.length === 0) {
    return `${colors.cyan}→ No files/directories to delete${colors.reset}`;
  }

  return `${colors.red}Would delete:${colors.reset}\n${existingPaths
    .map((p) => `${colors.red}  - ${p}${colors.reset}`)
    .join('\n')}`;
}

/**
 * Get diff for rename task
 */
export function getRenameDiff(config: RenameConfig, initConfig: InitConfig): string {
  // Check condition
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      return `${colors.yellow}⊘ Condition not met - task would be skipped${colors.reset}`;
    }
  }

  const from = interpolateTemplate(config.from, initConfig);
  const to = interpolateTemplate(config.to, initConfig);
  const fromPath = path.join(process.cwd(), from);
  const toPath = path.join(process.cwd(), to);

  if (!fs.existsSync(fromPath)) {
    return `${colors.red}✗ Source not found: ${from}${colors.reset}`;
  }

  if (fs.existsSync(toPath)) {
    return `${colors.yellow}⚠ Destination already exists: ${to}${colors.reset}\n${colors.cyan}Would rename: ${from} → ${to}${colors.reset}`;
  }

  return `${colors.cyan}Would rename: ${from} → ${to}${colors.reset}`;
}

/**
 * Get diff for git-init task
 */
export function getGitInitDiff(config: GitInitConfig): string {
  // Check condition
  if (config.condition != null && config.condition !== '') {
    return `${colors.yellow}⊘ Condition check skipped in dry-run${colors.reset}`;
  }

  const gitDir = path.join(process.cwd(), '.git');
  const hasGit = fs.existsSync(gitDir);

  const lines: string[] = [];

  if (config.removeExisting && hasGit) {
    lines.push(`${colors.red}Would remove existing .git directory${colors.reset}`);
  }

  lines.push(`${colors.green}Would initialize git repository${colors.reset}`);

  if (config.initialCommit) {
    const message = config.message ?? 'Initial commit';
    lines.push(`${colors.green}Would create initial commit: "${message}"${colors.reset}`);
  }

  return lines.join('\n');
}

/**
 * Get diff for exec task
 */
export function getExecDiff(config: ExecConfig, initConfig: InitConfig): string {
  // Check condition
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      return `${colors.yellow}⊘ Condition not met - task would be skipped${colors.reset}`;
    }
  }

  const command = interpolateTemplate(config.command, initConfig);
  const cwd =
    config.cwd != null ? interpolateTemplate(config.cwd, initConfig) : process.cwd();

  return `${colors.yellow}Would execute:${colors.reset}\n${colors.cyan}  Command: ${command}${colors.reset}\n${colors.cyan}  Working directory: ${cwd}${colors.reset}`;
}

/**
 * Get diff for move task
 */
export function getMoveDiff(config: MoveConfig, initConfig: InitConfig): string {
  // Check condition
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      return `${colors.yellow}⊘ Condition not met - task would be skipped${colors.reset}`;
    }
  }

  const from = interpolateTemplate(config.from, initConfig);
  const to = interpolateTemplate(config.to, initConfig);
  const fromPath = path.join(process.cwd(), from);
  const toPath = path.join(process.cwd(), to);

  if (!fs.existsSync(fromPath)) {
    return `${colors.red}✗ Source not found: ${from}${colors.reset}`;
  }

  if (fs.existsSync(toPath)) {
    return `${colors.yellow}⚠ Destination already exists: ${to}${colors.reset}\n${colors.cyan}Would move: ${from} → ${to}${colors.reset}`;
  }

  return `${colors.cyan}Would move: ${from} → ${to}${colors.reset}`;
}

/**
 * Get diff for copy task
 */
export function getCopyDiff(config: CopyConfig, initConfig: InitConfig): string {
  // Check condition
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      return `${colors.yellow}⊘ Condition not met - task would be skipped${colors.reset}`;
    }
  }

  const from = interpolateTemplate(config.from, initConfig);
  const to = interpolateTemplate(config.to, initConfig);
  const fromPath = path.join(process.cwd(), from);
  const toPath = path.join(process.cwd(), to);

  if (!fs.existsSync(fromPath)) {
    return `${colors.red}✗ Source not found: ${from}${colors.reset}`;
  }

  const stats = fs.statSync(fromPath);
  const type = stats.isDirectory() ? 'directory' : 'file';

  if (fs.existsSync(toPath)) {
    return `${colors.yellow}⚠ Destination already exists: ${to}${colors.reset}\n${colors.cyan}Would copy ${type}: ${from} → ${to}${colors.reset}`;
  }

  return `${colors.cyan}Would copy ${type}: ${from} → ${to}${colors.reset}`;
}

/**
 * Get diff for append task
 */
export async function getAppendDiff(
  config: AppendConfig,
  initConfig: InitConfig,
  task?: TaskDefinition,
): Promise<string> {
  // Check condition
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      return `${colors.yellow}⊘ Condition not met - task would be skipped${colors.reset}`;
    }
  }

  const filePath = path.join(process.cwd(), config.file);

  // Normalize config for template processing
  const normalizedConfig: { template?: string; templateFile?: string } = {};
  if (config.content != null) {
    normalizedConfig.template = config.content;
  } else if (config.template != null) {
    normalizedConfig.template = config.template;
  }
  if (config.templateFile != null) {
    normalizedConfig.templateFile = config.templateFile;
  }

  try {
    const content = await processTemplate(normalizedConfig, initConfig, task);
    const previewLines = content.split('\n').slice(0, PREVIEW_LINES);
    const preview = previewLines.join('\n');
    const hasMore = content.split('\n').length > PREVIEW_LINES;

    if (fs.existsSync(filePath)) {
      return `${colors.blue}File: ${config.file}${colors.reset}\n${colors.green}+ Would append content${colors.reset}\n${colors.gray}Content preview:${colors.reset}\n${preview}${hasMore ? '\n...' : ''}`;
    }

    return `${colors.blue}File: ${config.file}${colors.reset}\n${colors.green}+ New file would be created with content${colors.reset}\n${colors.gray}Content preview:${colors.reset}\n${preview}${hasMore ? '\n...' : ''}`;
  } catch (error) {
    return `${colors.red}✗ Error: ${
      error instanceof Error ? error.message : String(error)
    }${colors.reset}`;
  }
}

/**
 * Get diff for mkdir task
 */
export function getMkdirDiff(config: MkdirConfig, initConfig: InitConfig): string {
  // Check condition
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      return `${colors.yellow}⊘ Condition not met - task would be skipped${colors.reset}`;
    }
  }

  const dirPath = interpolateTemplate(config.path, initConfig);
  const fullPath = path.join(process.cwd(), dirPath);

  if (fs.existsSync(fullPath)) {
    return `${colors.cyan}→ Directory already exists: ${dirPath}${colors.reset}`;
  }

  return `${colors.green}+ Would create directory: ${dirPath}${colors.reset}`;
}

/**
 * Get diff for any task type
 */
export async function getTaskDiff(
  task: TaskDefinition,
  initConfig: InitConfig,
): Promise<string> {
  try {
    switch (task.type) {
      case 'update-json':
        return await getUpdateJsonDiff(task.config as UpdateJsonConfig, initConfig);
      case 'write':
        return await getWriteDiff(task.config as WriteConfig, initConfig);
      case 'create':
        return await getCreateDiff(task.config as CreateConfig, initConfig, task);
      case 'regex-replace':
        return await getRegexReplaceDiff(task.config as RegexReplaceConfig, initConfig);
      case 'replace-in-file':
        return await getReplaceInFileDiff(task.config as ReplaceInFileConfig, initConfig);
      case 'delete':
        return getDeleteDiff(task.config as DeleteConfig, initConfig);
      case 'rename':
        return getRenameDiff(task.config as RenameConfig, initConfig);
      case 'move':
        return getMoveDiff(task.config as MoveConfig, initConfig);
      case 'copy':
        return getCopyDiff(task.config as CopyConfig, initConfig);
      case 'append':
        return await getAppendDiff(task.config as AppendConfig, initConfig, task);
      case 'mkdir':
        return getMkdirDiff(task.config as MkdirConfig, initConfig);
      case 'git-init':
        return getGitInitDiff(task.config as GitInitConfig);
      case 'exec':
        return getExecDiff(task.config as ExecConfig, initConfig);
      default: {
        // Handle plugin tasks or unknown types
        const unknownType: string = task.type;
        return `${colors.yellow}⚠ Diff not available for task type: ${unknownType}${colors.reset}`;
      }
    }
  } catch (error) {
    return `${colors.red}✗ Error generating diff: ${
      error instanceof Error ? error.message : String(error)
    }${colors.reset}`;
  }
}

/**
 * Display diffs for all tasks
 */
export async function displayTasksDiff(
  tasks: TaskDefinition[],
  initConfig: InitConfig,
): Promise<void> {
  console.log(
    `${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`,
  );
  console.log(`${colors.blue}  DRY RUN - Preview of changes${colors.reset}`);
  console.log(
    `${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`,
  );

  /* eslint-disable no-await-in-loop */
  for (const task of tasks) {
    console.log(`${colors.cyan}▶ Task: ${task.name}${colors.reset}`);

    if (task.description != null && task.description !== '')
      console.log(`${colors.gray}  ${task.description}${colors.reset}`);

    const diff = await getTaskDiff(task, initConfig);
    console.log(diff);

    console.log(`${colors.gray}${'─'.repeat(SEPARATOR_LENGTH)}${colors.reset}`);
  }
  /* eslint-enable no-await-in-loop */

  console.log(
    `${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`,
  );
  console.log(`${colors.yellow}  No changes were applied (dry-run mode)${colors.reset}`);
  console.log(
    `${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`,
  );
}
