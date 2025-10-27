/**
 * create plugin registration
 */

import type {
  CurrentConfigurationContext,
  TaskDefinition,
  TaskPlugin,
} from '../../types';
import type { CreateConfig } from './types';
import { executeCreate } from './executor';

export const createPlugin: TaskPlugin = {
  name: 'create',
  version: '1.0.0',
  taskTypes: ['create'],
  execute: async (
    task: TaskDefinition,
    config: CurrentConfigurationContext,
    options: { dryRun: boolean },
  ): Promise<void> => {
    if (options.dryRun) {
      return;
    }
    await executeCreate(task.config as CreateConfig, config, task);
  },
};
