/**
 * copy plugin registration
 */

import type { InitConfig, TaskDefinition, TaskPlugin } from '../../types';
import type { CopyConfig } from './types';
import { executeCopy } from './executor';

export const copyPlugin: TaskPlugin = {
  name: 'copy',
  version: '1.0.0',
  taskTypes: ['copy'],
  execute: async (
    task: TaskDefinition,
    config: InitConfig,
    options: { dryRun: boolean },
  ): Promise<void> => {
    if (options.dryRun) {
      return;
    }
    await executeCopy(task.config as CopyConfig, config);
  },
};
