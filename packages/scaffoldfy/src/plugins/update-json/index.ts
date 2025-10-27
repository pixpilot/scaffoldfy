/**
 * update-json plugin registration
 */

import type {
  CurrentConfigurationContext,
  TaskDefinition,
  TaskPlugin,
} from '../../types';
import type { UpdateJsonConfig } from './types';
import { executeUpdateJson } from './executor';

export const updateJsonPlugin: TaskPlugin = {
  name: 'update-json',
  version: '1.0.0',
  taskTypes: ['update-json'],
  execute: async (
    task: TaskDefinition,
    config: CurrentConfigurationContext,
    options: { dryRun: boolean },
  ): Promise<void> => {
    if (options.dryRun) {
      return;
    }
    await executeUpdateJson(task.config as UpdateJsonConfig, config);
  },
};
