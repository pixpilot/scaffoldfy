/**
 * exec-file plugin executor
 */

import type { InitConfig, TaskDefinition } from '../../types.js';
import type { ExecFileConfig } from './types.js';
import { evaluateCondition } from '../../utils.js';
import { executeScriptFile } from './execute-script-file.js';

/**
 * Execute exec-file task
 */
export async function executeExecFile(
  config: ExecFileConfig,
  initConfig: InitConfig,
  task?: TaskDefinition,
): Promise<void> {
  // Check condition if specified
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      return;
    }
  }

  // Use the shared execution function
  await executeScriptFile(
    {
      file: config.file,
      ...(config.runtime && { runtime: config.runtime }),
      ...(config.args && { args: config.args }),
      ...(config.parameters && { parameters: config.parameters }),
      ...(config.cwd != null && config.cwd.trim() !== '' && { cwd: config.cwd }),
      ...(task?.$sourceUrl != null &&
        task.$sourceUrl.trim() !== '' && { sourceUrl: task.$sourceUrl }),
      captureOutput: false,
    },
    initConfig,
  );
}
