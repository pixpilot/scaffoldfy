import type { TasksConfiguration } from '../types';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { CircularDependencyError } from '../errors/base';
import {
  ConfigParseError,
  ConfigurationFileNotFoundError,
  InvalidConfigError,
} from '../errors/index';
import { isUrl } from '../utils';

import { configurationCache } from './cache';
import { fetchRemoteConfiguration } from './fetch-configuration-file';

const readFile = promisify(fs.readFile);

/**
 * Load a configuration file from local path or remote URL
 * @param configPath - Path or URL to the configuration file
 * @param visitedPaths - Set of already visited paths to detect circular dependencies
 * @returns The loaded configuration
 */
export async function loadConfiguration(
  configPath: string,
  visitedPaths: Set<string> = new Set(),
): Promise<TasksConfiguration> {
  // Check if it's a URL
  const isRemote = isUrl(configPath);

  // For URLs, use the URL as-is; for paths, resolve to absolute path
  let resolvedPath: string;
  if (isRemote) {
    resolvedPath = configPath;
  } else if (path.isAbsolute(configPath)) {
    resolvedPath = configPath;
  } else {
    resolvedPath = path.resolve(process.cwd(), configPath);
  }

  // Check cache first
  if (configurationCache.has(resolvedPath)) {
    return configurationCache.get(resolvedPath)!;
  }

  // Check for circular dependencies
  if (visitedPaths.has(resolvedPath)) {
    throw CircularDependencyError.forConfigurationInheritance(visitedPaths, resolvedPath);
  }

  // Add to visited paths
  visitedPaths.add(resolvedPath);

  // Load the configuration content
  let content: string;

  if (isRemote) {
    // Fetch from remote URL
    content = await fetchRemoteConfiguration(resolvedPath);
  } else {
    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      throw ConfigurationFileNotFoundError.forPath(resolvedPath);
    }

    // Load from local file
    content = await readFile(resolvedPath, 'utf-8');
  }

  // Parse the configuration file
  let config: TasksConfiguration;

  try {
    config = JSON.parse(content) as TasksConfiguration;
  } catch (error) {
    throw ConfigParseError.forFile(
      resolvedPath,
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  // Validate required name field
  if (config.name == null || config.name.trim() === '') {
    throw InvalidConfigError.missingName(resolvedPath);
  }

  // Validate name format (similar to npm package names)
  // Rules:
  // - Must contain only lowercase letters, digits, and hyphens
  // - Cannot start or end with a hyphen
  // - Cannot contain consecutive hyphens
  // - Must be at least 1 character long
  const namePattern = /^[a-z\d]+(?:-[a-z\d]+)*$/u;
  if (!namePattern.test(config.name)) {
    throw InvalidConfigError.invalidNameFormat(resolvedPath, config.name);
  }

  // Validate basic structure - tasks can be optional but must be an array if present
  if (config.tasks !== undefined && !Array.isArray(config.tasks)) {
    throw InvalidConfigError.tasksNotArray(resolvedPath);
  }

  // Initialize tasks as empty array if not provided (for files that only provide prompts/variables)
  if (config.tasks === undefined) {
    config.tasks = [];
  }

  // Annotate each task with the source URL/path for resolving relative files references
  for (const task of config.tasks) {
    task.$sourceUrl = resolvedPath;
  }

  // Annotate each variable with the source URL/path for resolving relative file references in exec-file
  if (config.variables !== undefined) {
    for (const variable of config.variables) {
      variable.$sourceUrl = resolvedPath;
    }
  }

  // Annotate each prompt with the source URL/path for resolving relative file references in exec-file defaults
  if (config.prompts !== undefined) {
    for (const prompt of config.prompts) {
      prompt.$sourceUrl = resolvedPath;
    }
  }

  // Cache the loaded configuration
  configurationCache.set(resolvedPath, config);

  return config;
}
