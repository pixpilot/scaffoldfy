/**
 * replace-in-file plugin registration
 */

import type { InitConfig, TaskDefinition, TaskPlugin } from '../../types';
import type { ReplaceInFileConfig } from './types';
import { executeReplaceInFile } from './executor';

export const replaceInFilePlugin: TaskPlugin = {
  name: 'replace-in-file',
  version: '1.0.0',
  taskTypes: ['replace-in-file'],
  execute: async (
    task: TaskDefinition,
    config: InitConfig,
    options: { dryRun: boolean },
  ): Promise<void> => {
    if (options.dryRun) {
      return;
    }
    await executeReplaceInFile(task.config as ReplaceInFileConfig, config);
  },
};
