import path from 'node:path';
import process from 'node:process';
import { isUrl } from './is-url';

/**
 * Get display name for source URL
 */
export function getSourceDisplayName(sourceUrl?: string): string {
  if (sourceUrl == null || sourceUrl === '') {
    return 'current configuration';
  }
  if (isUrl(sourceUrl)) {
    return sourceUrl;
  }
  // For local files, show relative path if possible
  const cwd = process.cwd();
  if (sourceUrl.startsWith(cwd)) {
    return path.relative(cwd, sourceUrl);
  }
  return sourceUrl;
}
