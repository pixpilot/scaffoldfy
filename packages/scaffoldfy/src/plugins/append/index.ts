/**
 * append plugin registration
 */

import type { InitConfig, TaskDefinition, TaskPlugin } from '../../types.js';
import type { AppendConfig } from './types.js';
import { executeAppend } from './executor.js';

export const appendPlugin: TaskPlugin = {
  name: 'append',
  version: '1.0.0',
  taskTypes: ['append'],
  execute: async (
    task: TaskDefinition,
    config: InitConfig,
    options: { dryRun: boolean },
  ): Promise<void> => {
    if (options.dryRun) {
      return;
    }
    await executeAppend(task.config as AppendConfig, config, task);
  },
};
