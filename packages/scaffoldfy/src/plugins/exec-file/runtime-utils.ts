/**
 * Shared utilities for exec-file plugin - runtime detection and execution
 */

import type { ExecFileRuntime } from '../../types.js';
import path from 'node:path';

/**
 * Detect runtime from file extension
 * @param filePath - Path to the file
 * @returns Detected runtime or undefined if cannot detect
 */
export function detectRuntimeFromExtension(
  filePath: string,
): ExecFileRuntime | undefined {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.js':
    case '.cjs':
    case '.mjs':
      return 'node';
    case '.sh':
      return 'bash';
    case '.bash':
      return 'bash';
    case '.ps1':
      return 'pwsh';
    default:
      return undefined;
  }
}

/**
 * Get the command to execute a file with the specified runtime
 */
export function getRuntimeCommand(runtime: ExecFileRuntime, filePath: string): string {
  switch (runtime) {
    case 'node':
      return `node "${filePath}"`;
    case 'bash':
      return `bash "${filePath}"`;
    case 'sh':
      return `sh "${filePath}"`;
    case 'pwsh':
      return `pwsh -File "${filePath}"`;
    case 'powershell':
      return `powershell -File "${filePath}"`;
    default:
      return `node "${filePath}"`; // Default to node
  }
}

/**
 * Get file extension for runtime
 */
export function getFileExtension(runtime: ExecFileRuntime): string {
  switch (runtime) {
    case 'node':
      return '.js';
    case 'bash':
    case 'sh':
      return '.sh';
    case 'pwsh':
    case 'powershell':
      return '.ps1';
    default:
      return '.js'; // Default to .js
  }
}

/**
 * Check if a string is a URL
 */
export function isUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
