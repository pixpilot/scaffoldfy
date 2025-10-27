/**
 * Dry-run Diff - Show what would change before applying
 *
 * This module generates diffs showing what changes would be made
 * by each task without actually applying them.
 */

import type {
  AppendConfig,
  CopyConfig,
  CreateConfig,
  DeleteConfig,
  ExecConfig,
  GitInitConfig,
  InitConfig,
  MkdirConfig,
  MoveConfig,
  RegexReplaceConfig,
  RenameConfig,
  ReplaceInFileConfig,
  TaskDefinition,
  UpdateJsonConfig,
  WriteConfig,
} from '../types.js';

import {
  getRegexReplaceDiff,
  getReplaceInFileDiff,
  getUpdateJsonDiff,
} from './content-tasks.js';
import {
  getAppendDiff,
  getCopyDiff,
  getCreateDiff,
  getDeleteDiff,
  getMkdirDiff,
  getMoveDiff,
  getRenameDiff,
  getWriteDiff,
} from './file-tasks.js';
import { getExecDiff, getGitInitDiff } from './system-tasks.js';
import { colors, SEPARATOR_LENGTH } from './utils.js';

/**
 * Get diff for any task type
 */
export async function getTaskDiff(
  task: TaskDefinition,
  initConfig: InitConfig,
): Promise<string> {
  try {
    switch (task.type) {
      case 'update-json':
        return await getUpdateJsonDiff(task.config as UpdateJsonConfig, initConfig);
      case 'write':
        return await getWriteDiff(task.config as WriteConfig, initConfig);
      case 'create':
        return await getCreateDiff(task.config as CreateConfig, initConfig, task);
      case 'regex-replace':
        return await getRegexReplaceDiff(task.config as RegexReplaceConfig, initConfig);
      case 'replace-in-file':
        return await getReplaceInFileDiff(task.config as ReplaceInFileConfig, initConfig);
      case 'delete':
        return getDeleteDiff(task.config as DeleteConfig, initConfig);
      case 'rename':
        return getRenameDiff(task.config as RenameConfig, initConfig);
      case 'move':
        return getMoveDiff(task.config as MoveConfig, initConfig);
      case 'copy':
        return getCopyDiff(task.config as CopyConfig, initConfig);
      case 'append':
        return await getAppendDiff(task.config as AppendConfig, initConfig, task);
      case 'mkdir':
        return getMkdirDiff(task.config as MkdirConfig, initConfig);
      case 'git-init':
        return getGitInitDiff(task.config as GitInitConfig);
      case 'exec':
        return getExecDiff(task.config as ExecConfig, initConfig);
      case 'exec-file':
        return getExecDiff(task.config as ExecConfig, initConfig);
      default: {
        // Handle plugin tasks or unknown types
        const unknownType: string = task.type;
        return `${colors.yellow}⚠ Diff not available for task type: ${unknownType}${colors.reset}`;
      }
    }
  } catch (error) {
    return `${colors.red}✗ Error generating diff: ${
      error instanceof Error ? error.message : String(error)
    }${colors.reset}`;
  }
}

/**
 * Display diffs for all tasks
 */
export async function displayTasksDiff(
  tasks: TaskDefinition[],
  initConfig: InitConfig,
): Promise<void> {
  console.log(
    `${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`,
  );
  console.log(`${colors.blue}  DRY RUN - Preview of changes${colors.reset}`);
  console.log(
    `${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`,
  );

  /* eslint-disable no-await-in-loop */
  for (const task of tasks) {
    console.log(`${colors.cyan}▶ Task: ${task.name}${colors.reset}`);

    if (task.description != null && task.description !== '') {
      console.log(`${colors.gray}  ${task.description}${colors.reset}`);
    }

    const diff = await getTaskDiff(task, initConfig);
    console.log(diff);

    console.log(`${colors.gray}${'─'.repeat(SEPARATOR_LENGTH)}${colors.reset}`);
  }
  /* eslint-enable no-await-in-loop */

  console.log(
    `${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`,
  );
  console.log(`${colors.yellow}  No changes were applied (dry-run mode)${colors.reset}`);
  console.log(
    `${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`,
  );
}

// Re-export individual task diff functions for backward compatibility
export {
  getRegexReplaceDiff,
  getReplaceInFileDiff,
  getUpdateJsonDiff,
} from './content-tasks.js';
export {
  getAppendDiff,
  getCopyDiff,
  getCreateDiff,
  getDeleteDiff,
  getMkdirDiff,
  getMoveDiff,
  getRenameDiff,
  getWriteDiff,
} from './file-tasks.js';
export { getExecDiff, getGitInitDiff } from './system-tasks.js';
