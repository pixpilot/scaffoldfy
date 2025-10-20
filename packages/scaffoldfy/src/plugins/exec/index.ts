/**
 * exec plugin registration
 */

import type { InitConfig, TaskDefinition, TaskPlugin } from '../../types.js';
import type { ExecConfig } from './types.js';
import { executeExec } from './executor.js';

export const execPlugin: TaskPlugin = {
  name: 'exec',
  version: '1.0.0',
  taskTypes: ['exec'],
  execute: async (
    task: TaskDefinition,
    config: InitConfig,
    options: { dryRun: boolean },
  ): Promise<void> => {
    if (options.dryRun) {
      return;
    }
    await executeExec(task.config as ExecConfig, config);
  },
};
