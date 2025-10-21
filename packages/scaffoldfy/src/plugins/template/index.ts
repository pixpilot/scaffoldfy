/**
 * template plugin registration
 */

import type { InitConfig, TaskDefinition, TaskPlugin } from '../../types.js';
import type { TemplateConfig } from './types.js';
import { executeTemplate } from './executor.js';

export const templatePlugin: TaskPlugin = {
  name: 'template',
  version: '1.0.0',
  taskTypes: ['template'],
  execute: async (
    task: TaskDefinition,
    config: InitConfig,
    options: { dryRun: boolean },
  ): Promise<void> => {
    if (options.dryRun) {
      return;
    }
    await executeTemplate(task.config as TemplateConfig, config, task);
  },
};
