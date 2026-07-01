import fs from 'node:fs';
import { promisify } from 'node:util';
import { ConfigFetchError, ConfigurationFileNotFoundError } from '../errors/index';
import { isUrl } from '../utils';

const readFile = promisify(fs.readFile);

/**
 * Cache of in-flight/completed remote fetches, keyed by URL.
 * Ensures a URL is only requested once per process even when it is read
 * multiple times (e.g. schema validation followed by configuration loading).
 */
const remoteConfigurationCache = new Map<string, Promise<string>>();

/**
 * Clear the remote configuration fetch cache (useful for testing)
 */
export function clearRemoteConfigurationCache(): void {
  remoteConfigurationCache.clear();
}

/**
 * Fetch content from a remote URL or read from local file
 * @param urlOrPath - URL or file path to fetch/read
 * @returns The content as a string
 */
export async function fetchConfigurationFile(urlOrPath: string): Promise<string> {
  if (isUrl(urlOrPath)) {
    return fetchRemoteConfiguration(urlOrPath);
  }

  // Local file
  if (!fs.existsSync(urlOrPath)) {
    throw ConfigurationFileNotFoundError.forPath(urlOrPath);
  }
  return readFile(urlOrPath, 'utf-8');
}

/**
 * Fetch content from a remote URL
 * @param url - URL to fetch
 * @returns The fetched content as a string
 */
export async function fetchRemoteConfiguration(url: string): Promise<string> {
  const cached = remoteConfigurationCache.get(url);
  if (cached != null) {
    return cached;
  }

  const fetchPromise = (async (): Promise<string> => {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw ConfigFetchError.forUrl(url, response.status, response.statusText);
      }

      return await response.text();
    } catch (error) {
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        throw error;
      }
      throw ConfigFetchError.forUrl(url, error instanceof Error ? error : undefined);
    }
  })();

  remoteConfigurationCache.set(url, fetchPromise);

  try {
    return await fetchPromise;
  } catch (error) {
    // Don't cache failures, so a subsequent call can retry
    remoteConfigurationCache.delete(url);
    throw error;
  }
}
