/**
 * write plugin registration
 */

import type { InitConfig, TaskDefinition, TaskPlugin } from '../../types';
import type { WriteConfig } from './types';
import { executeWrite } from './executor';

export const writePlugin: TaskPlugin = {
  name: 'write',
  version: '1.0.0',
  taskTypes: ['write'],
  execute: async (
    task: TaskDefinition,
    config: InitConfig,
    options: { dryRun: boolean },
  ): Promise<void> => {
    if (options.dryRun) {
      return;
    }
    await executeWrite(task.config as WriteConfig, config, task);
  },
};
