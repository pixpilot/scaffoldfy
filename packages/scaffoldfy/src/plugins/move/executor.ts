/**
 * move plugin executor
 */

import type { InitConfig } from '../../types.js';
import type { MoveConfig } from './types.js';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { evaluateCondition, log } from '../../utils';

const rename = promisify(fs.rename);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);

/**
 * Execute move task
 */
export async function executeMove(
  config: MoveConfig,
  initConfig: InitConfig,
): Promise<void> {
  // Check condition if specified
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      log('Condition not met, skipping move task', 'info');
      return;
    }
  }

  const fromPath = path.join(process.cwd(), config.from);
  const toPath = path.join(process.cwd(), config.to);

  // Check if source exists
  try {
    await stat(fromPath);
  } catch {
    log(`Source path does not exist: ${fromPath}`, 'warn');
    return;
  }

  // Create parent directory for destination if it doesn't exist
  const toDir = path.dirname(toPath);
  await mkdir(toDir, { recursive: true });

  // Move the file or directory
  await rename(fromPath, toPath);
  log(`Moved ${config.from} to ${config.to}`, 'success');
}
