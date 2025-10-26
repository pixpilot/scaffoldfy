/**
 * write plugin executor
 */

import type { InitConfig, TaskDefinition } from '../../types.js';
import type { WriteConfig } from './types.js';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { PluginConfigurationError } from '../../errors/other.js';
import { processTemplate, validateTemplateConfig } from '../../template-utils.js';
import { evaluateCondition, log } from '../../utils';

const writeFile = promisify(fs.writeFile);

/**
 * Execute write task
 */
export async function executeWrite(
  config: WriteConfig,
  initConfig: InitConfig,
  task?: TaskDefinition,
): Promise<void> {
  const { allowCreate = true } = config;

  // Check condition if specified
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      log('Condition not met, skipping write task', 'info');
      return;
    }
  }

  const filePath = path.join(process.cwd(), config.file);

  const fileExists = fs.existsSync(filePath);
  if (!fileExists) {
    if (allowCreate === false) {
      throw new Error(`Write task failed: file does not exist (${config.file})`);
    }

    log(`File not found, creating new file: ${config.file}`, 'info');
  }

  // Validate that either template or templateFile is provided
  const validation = validateTemplateConfig(config);

  if (!validation.isValid) {
    if (validation.error?.includes('cannot have both')) {
      throw PluginConfigurationError.templateHasBothTemplateAndFile();
    }
    throw PluginConfigurationError.templateMissingTemplateOrFile();
  }

  // Process the template using the utility
  const content = await processTemplate(config, initConfig, task);

  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await writeFile(filePath, content);
}
