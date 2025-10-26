/**
 * rename plugin executor
 */

import type { InitConfig } from '../../types.js';
import type { RenameConfig } from './types.js';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { evaluateCondition, interpolateTemplate, log } from '../../utils';

const rename = promisify(fs.rename);

/**
 * Execute rename task
 */
export async function executeRename(
  config: RenameConfig,
  initConfig: InitConfig,
): Promise<void> {
  // Check condition if specified
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      log('Condition not met, skipping rename task', 'info');
      return;
    }
  }

  const from = path.join(process.cwd(), interpolateTemplate(config.from, initConfig));
  const to = path.join(process.cwd(), interpolateTemplate(config.to, initConfig));

  if (!fs.existsSync(from)) {
    log(`Source path does not exist: ${from}`, 'warn');
    return;
  }

  await rename(from, to);
}
