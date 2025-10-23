/**
 * create plugin registration
 */

import type { InitConfig, TaskDefinition, TaskPlugin } from '../../types.js';
import type { CreateConfig } from './types.js';
import { executeCreate } from './executor.js';

export const createPlugin: TaskPlugin = {
  name: 'create',
  version: '1.0.0',
  taskTypes: ['create'],
  execute: async (
    task: TaskDefinition,
    config: InitConfig,
    options: { dryRun: boolean },
  ): Promise<void> => {
    if (options.dryRun) {
      return;
    }
    await executeCreate(task.config as CreateConfig, config, task);
  },
};
