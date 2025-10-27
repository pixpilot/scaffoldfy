/**
 * rename plugin registration
 */

import type { InitConfig, TaskDefinition, TaskPlugin } from '../../types';
import type { RenameConfig } from './types';
import { executeRename } from './executor';

export const renamePlugin: TaskPlugin = {
  name: 'rename',
  version: '1.0.0',
  taskTypes: ['rename'],
  execute: async (
    task: TaskDefinition,
    config: InitConfig,
    options: { dryRun: boolean },
  ): Promise<void> => {
    if (options.dryRun) {
      return;
    }
    await executeRename(task.config as RenameConfig, config);
  },
};
