/**
 * mkdir plugin executor
 */

import type { CurrentConfigurationContext } from '../../types';
import type { MkdirConfig } from './types';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { evaluateCondition, interpolateTemplate, log } from '../../utils';

const mkdir = promisify(fs.mkdir);

/**
 * Execute mkdir task
 */
export async function executeMkdir(
  config: MkdirConfig,
  initConfig: CurrentConfigurationContext,
): Promise<void> {
  // Check condition if specified
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      log('Condition not met, skipping mkdir task', 'info');
      return;
    }
  }

  const dirPath = path.join(process.cwd(), interpolateTemplate(config.path, initConfig));

  // Create directory recursively
  await mkdir(dirPath, { recursive: true });
  log(`Created directory: ${config.path}`, 'success');
}
