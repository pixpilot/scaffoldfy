/**
 * Initialization state management
 */

import type { InitConfig, InitializationMetadata } from './types.js';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const INIT_FLAG = '.scaffoldfyialized';

/**
 * Load initialization state from file
 */
export function loadInitializationState(): InitializationMetadata | null {
  const flagPath = path.join(process.cwd(), INIT_FLAG);

  if (!fs.existsSync(flagPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(flagPath, 'utf-8');
    return JSON.parse(content) as InitializationMetadata;
  } catch {
    return null;
  }
}

/**
 * Save initialization state to file
 */
export function saveInitializationState(
  config: InitConfig,
  completedTasks: string[],
  dryRun = false,
): void {
  if (dryRun) return;

  // Read version from package.json
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  let version = '0.0.0';
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as {
      version?: string;
    };
    version = packageJson.version ?? '0.0.0';
  } catch {
    // Use default version if package.json not found
  }

  const metadata: InitializationMetadata = {
    initializedAt: new Date().toISOString(),
    config,
    completedTasks,
    version,
  };

  const flagPath = path.join(process.cwd(), INIT_FLAG);
  const JSON_INDENT = 2;
  fs.writeFileSync(flagPath, JSON.stringify(metadata, null, JSON_INDENT));
}
