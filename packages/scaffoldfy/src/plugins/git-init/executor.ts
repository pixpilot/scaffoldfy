/**
 * git-init plugin executor
 */

import type { InitConfig } from '../../types';
import type { GitInitConfig } from './types';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { evaluateCondition, log } from '../../utils';

/**
 * Execute git-init task
 */
export async function executeGitInit(
  config: GitInitConfig,
  initConfig?: InitConfig,
): Promise<void> {
  // Check condition if specified
  if (config.condition != null && config.condition !== '') {
    if (!initConfig) {
      log('Condition specified but no config provided, skipping git-init', 'warn');
      return;
    }
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      log('Condition not met, skipping git-init task', 'info');
      return;
    }
  }

  if (config.removeExisting) {
    const gitDir = path.join(process.cwd(), '.git');
    if (fs.existsSync(gitDir)) {
      fs.rmSync(gitDir, { recursive: true, force: true });
    }
  }

  execSync('git init', { stdio: 'inherit' });

  if (config.initialCommit) {
    const message = config.message ?? 'Initial commit';
    execSync('git add .', { stdio: 'inherit' });
    execSync(`git commit -m "${message}"`, { stdio: 'inherit' });
  }
}
