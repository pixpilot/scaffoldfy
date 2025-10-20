/**
 * git-init plugin registration
 */

import type { InitConfig, TaskDefinition, TaskPlugin } from '../../types.js';
import type { GitInitConfig } from './types.js';
import { executeGitInit } from './executor.js';

export const gitInitPlugin: TaskPlugin = {
  name: 'git-init',
  version: '1.0.0',
  taskTypes: ['git-init'],
  execute: async (
    task: TaskDefinition,
    config: InitConfig,
    options: { dryRun: boolean },
  ): Promise<void> => {
    if (options.dryRun) {
      return;
    }
    await executeGitInit(task.config as GitInitConfig, config);
  },
};
