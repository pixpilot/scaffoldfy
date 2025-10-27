/**
 * git-init plugin registration
 */

import type {
  CurrentConfigurationContext,
  TaskDefinition,
  TaskPlugin,
} from '../../types';
import type { GitInitConfig } from './types';
import { executeGitInit } from './executor';

export const gitInitPlugin: TaskPlugin = {
  name: 'git-init',
  version: '1.0.0',
  taskTypes: ['git-init'],
  execute: async (
    task: TaskDefinition,
    config: CurrentConfigurationContext,
    options: { dryRun: boolean },
  ): Promise<void> => {
    if (options.dryRun) {
      return;
    }
    await executeGitInit(task.config as GitInitConfig, config);
  },
};
