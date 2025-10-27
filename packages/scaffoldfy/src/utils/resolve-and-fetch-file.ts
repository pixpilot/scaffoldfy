/**
 * Utility for resolving and fetching files (local or remote)
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fetchConfigurationFile } from '../configurations/index.js';
import { isUrl } from './is-url.js';
import { debug } from './logger.js';
import { resolveFilePath } from './resolve-file-path.js';

/**
 * Result of resolving and fetching a file
 */
export interface ResolvedFileInfo {
  /**
   * The local file path (either original local path or temp file for remote files)
   */
  localFilePath: string;

  /**
   * Whether the file is remote (fetched from URL)
   */
  isRemote: boolean;

  /**
   * The original file path or URL (before resolution)
   */
  originalPath: string;

  /**
   * The resolved path or URL (after resolution)
   */
  resolvedPath: string;
}

/**
 * Options for resolving and fetching a file
 */
export interface ResolveAndFetchFileOptions {
  /**
   * The file path or URL to resolve
   */
  file: string;

  /**
   * Optional source URL for resolving relative paths
   */
  sourceUrl?: string;

  /**
   * Optional file extension to use for temporary files
   * @default '.tmp'
   */
  tempFileExtension?: string;

  /**
   * Optional prefix for temporary file names
   * @default 'scaffoldfy'
   */
  tempFilePrefix?: string;
}

/**
 * Resolves a file path (handling both local and remote files) and fetches
 * remote files to a temporary location.
 *
 * This utility handles the following scenarios:
 * 1. Direct URL → Fetch and create temp file
 * 2. Local absolute path → Return as-is (verify exists)
 * 3. Local relative path → Resolve relative to sourceUrl or CWD
 *    - If sourceUrl is a URL and result is a URL → Fetch and create temp file
 *    - If result is a local path → Return as-is (verify exists)
 *
 * @param options - Options for resolving and fetching
 * @returns Information about the resolved file
 * @throws Error if the file cannot be found or fetched
 */
export async function resolveAndFetchFile(
  options: ResolveAndFetchFileOptions,
): Promise<ResolvedFileInfo> {
  const {
    file,
    sourceUrl,
    tempFileExtension = '.tmp',
    tempFilePrefix = 'scaffoldfy',
  } = options;

  const originalPath = file;
  let resolvedPath: string;
  let localFilePath: string;
  let isRemote = false;

  // Case 1: File is already a URL
  if (isUrl(file)) {
    resolvedPath = file;
    debug(`Fetching remote file: ${resolvedPath}`);
    const fileContent = await fetchConfigurationFile(resolvedPath);
    isRemote = true;

    // Create temporary file
    const tempDir = os.tmpdir();
    const tempFileName = `${tempFilePrefix}-${Date.now()}${tempFileExtension}`;
    localFilePath = path.join(tempDir, tempFileName);

    fs.writeFileSync(localFilePath, fileContent, 'utf-8');
    debug(`Remote file saved to temporary location: ${localFilePath}`);
  } else {
    // Case 2 & 3: Local file (absolute or relative)
    // Resolve the path (handles both local paths and URLs as sourceUrl)
    resolvedPath = resolveFilePath(file, sourceUrl);

    // Check if the resolved path is actually a URL
    // (this happens when resolving a relative path against a URL sourceUrl)
    if (isUrl(resolvedPath)) {
      // Case 3a: Resolved to a URL - fetch it
      debug(`Fetching remote file: ${resolvedPath}`);
      const fileContent = await fetchConfigurationFile(resolvedPath);
      isRemote = true;

      // Create temporary file
      const tempDir = os.tmpdir();
      const tempFileName = `${tempFilePrefix}-${Date.now()}${tempFileExtension}`;
      localFilePath = path.join(tempDir, tempFileName);

      fs.writeFileSync(localFilePath, fileContent, 'utf-8');
      debug(`Remote file saved to temporary location: ${localFilePath}`);
    } else {
      // Case 2 & 3b: It's a local file path
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`File not found: ${resolvedPath}`);
      }

      localFilePath = resolvedPath;
      debug(`Using local file: ${localFilePath}`);
    }
  }

  return {
    localFilePath,
    isRemote,
    originalPath,
    resolvedPath,
  };
}

/**
 * Cleans up a temporary file created by resolveAndFetchFile
 * @param fileInfo - The file info returned by resolveAndFetchFile
 */
export function cleanupTempFile(fileInfo: ResolvedFileInfo): void {
  if (fileInfo.isRemote && fs.existsSync(fileInfo.localFilePath)) {
    try {
      fs.unlinkSync(fileInfo.localFilePath);
      debug(`Temporary file cleaned up: ${fileInfo.localFilePath}`);
    } catch (error) {
      debug(
        `Warning: Failed to clean up temporary file: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
