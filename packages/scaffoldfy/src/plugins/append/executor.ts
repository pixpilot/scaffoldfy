/**
 * append plugin executor
 */

import type { CurrentConfigurationContext, TaskDefinition } from '../../types';
import type { AppendConfig } from './types';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { PluginConfigurationError } from '../../errors/other';
import { processTemplate, validateTemplateConfig } from '../../template';
import { evaluateCondition, interpolateTemplate, log } from '../../utils';

const appendFile = promisify(fs.appendFile);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

/**
 * Execute append task
 */
export async function executeAppend(
  config: AppendConfig,
  initConfig: CurrentConfigurationContext,
  task?: TaskDefinition,
): Promise<void> {
  // Check condition if specified
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      log('Condition not met, skipping append task', 'info');
      return;
    }
  }

  const filePath = path.join(process.cwd(), interpolateTemplate(config.file, initConfig));

  // Normalize config: support both 'content' and 'template' for inline content
  const normalizedConfig: { template?: string; templateFile?: string } = {};

  if (config.content != null) {
    normalizedConfig.template = config.content;
  } else if (config.template != null) {
    normalizedConfig.template = config.template;
  }

  if (config.templateFile != null) {
    normalizedConfig.templateFile = config.templateFile;
  }

  // Validate that either template or templateFile is provided
  const validation = validateTemplateConfig(normalizedConfig);

  if (!validation.isValid) {
    if (validation.error?.includes('cannot have both')) {
      throw PluginConfigurationError.templateHasBothTemplateAndFile();
    }
    throw PluginConfigurationError.templateMissingTemplateOrFile();
  }

  // Process the template using the utility
  const content = await processTemplate(normalizedConfig, initConfig, task);

  // Check if file exists and if we need to add a newline
  let fileExists = false;
  let needsNewline = false;

  try {
    await stat(filePath);
    fileExists = true;

    // Check if file ends with newline
    const existingContent = await readFile(filePath, 'utf-8');
    if (existingContent.length > 0 && !existingContent.endsWith('\n')) {
      needsNewline = config.newline !== false; // Default to true
    }
  } catch {
    // File doesn't exist, will be created
  }

  // Append content
  if (fileExists && needsNewline) {
    await appendFile(filePath, `\n${content}`);
  } else {
    await appendFile(filePath, content);
  }

  log(`Appended content to ${config.file}`, 'success');
}
