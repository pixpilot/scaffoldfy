/**
 * append plugin registration
 */

import type { InitConfig, TaskDefinition, TaskPlugin } from '../../types';
import type { AppendConfig } from './types';
import { executeAppend } from './executor';

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
