/**
 * regex-replace plugin executor
 */

import type { InitConfig } from '../../types.js';
import type { RegexReplaceConfig } from './types.js';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { evaluateCondition, interpolateTemplate, log } from '../../utils.js';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

/**
 * Execute regex-replace task
 */
export async function executeRegexReplace(
  config: RegexReplaceConfig,
  initConfig: InitConfig,
): Promise<void> {
  // Check condition if specified
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      log('Condition not met, skipping regex-replace task', 'info');
      return;
    }
  }

  const filePath = path.join(process.cwd(), config.file);
  const { pattern } = config;
  const flags = config.flags ?? '';
  const replacement = config.replacement || '';

  let content = await readFile(filePath, 'utf-8');
  const regex = new RegExp(pattern, flags);
  content = content.replace(regex, interpolateTemplate(replacement, initConfig));

  await writeFile(filePath, content);
}
