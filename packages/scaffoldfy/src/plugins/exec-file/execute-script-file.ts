/**
 * Shared exec-file execution logic for both task execution and value resolution
 */

import type { ExecFileRuntime, InitConfig } from '../../types.js';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fetchTemplateFile } from '../../template-inheritance.js';
import { debug, interpolateTemplate, log } from '../../utils.js';
import { resolveFilePath } from '../../utils/resolve-file-path.js';
import {
  detectRuntimeFromExtension,
  getFileExtension,
  getRuntimeCommand,
  isUrl,
} from './runtime-utils.js';

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

  // Resolve file path (handle remote and local paths)
  let resolvedFilePath: string;
  let fileContent: string;
  let isRemote = false;

  if (isUrl(interpolatedFile)) {
    // Remote file - fetch it
    debug(`Fetching remote script: ${interpolatedFile}`);
    fileContent = await fetchTemplateFile(interpolatedFile);
    isRemote = true;

    // Detect runtime from file extension if not specified
    const runtime =
      options.runtime ?? detectRuntimeFromExtension(interpolatedFile) ?? 'node';
    if (!options.runtime && !detectRuntimeFromExtension(interpolatedFile)) {
      log(`Could not detect runtime from file extension, defaulting to 'node'`, 'warn');
    }

    // Create temporary file
    const tempDir = os.tmpdir();
    const tempFileName = `scaffoldfy-exec-${Date.now()}${getFileExtension(runtime)}`;
    resolvedFilePath = path.join(tempDir, tempFileName);

    fs.writeFileSync(resolvedFilePath, fileContent, 'utf-8');
  } else {
    // Local file - resolve path relative to source or cwd
    resolvedFilePath = resolveFilePath(interpolatedFile, options.sourceUrl);

    if (!fs.existsSync(resolvedFilePath)) {
      throw new Error(`Script file not found: ${resolvedFilePath}`);
    }

    debug(`Using local script: ${resolvedFilePath}`);
  }

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
    if (isRemote && fs.existsSync(resolvedFilePath)) {
      try {
        fs.unlinkSync(resolvedFilePath);
      } catch (error) {
        log(
          `Warning: Failed to clean up temporary file: ${
            error instanceof Error ? error.message : String(error)
          }`,
          'warn',
        );
      }
    }
  }
}
