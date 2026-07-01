import type { ScaffoldfyConfiguration } from '../types';
import { clearRemoteConfigurationCache } from './fetch-configuration-file';

/**
 * Cache for loaded configurations to avoid reloading
 */
export const configurationCache = new Map<string, ScaffoldfyConfiguration>();

/**
 * Clear the configuration cache (useful for testing)
 */
export function clearConfigurationCache(): void {
  configurationCache.clear();
  clearRemoteConfigurationCache();
}
