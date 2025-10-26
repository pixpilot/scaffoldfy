/**
 * delete plugin executor
 */

import type { InitConfig } from '../../types.js';
import type { DeleteConfig } from './types.js';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { evaluateCondition, log } from '../../utils';

/**
 * Execute delete task
 */
export async function executeDelete(
  config: DeleteConfig,
  initConfig?: InitConfig,
): Promise<void> {
  const { paths, condition } = config;

  // If condition is specified, evaluate it first
  if (condition != null && condition !== '') {
    if (!initConfig) {
      log('Condition specified but no config provided, skipping deletion', 'warn');
      return;
    }

    const shouldDelete = evaluateCondition(condition, initConfig);

    if (!shouldDelete) {
      log('Condition not met, skipping deletion', 'info');
      return;
    }
  }

  for (const relativePath of paths) {
    const fullPath = path.join(process.cwd(), relativePath);

    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
  }
}
