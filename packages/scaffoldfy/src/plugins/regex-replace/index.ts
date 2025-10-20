/**
 * regex-replace plugin registration
 */

import type { InitConfig, TaskDefinition, TaskPlugin } from '../../types.js';
import type { RegexReplaceConfig } from './types.js';
import { executeRegexReplace } from './executor.js';

export const regexReplacePlugin: TaskPlugin = {
  name: 'regex-replace',
  version: '1.0.0',
  taskTypes: ['regex-replace'],
  execute: async (
    task: TaskDefinition,
    config: InitConfig,
    options: { dryRun: boolean },
  ): Promise<void> => {
    if (options.dryRun) {
      return;
    }
    await executeRegexReplace(task.config as RegexReplaceConfig, config);
  },
};
