/**
 * move plugin registration
 */

import type { InitConfig, TaskDefinition, TaskPlugin } from '../../types';
import type { MoveConfig } from './types';
import { executeMove } from './executor';

export const movePlugin: TaskPlugin = {
  name: 'move',
  version: '1.0.0',
  taskTypes: ['move'],
  execute: async (
    task: TaskDefinition,
    config: InitConfig,
    options: { dryRun: boolean },
  ): Promise<void> => {
    if (options.dryRun) {
      return;
    }
    await executeMove(task.config as MoveConfig, config);
  },
};
