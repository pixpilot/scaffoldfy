/**
 * exec-file plugin registration
 */

import type { InitConfig, TaskDefinition, TaskPlugin } from '../../types.js';
import type { ExecFileConfig } from './types.js';
import { executeExecFile } from './executor.js';

export const execFilePlugin: TaskPlugin = {
  name: 'exec-file',
  version: '1.0.0',
  taskTypes: ['exec-file'],
  execute: async (
    task: TaskDefinition,
    config: InitConfig,
    options: { dryRun: boolean },
  ): Promise<void> => {
    if (options.dryRun) {
      return;
    }
    await executeExecFile(task.config as ExecFileConfig, config, task);
  },
};
