/**
 * exec-file plugin registration
 */

import type {
  CurrentConfigurationContext,
  TaskDefinition,
  TaskPlugin,
} from '../../types';
import type { ExecFileConfig } from './types';
import { executeExecFile } from './executor';

export const execFilePlugin: TaskPlugin = {
  name: 'exec-file',
  version: '1.0.0',
  taskTypes: ['exec-file'],
  execute: async (
    task: TaskDefinition,
    config: CurrentConfigurationContext,
    options: { dryRun: boolean },
  ): Promise<void> => {
    if (options.dryRun) {
      return;
    }
    await executeExecFile(task.config as ExecFileConfig, config, task);
  },
};
