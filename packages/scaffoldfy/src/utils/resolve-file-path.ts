import path from 'node:path';

import process from 'node:process';
import { isUrl } from './is-url';

/**
 * Resolve a file path relative to a source URL or path
 * @param file - The templateFile path (can be relative or absolute)
 * @param sourceUrl - The URL or path of the template that references this file
 * @returns The resolved absolute path or URL
 */
export function resolveFilePath(file: string, sourceUrl?: string): string {
  // If templateFilePath is already a URL, return as-is
  if (isUrl(file)) {
    return file;
  }

  // If no sourceUrl is provided, resolve relative to CWD
  if (sourceUrl == null || sourceUrl === '') {
    return path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
  }

  // If sourceUrl is a URL, resolve templateFilePath relative to it
  if (isUrl(sourceUrl)) {
    try {
      // Use URL resolution to handle relative paths
      const baseUrl = new URL('.', sourceUrl); // Get directory URL
      const resolvedUrl = new URL(file, baseUrl);
      return resolvedUrl.href;
    } catch {
      throw new Error(
        `Failed to resolve file path '${file}' relative to source URL '${sourceUrl}'`,
      );
    }
  }

  // Otherwise, sourceUrl is a local path, resolve relative to it
  const sourceDir = path.dirname(sourceUrl);
  return path.isAbsolute(file) ? file : path.resolve(sourceDir, file);
}
