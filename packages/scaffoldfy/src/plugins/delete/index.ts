/**
 * delete plugin registration
 */

import type { InitConfig, TaskDefinition, TaskPlugin } from '../../types.js';
import type { DeleteConfig } from './types.js';
import { executeDelete } from './executor.js';

export const deletePlugin: TaskPlugin = {
  name: 'delete',
  version: '1.0.0',
  taskTypes: ['delete'],
  execute: async (
    task: TaskDefinition,
    config: InitConfig,
    options: { dryRun: boolean },
  ): Promise<void> => {
    if (options.dryRun) {
      return;
    }
    await executeDelete(task.config as DeleteConfig, config);
  },
};
