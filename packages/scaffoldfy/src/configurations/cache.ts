import type { ScaffoldfyConfiguration } from '../types';

/**
 * Cache for loaded configurations to avoid reloading
 */
export const configurationCache = new Map<string, ScaffoldfyConfiguration>();

/**
 * Clear the configuration cache (useful for testing)
 */
export function clearConfigurationCache(): void {
  configurationCache.clear();
}
