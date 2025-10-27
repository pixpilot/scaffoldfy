/**
 * delete plugin registration
 */

import type {
  CurrentConfigurationContext,
  TaskDefinition,
  TaskPlugin,
} from '../../types';
import type { DeleteConfig } from './types';
import { executeDelete } from './executor';

export const deletePlugin: TaskPlugin = {
  name: 'delete',
  version: '1.0.0',
  taskTypes: ['delete'],
  execute: async (
    task: TaskDefinition,
    config: CurrentConfigurationContext,
    options: { dryRun: boolean },
  ): Promise<void> => {
    if (options.dryRun) {
      return;
    }
    await executeDelete(task.config as DeleteConfig, config);
  },
};
