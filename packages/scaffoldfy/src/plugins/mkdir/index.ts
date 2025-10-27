/**
 * mkdir plugin registration
 */

import type {
  CurrentConfigurationContext,
  TaskDefinition,
  TaskPlugin,
} from '../../types';
import type { MkdirConfig } from './types';
import { executeMkdir } from './executor';

export const mkdirPlugin: TaskPlugin = {
  name: 'mkdir',
  version: '1.0.0',
  taskTypes: ['mkdir'],
  execute: async (
    task: TaskDefinition,
    config: CurrentConfigurationContext,
    options: { dryRun: boolean },
  ): Promise<void> => {
    if (options.dryRun) {
      return;
    }
    await executeMkdir(task.config as MkdirConfig, config);
  },
};
