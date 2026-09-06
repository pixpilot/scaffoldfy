/**
 * exec plugin executor
 */

import type { CurrentConfigurationContext } from '../../types';
import type { ExecConfig } from './types';
import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { debug, evaluateCondition, interpolateTemplate, log } from '../../utils';
import { buildCommand } from './build-command';

/**
 * Execute exec task
 */
export async function executeExec(
  config: ExecConfig,
  initConfig?: CurrentConfigurationContext,
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

  const interpolate = (value: string): string =>
    initConfig != null ? interpolateTemplate(value, initConfig) : value;

  const command = buildCommand(
    interpolate(config.command),
    config.args?.map(interpolate),
  );

  const cwd =
    config.cwd != null
      ? path.join(process.cwd(), interpolate(config.cwd))
      : process.cwd();

  debug(`Executing: ${command}`);

  execSync(command, {
    cwd,
    stdio: 'inherit',
  });
}
