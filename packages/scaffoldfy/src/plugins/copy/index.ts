/**
 * copy plugin registration
 */

import type { InitConfig, TaskDefinition, TaskPlugin } from '../../types.js';
import type { CopyConfig } from './types.js';
import { executeCopy } from './executor.js';

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
