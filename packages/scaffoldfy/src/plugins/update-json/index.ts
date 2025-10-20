/**
 * update-json plugin registration
 */

import type { InitConfig, TaskDefinition, TaskPlugin } from '../../types.js';
import type { UpdateJsonConfig } from './types.js';
import { executeUpdateJson } from './executor.js';

export const updateJsonPlugin: TaskPlugin = {
  name: 'update-json',
  version: '1.0.0',
  taskTypes: ['update-json'],
  execute: async (
    task: TaskDefinition,
    config: InitConfig,
    options: { dryRun: boolean },
  ): Promise<void> => {
    if (options.dryRun) {
      return;
    }
    await executeUpdateJson(task.config as UpdateJsonConfig, config);
  },
};
