/**
 * update-json plugin executor
 */

import type { InitConfig } from '../../types';
import type { UpdateJsonConfig } from './types';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { evaluateCondition, interpolateTemplate, log } from '../../utils';
import { setNestedProperty } from '../../utils/object';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const JSON_INDENT = 2;

/**
 * Execute update-json task
 */
export async function executeUpdateJson(
  config: UpdateJsonConfig,
  initConfig: InitConfig,
): Promise<void> {
  // Check condition if specified
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      log('Condition not met, skipping update-json task', 'info');
      return;
    }
  }

  const filePath = path.join(process.cwd(), config.file);
  const { updates } = config;

  const content = await readFile(filePath, 'utf-8');
  const json = JSON.parse(content) as Record<string, unknown>;

  /**
   * Recursively interpolate template strings in objects
   */
  function interpolateValue(value: unknown): unknown {
    if (typeof value === 'string') {
      return interpolateTemplate(value, initConfig);
    }
    if (Array.isArray(value)) {
      return value.map((item) => interpolateValue(item));
    }
    if (value != null && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = interpolateValue(v);
      }
      return result;
    }
    return value;
  }

  // Apply updates
  for (const [key, value] of Object.entries(updates)) {
    const interpolatedValue = interpolateValue(value);

    if (key.includes('.')) {
      setNestedProperty(json, key, interpolatedValue);
    } else {
      json[key] = interpolatedValue;
    }
  }

  await writeFile(filePath, `${JSON.stringify(json, null, JSON_INDENT)}\n`);
}
