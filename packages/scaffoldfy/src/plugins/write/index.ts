/**
 * write plugin registration
 */

import type { InitConfig, TaskDefinition, TaskPlugin } from '../../types.js';
import type { WriteConfig } from './types.js';
import { executeWrite } from './executor.js';

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
