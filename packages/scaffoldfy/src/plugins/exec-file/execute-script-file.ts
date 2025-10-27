/**
 * Shared exec-file execution logic for both task execution and value resolution
 */

import type { ExecFileRuntime, InitConfig } from '../../types';
import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { debug, interpolateTemplate, log } from '../../utils';
import { cleanupTempFile, resolveAndFetchFile } from '../../utils/resolve-and-fetch-file';
import {
  detectRuntimeFromExtension,
  getFileExtension,
  getRuntimeCommand,
} from './runtime-utils';

/**
 * Options for executing a script file
 */
export interface ExecuteScriptFileOptions {
  /**
   * Path to the file to execute (local or remote URL)
   * Will be interpolated with config variables
   */
  file: string;

  /**
   * Runtime to use for execution
   * If not specified, will be auto-detected from file extension
   */
  runtime?: ExecFileRuntime;

  /**
   * Arguments to pass to the script
   * Each will be interpolated with config variables
   */
  args?: string[];

  /**
   * Environment variables to pass to the script
   * Values will be interpolated with config variables
   */
  parameters?: Record<string, string>;

  /**
   * Working directory for execution
   * Will be interpolated with config variables
   */
  cwd?: string;

  /**
   * Source URL for resolving relative file paths
   */
  sourceUrl?: string;

  /**
   * Whether to capture stdout instead of inheriting stdio
   * Used for value resolution
   */
  captureOutput?: boolean;
}

/**
 * Execute a script file and optionally return its output
 * @param options - Execution options
 * @param config - Configuration context for variable interpolation
 * @returns Output string if captureOutput is true, undefined otherwise
 */
export async function executeScriptFile(
  options: ExecuteScriptFileOptions,
  config: InitConfig,
): Promise<string | undefined> {
  // Interpolate file path
  const interpolatedFile = interpolateTemplate(options.file, config);

  // Interpolate args
  const interpolatedArgs =
    options.args?.map((arg) => interpolateTemplate(arg, config)) ?? [];

  // Interpolate parameters
  const interpolatedParameters: Record<string, string> = {};
  if (options.parameters) {
    for (const [key, value] of Object.entries(options.parameters)) {
      interpolatedParameters[key] = interpolateTemplate(value, config);
    }
  }

  // Interpolate cwd
  const cwd =
    options.cwd != null && options.cwd !== ''
      ? path.join(process.cwd(), interpolateTemplate(options.cwd, config))
      : process.cwd();

  // Resolve and fetch the file (handles both local and remote files)
  const fileInfo = await resolveAndFetchFile({
    file: interpolatedFile,
    ...(options.sourceUrl != null &&
      options.sourceUrl !== '' && { sourceUrl: options.sourceUrl }),
    tempFileExtension: getFileExtension(
      options.runtime ?? detectRuntimeFromExtension(interpolatedFile) ?? 'node',
    ),
    tempFilePrefix: 'scaffoldfy-exec',
  });

  const { localFilePath: resolvedFilePath } = fileInfo;

  // Detect runtime from file extension if not specified
  const runtime =
    options.runtime ?? detectRuntimeFromExtension(resolvedFilePath) ?? 'node';
  if (!options.runtime && !detectRuntimeFromExtension(resolvedFilePath)) {
    log(`Could not detect runtime from file extension, defaulting to 'node'`, 'warn');
  }

  try {
    // Build command
    const command = getRuntimeCommand(runtime, resolvedFilePath);
    const argsString = interpolatedArgs.join(' ');
    const fullCommand = argsString ? `${command} ${argsString}` : command;

    debug(`Executing: ${fullCommand}`);

    // Execute the file
    const result = execSync(fullCommand, {
      cwd,
      stdio: options.captureOutput ? ['pipe', 'pipe', 'pipe'] : 'inherit',
      env: {
        ...process.env,
        ...interpolatedParameters,
      },
      encoding: options.captureOutput ? 'utf-8' : undefined,
    });

    if (options.captureOutput) {
      debug(`Script executed successfully with output`);
      return typeof result === 'string' ? result : undefined;
    }

    debug(`Script executed successfully`);
    return undefined;
  } finally {
    // Clean up temporary file for remote scripts
    cleanupTempFile(fileInfo);
  }
}
