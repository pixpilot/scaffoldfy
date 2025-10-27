/**
 * File operation task diffs
 *
 * Functions for generating diffs for tasks that perform file operations.
 */

import type {
  AppendConfig,
  CopyConfig,
  CreateConfig,
  DeleteConfig,
  InitConfig,
  MkdirConfig,
  MoveConfig,
  RenameConfig,
  TaskDefinition,
  WriteConfig,
} from '../types.js';

import {
  getTemplateSourceDescription,
  hasInlineTemplate,
  processTemplate,
} from '../template-utils.js';
import { evaluateCondition, interpolateTemplate } from '../utils';
import {
  colors,
  fileExists,
  generateDiff,
  PREVIEW_LINES,
  readFileContent,
} from './utils.js';

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

  const filePath = config.file;
  const templateContent = interpolateTemplate(config.template, initConfig);

  if (!fileExists(filePath)) {
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
    const currentContent = await readFileContent(filePath);

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

  const filePath = config.file;

  // Check if file already exists
  if (fileExists(filePath)) {
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

  const filePath = config.file;

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

    if (fileExists(filePath)) {
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
  const existingPaths = paths.filter((p) => fileExists(p));

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

  if (!fileExists(from)) {
    return `${colors.red}✗ Source not found: ${from}${colors.reset}`;
  }

  if (fileExists(to)) {
    return `${colors.yellow}⚠ Destination already exists: ${to}${colors.reset}\n${colors.cyan}Would rename: ${from} → ${to}${colors.reset}`;
  }

  return `${colors.cyan}Would rename: ${from} → ${to}${colors.reset}`;
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

  if (!fileExists(from)) {
    return `${colors.red}✗ Source not found: ${from}${colors.reset}`;
  }

  if (fileExists(to)) {
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

  if (!fileExists(from)) {
    return `${colors.red}✗ Source not found: ${from}${colors.reset}`;
  }

  // Note: We can't easily determine if it's a file or directory without fs.statSync
  // For now, assume it's a file, but this could be improved
  const type = 'file';

  if (fileExists(to)) {
    return `${colors.yellow}⚠ Destination already exists: ${to}${colors.reset}\n${colors.cyan}Would copy ${type}: ${from} → ${to}${colors.reset}`;
  }

  return `${colors.cyan}Would copy ${type}: ${from} → ${to}${colors.reset}`;
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

  if (fileExists(dirPath)) {
    return `${colors.cyan}→ Directory already exists: ${dirPath}${colors.reset}`;
  }

  return `${colors.green}+ Would create directory: ${dirPath}${colors.reset}`;
}
