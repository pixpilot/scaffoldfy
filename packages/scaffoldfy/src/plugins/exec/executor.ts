/**
 * exec plugin executor
 */

import type { InitConfig } from '../../types';
import type { ExecConfig } from './types';
import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { evaluateCondition, log } from '../../utils';

/**
 * Execute exec task
 */
export async function executeExec(
  config: ExecConfig,
  initConfig?: InitConfig,
): Promise<void> {
  // Check condition if specified
  if (config.condition != null && config.condition !== '') {
    if (!initConfig) {
      log('Condition specified but no config provided, skipping exec', 'warn');
      return;
    }
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      log('Condition not met, skipping exec task', 'info');
      return;
    }
  }

  const cwd = config.cwd != null ? path.join(process.cwd(), config.cwd) : process.cwd();

  execSync(config.command, {
    cwd,
    stdio: 'inherit',
  });
}
