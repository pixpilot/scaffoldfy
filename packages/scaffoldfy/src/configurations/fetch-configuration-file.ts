import fs from 'node:fs';
import { promisify } from 'node:util';
import { ConfigFetchError, ConfigurationFileNotFoundError } from '../errors/index.js';
import { isUrl } from '../utils';

const readFile = promisify(fs.readFile);

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
}
