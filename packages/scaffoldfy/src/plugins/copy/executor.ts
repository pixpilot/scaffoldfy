/**
 * copy plugin executor
 */

import type { InitConfig } from '../../types.js';
import type { CopyConfig } from './types.js';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { evaluateCondition, log } from '../../utils.js';

const copyFile = promisify(fs.copyFile);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);

/**
 * Recursively copy directory
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await copyDirectory(srcPath, destPath);
      } else {
        await copyFile(srcPath, destPath);
      }
    }),
  );
}

/**
 * Execute copy task
 */
export async function executeCopy(
  config: CopyConfig,
  initConfig: InitConfig,
): Promise<void> {
  // Check condition if specified
  if (config.condition != null && config.condition !== '') {
    const shouldExecute = evaluateCondition(config.condition, initConfig);
    if (!shouldExecute) {
      log('Condition not met, skipping copy task', 'info');
      return;
    }
  }

  const fromPath = path.join(process.cwd(), config.from);
  const toPath = path.join(process.cwd(), config.to);

  // Check if source exists
  let stats;
  try {
    stats = await stat(fromPath);
  } catch {
    log(`Source path does not exist: ${fromPath}`, 'warn');
    return;
  }

  // Create parent directory for destination if it doesn't exist
  const toDir = path.dirname(toPath);
  await mkdir(toDir, { recursive: true });

  // Copy file or directory
  if (stats.isDirectory()) {
    await copyDirectory(fromPath, toPath);
    log(`Copied directory ${config.from} to ${config.to}`, 'success');
  } else {
    await copyFile(fromPath, toPath);
    log(`Copied file ${config.from} to ${config.to}`, 'success');
  }
}
