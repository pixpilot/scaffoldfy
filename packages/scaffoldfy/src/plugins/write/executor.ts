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
import { evaluateCondition, log } from '../../utils.js';

const writeFile = promisify(fs.writeFile);

/**
 * Execute write task
 */
export async function executeWrite(
  config: WriteConfig,
  initConfig: InitConfig,
  task?: TaskDefinition,
): Promise<void> {
  // Check condition if specified
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      log('Condition not met, skipping write task', 'info');
      return;
    }
  }

  const filePath = path.join(process.cwd(), config.file);

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

  await writeFile(filePath, content);
}
