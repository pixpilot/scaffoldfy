/**
 * replace-in-file plugin executor
 */

import type { CurrentConfigurationContext } from '../../types';
import type { ReplaceInFileConfig } from './types';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { evaluateCondition, interpolateTemplate, log } from '../../utils';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

/**
 * Execute replace-in-file task
 */
export async function executeReplaceInFile(
  config: ReplaceInFileConfig,
  initConfig: CurrentConfigurationContext,
): Promise<void> {
  // Check condition if specified
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      log('Condition not met, skipping replace-in-file task', 'info');
      return;
    }
  }

  const filePath = path.join(process.cwd(), config.file);
  const { replacements } = config;

  if (!fs.existsSync(filePath)) {
    log(`File not found: ${filePath}, skipping`, 'warn');
    return;
  }

  let content = await readFile(filePath, 'utf-8');

  for (const { find, replace } of replacements) {
    const interpolatedReplace = interpolateTemplate(replace, initConfig);
    content = content.replace(new RegExp(find, 'gu'), interpolatedReplace);
  }

  await writeFile(filePath, content);
}
