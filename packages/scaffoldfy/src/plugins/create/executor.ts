/**
 * create plugin executor
 */

import type { CurrentConfigurationContext, TaskDefinition } from '../../types';
import type { CreateConfig } from './types';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { PluginConfigurationError } from '../../errors/other';
import { processTemplate, validateTemplateConfig } from '../../template';
import { evaluateCondition, interpolateTemplate, log } from '../../utils';

const writeFile = promisify(fs.writeFile);

/**
 * Execute create task - creates a file but doesn't overwrite if it exists
 */
export async function executeCreate(
  config: CreateConfig,
  initConfig: CurrentConfigurationContext,
  task?: TaskDefinition,
): Promise<void> {
  // Check condition if specified
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      log('Condition not met, skipping create task', 'info');
      return;
    }
  }

  const resolvedFile = interpolateTemplate(config.file, initConfig);
  const filePath = path.join(process.cwd(), resolvedFile);

  // Check if file already exists - skip if it does
  if (fs.existsSync(filePath)) {
    log(`File already exists, skipping: ${resolvedFile}`, 'info');
    return;
  }

  // Validate that either template or templateFile is provided
  const validation = validateTemplateConfig(config);

  if (!validation.isValid) {
    if (validation.error?.includes('cannot have both')) {
      throw PluginConfigurationError.createHasBothTemplateAndFile();
    }
    throw PluginConfigurationError.createMissingTemplateOrFile();
  }

  // Process the template using the utility
  const content = await processTemplate(config, initConfig, task);

  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await writeFile(filePath, content);
  log(`Created file: ${resolvedFile}`, 'success');
}
