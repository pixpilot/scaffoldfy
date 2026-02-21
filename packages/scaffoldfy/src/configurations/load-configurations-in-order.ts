import type { DynamicBooleanValue, ScaffoldfyConfiguration } from '../types';
import path from 'node:path';
import process from 'node:process';
import { CircularDependencyError } from '../errors/base';
import { isUrl } from '../utils';
import { loadConfiguration } from './load-configuration';
import { topologicalSortConfigs } from './topological-sort';

/**
 * Load all configurations recursively (without merging)
 * @param configPath - Path or URL to the configuration file
 * @param baseDir - Base directory or URL for resolving relative paths
 * @param visitedPaths - Set of already visited paths (for deduplication)
 * @param visitingPaths - Set of paths currently being visited (for circular detection)
 * @param allConfigurations - Array to collect all loaded configurations
 * @param inheritedEnabled
 * An optional enabled condition inherited from the child config that references this
 * config via `extends`. When set, and the config being loaded has no own `enabled`
 * condition, the inherited condition is applied so that ancestor configs in an extends
 * chain are disabled whenever the child that extends them is disabled.
 * @returns Array of all loaded configurations (unmerged)
 */
async function loadAllConfigurationsRecursive(
  configPath: string,
  baseDir: string | undefined,
  visitedPaths: Set<string>,
  visitingPaths: Set<string>,
  allConfigurations: ScaffoldfyConfiguration[],
  inheritedEnabled?: DynamicBooleanValue,
): Promise<void> {
  // Check if configPath is a URL
  const isRemote = isUrl(configPath);

  // Resolve the absolute path or URL
  let resolvedPath: string;
  if (isRemote) {
    resolvedPath = configPath;
  } else if (path.isAbsolute(configPath)) {
    resolvedPath = configPath;
  } else if (baseDir != null) {
    // If baseDir is a URL, resolve relative to URL; otherwise resolve as path
    if (isUrl(baseDir)) {
      resolvedPath = new URL(configPath, baseDir).href;
    } else {
      resolvedPath = path.resolve(baseDir, configPath);
    }
  } else {
    resolvedPath = path.resolve(process.cwd(), configPath);
  }

  // Check if we've already completely loaded this path
  if (visitedPaths.has(resolvedPath)) {
    return;
  }

  // Check for circular dependencies
  if (visitingPaths.has(resolvedPath)) {
    throw CircularDependencyError.forConfigurationInheritance(
      visitingPaths,
      resolvedPath,
    );
  }

  // Add to visiting paths
  visitingPaths.add(resolvedPath);

  // Load the current configuration
  const config = await loadConfiguration(resolvedPath);

  // Get the directory or base URL for resolving relative extends
  const currentBase = isUrl(resolvedPath)
    ? new URL('.', resolvedPath).href
    : path.dirname(resolvedPath);

  // If configuration has extends, load them first (recursively).
  // Propagate the effective enabled condition so that when a child config is
  // disabled (via its own `enabled` field), all ancestor configs it pulls in via
  // `extends` are also disabled — unless the ancestor defines its own `enabled`.
  if (config.extends != null && config.extends !== '') {
    const extendsList = Array.isArray(config.extends) ? config.extends : [config.extends];

    /*
     * The effective condition to pass down is the child's own `enabled` when
     * present, otherwise whatever was inherited from further down the chain.
     */
    const effectiveEnabled = config.enabled ?? inheritedEnabled;

    /* eslint-disable no-await-in-loop */
    for (const extendsPath of extendsList) {
      await loadAllConfigurationsRecursive(
        extendsPath,
        currentBase,
        visitedPaths,
        visitingPaths,
        allConfigurations,
        effectiveEnabled,
      );
    }
    /* eslint-enable no-await-in-loop */
  }

  // Remove from visiting paths and add to visited
  visitingPaths.delete(resolvedPath);
  visitedPaths.add(resolvedPath);

  /*
   * When this config has no own `enabled` condition but an ancestor's condition
   * was passed in, create a copy that carries the inherited condition so that
   * `runConfigurationSequentially` will correctly skip it when the originating
   * child config is disabled.
   */
  const configToAdd =
    config.enabled == null && inheritedEnabled != null
      ? { ...config, enabled: inheritedEnabled }
      : config;

  allConfigurations.push(configToAdd);
}

/**
 * Load all configurations in dependency order without merging
 * @param configPath - Path or URL to the configuration file
 * @param baseDir - Base directory or URL for resolving relative paths in extends
 * @param visitedPaths - Set of already visited paths
 * @returns Array of sorted configurations (in dependency order, ready for sequential processing)
 */
export async function loadConfigurationsInOrder(
  configPath: string,
  baseDir?: string,
  visitedPaths: Set<string> = new Set(),
): Promise<ScaffoldfyConfiguration[]> {
  // Collect all configurations first (without merging)
  const allConfigurations: ScaffoldfyConfiguration[] = [];
  const visitingPaths = new Set<string>();
  await loadAllConfigurationsRecursive(
    configPath,
    baseDir,
    visitedPaths,
    visitingPaths,
    allConfigurations,
  );

  // Sort configurations topologically based on their dependencies
  return topologicalSortConfigs(allConfigurations);
}
