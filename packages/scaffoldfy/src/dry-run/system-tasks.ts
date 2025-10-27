/**
 * System operation task diffs
 *
 * Functions for generating diffs for tasks that perform system operations.
 */

import type { CurrentConfigurationContext, ExecConfig, GitInitConfig } from '../types';

import process from 'node:process';

import { evaluateCondition, interpolateTemplate } from '../utils';
import { colors, fileExists } from './utils';

/**
 * Get diff for git-init task
 */
export function getGitInitDiff(config: GitInitConfig): string {
  // Check condition
  if (config.condition != null && config.condition !== '') {
    return `${colors.yellow}⊘ Condition check skipped in dry-run${colors.reset}`;
  }

  const gitDir = '.git';
  const hasGit = fileExists(gitDir);

  const lines: string[] = [];

  if (config.removeExisting && hasGit) {
    lines.push(`${colors.red}Would remove existing .git directory${colors.reset}`);
  }

  lines.push(`${colors.green}Would initialize git repository${colors.reset}`);

  if (config.initialCommit) {
    const message = config.message ?? 'Initial commit';
    lines.push(`${colors.green}Would create initial commit: "${message}"${colors.reset}`);
  }

  return lines.join('\n');
}

/**
 * Get diff for exec task
 */
export function getExecDiff(
  config: ExecConfig,
  initConfig: CurrentConfigurationContext,
): string {
  // Check condition
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      return `${colors.yellow}⊘ Condition not met - task would be skipped${colors.reset}`;
    }
  }

  const command = interpolateTemplate(config.command, initConfig);
  const cwd =
    config.cwd != null ? interpolateTemplate(config.cwd, initConfig) : process.cwd();

  return `${colors.yellow}Would execute:${colors.reset}\n${colors.cyan}  Command: ${command}${colors.reset}\n${colors.cyan}  Working directory: ${cwd}${colors.reset}`;
}
