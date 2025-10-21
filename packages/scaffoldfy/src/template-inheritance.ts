/**
 * Template Inheritance - Extend base templates
 *
 * This module handles loading and merging template configurations,
 * allowing templates to extend from one or more base templates.
 * Supports both local file paths and remote URLs (http/https).
 */

import type {
  PromptDefinition,
  TaskDefinition,
  TasksConfiguration,
  VariableDefinition,
} from './types.js';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { log } from './utils.js';

const readFile = promisify(fs.readFile);

/**
 * Check if a string is a URL
 * @param str - String to check
 * @returns True if the string is a valid HTTP/HTTPS URL
 */
function isUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Resolve a templateFile path relative to a source URL or path
 * @param templateFilePath - The templateFile path (can be relative or absolute)
 * @param sourceUrl - The URL or path of the template that references this file
 * @returns The resolved absolute path or URL
 */
export function resolveTemplateFilePath(
  templateFilePath: string,
  sourceUrl?: string,
): string {
  // If templateFilePath is already a URL, return as-is
  if (isUrl(templateFilePath)) {
    return templateFilePath;
  }

  // If no sourceUrl is provided, resolve relative to CWD
  if (sourceUrl == null || sourceUrl === '') {
    return path.isAbsolute(templateFilePath)
      ? templateFilePath
      : path.resolve(process.cwd(), templateFilePath);
  }

  // If sourceUrl is a URL, resolve templateFilePath relative to it
  if (isUrl(sourceUrl)) {
    try {
      // Use URL resolution to handle relative paths
      const baseUrl = new URL('.', sourceUrl); // Get directory URL
      const resolvedUrl = new URL(templateFilePath, baseUrl);
      return resolvedUrl.href;
    } catch {
      throw new Error(
        `Failed to resolve templateFile "${templateFilePath}" relative to remote template "${sourceUrl}"`,
      );
    }
  }

  // Otherwise, sourceUrl is a local path, resolve relative to it
  const sourceDir = path.dirname(sourceUrl);
  return path.isAbsolute(templateFilePath)
    ? templateFilePath
    : path.resolve(sourceDir, templateFilePath);
}

/**
 * Fetch content from a remote URL or read from local file
 * @param urlOrPath - URL or file path to fetch/read
 * @returns The content as a string
 */
export async function fetchTemplateFile(urlOrPath: string): Promise<string> {
  if (isUrl(urlOrPath)) {
    return fetchRemoteTemplate(urlOrPath);
  }

  // Local file
  if (!fs.existsSync(urlOrPath)) {
    throw new Error(`Template file not found: ${urlOrPath}`);
  }
  return readFile(urlOrPath, 'utf-8');
}

/**
 * Fetch content from a remote URL
 * @param url - URL to fetch
 * @returns The fetched content as a string
 */
async function fetchRemoteTemplate(url: string): Promise<string> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch template from ${url}: ${response.status} ${response.statusText}`,
      );
    }

    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      throw error;
    }
    throw new Error(
      `Failed to fetch template from ${url}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Cache for loaded templates to avoid reloading
 */
const templateCache = new Map<string, TasksConfiguration>();

/**
 * Load a template configuration file from local path or remote URL
 * @param templatePath - Path or URL to the template file
 * @param visitedPaths - Set of already visited paths to detect circular dependencies
 * @returns The loaded template configuration
 */
export async function loadTemplate(
  templatePath: string,
  visitedPaths: Set<string> = new Set(),
): Promise<TasksConfiguration> {
  // Check if it's a URL
  const isRemote = isUrl(templatePath);

  // For URLs, use the URL as-is; for paths, resolve to absolute path
  let resolvedPath: string;
  if (isRemote) {
    resolvedPath = templatePath;
  } else if (path.isAbsolute(templatePath)) {
    resolvedPath = templatePath;
  } else {
    resolvedPath = path.resolve(process.cwd(), templatePath);
  }

  // Check cache first
  if (templateCache.has(resolvedPath)) {
    return templateCache.get(resolvedPath)!;
  }

  // Check for circular dependencies
  if (visitedPaths.has(resolvedPath)) {
    throw new Error(
      `Circular dependency detected: ${Array.from(visitedPaths).join(' -> ')} -> ${resolvedPath}`,
    );
  }

  // Add to visited paths
  visitedPaths.add(resolvedPath);

  // Load the template content
  let content: string;

  if (isRemote) {
    // Fetch from remote URL
    content = await fetchRemoteTemplate(resolvedPath);
  } else {
    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Template file not found: ${resolvedPath}`);
    }

    // Load from local file
    content = await readFile(resolvedPath, 'utf-8');
  }

  // Parse the template file
  let config: TasksConfiguration;

  try {
    config = JSON.parse(content) as TasksConfiguration;
  } catch (error) {
    throw new Error(
      `Failed to parse template file ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Validate basic structure
  if (!Array.isArray(config.tasks)) {
    throw new TypeError(
      `Invalid template file ${resolvedPath}: 'tasks' array is required`,
    );
  }

  // Annotate each task with the source URL/path for resolving relative templateFile references
  for (const task of config.tasks) {
    task.$sourceUrl = resolvedPath;
  }

  // Cache the loaded template
  templateCache.set(resolvedPath, config);

  return config;
}

/**
 * Recursively load and merge templates
 * @param templatePath - Path or URL to the template file
 * @param baseDir - Base directory or URL for resolving relative paths in extends
 * @param visitedPaths - Set of already visited paths
 * @returns Merged template configuration
 */
export async function loadAndMergeTemplate(
  templatePath: string,
  baseDir?: string,
  visitedPaths: Set<string> = new Set(),
): Promise<TasksConfiguration> {
  // Check if templatePath is a URL
  const isRemote = isUrl(templatePath);

  // Resolve the absolute path or URL
  let resolvedPath: string;
  if (isRemote) {
    resolvedPath = templatePath;
  } else if (path.isAbsolute(templatePath)) {
    resolvedPath = templatePath;
  } else if (baseDir != null) {
    // If baseDir is a URL, resolve relative to URL; otherwise resolve as path
    if (isUrl(baseDir)) {
      resolvedPath = new URL(templatePath, baseDir).href;
    } else {
      resolvedPath = path.resolve(baseDir, templatePath);
    }
  } else {
    resolvedPath = path.resolve(process.cwd(), templatePath);
  }

  // Check for circular dependencies before loading
  if (visitedPaths.has(resolvedPath)) {
    throw new Error(
      `Circular dependency detected: ${Array.from(visitedPaths).join(' -> ')} -> ${resolvedPath}`,
    );
  }

  // Add current path to visited set
  visitedPaths.add(resolvedPath);

  // Load the current template (don't pass visitedPaths to avoid double-checking)
  const config = await loadTemplate(resolvedPath);

  // If no extends, return as is
  if (config.extends == null || config.extends === '') {
    return config;
  }

  // Get the directory or base URL of the current template for resolving relative extends
  const currentBase = isUrl(resolvedPath)
    ? new URL('.', resolvedPath).href // For URLs, get the base URL
    : path.dirname(resolvedPath); // For paths, get the directory

  // Process extends (can be string or array)
  const extendsList = Array.isArray(config.extends) ? config.extends : [config.extends];

  // Load all base templates
  const baseConfigs: TasksConfiguration[] = [];

  /* eslint-disable no-await-in-loop */
  for (const extendsPath of extendsList) {
    const baseConfig = await loadAndMergeTemplate(extendsPath, currentBase, visitedPaths);
    baseConfigs.push(baseConfig);
  }
  /* eslint-enable no-await-in-loop */

  // Merge all base configurations and the current one
  return mergeTemplates([...baseConfigs, config]);
}

/**
 * Merge multiple template configurations
 * Later templates override earlier ones for conflicting task IDs
 * @param templates - Array of templates to merge (in priority order)
 * @returns Merged template configuration
 */
export function mergeTemplates(templates: TasksConfiguration[]): TasksConfiguration {
  if (templates.length === 0) {
    return { tasks: [] };
  }

  if (templates.length === 1) {
    return templates[0]!;
  }

  // Use a Map to handle task overriding by ID
  const taskMap = new Map<string, TaskDefinition>();

  // Use a Map to handle variable overriding by ID
  const variableMap = new Map<string, VariableDefinition>();

  // Use a Map to handle prompt overriding by ID
  const promptMap = new Map<string, PromptDefinition>();

  // Process templates in order (earlier templates have lower priority)
  for (const template of templates) {
    // Merge top-level prompts if present
    if (template.prompts != null) {
      for (const prompt of template.prompts) {
        promptMap.set(prompt.id, { ...prompt });
      }
    }

    // Merge top-level variables if present
    if (template.variables != null) {
      for (const variable of template.variables) {
        variableMap.set(variable.id, { ...variable });
      }
    }

    // Merge tasks
    for (const task of template.tasks) {
      if (taskMap.has(task.id)) {
        // Task already exists, merge/override
        const existingTask = taskMap.get(task.id)!;
        taskMap.set(task.id, mergeTask(existingTask, task));
      } else {
        // New task, add it
        taskMap.set(task.id, { ...task });
      }
    }
  }

  // Convert maps back to arrays
  const result: TasksConfiguration = {
    tasks: Array.from(taskMap.values()),
  };

  // Add prompts if any exist
  if (promptMap.size > 0) {
    result.prompts = Array.from(promptMap.values());
  }

  // Add variables if any exist
  if (variableMap.size > 0) {
    result.variables = Array.from(variableMap.values());
  }

  return result;
}

/**
 * Merge two task definitions (later task overrides earlier)
 * @param base - Base task definition
 * @param override - Override task definition
 * @returns Merged task definition
 */
function mergeTask(base: TaskDefinition, override: TaskDefinition): TaskDefinition {
  // Deep merge config objects
  const mergedConfig =
    typeof base.config === 'object' &&
    base.config !== null &&
    typeof override.config === 'object' &&
    override.config !== null
      ? { ...base.config, ...override.config }
      : override.config;

  // Merge prompts arrays (override prompts with same ID)
  let mergedPrompts = base.prompts ? [...base.prompts] : undefined;
  if (override.prompts && override.prompts.length > 0) {
    if (!mergedPrompts) {
      mergedPrompts = [...override.prompts];
    } else {
      // Replace prompts with matching IDs, add new ones
      const promptMap = new Map(mergedPrompts.map((p) => [p.id, p]));
      for (const prompt of override.prompts) {
        promptMap.set(prompt.id, prompt);
      }
      mergedPrompts = Array.from(promptMap.values());
    }
  }

  // Merge variables arrays (override variables with same ID)
  let mergedVariables = base.variables ? [...base.variables] : undefined;
  if (override.variables && override.variables.length > 0) {
    if (!mergedVariables) {
      mergedVariables = [...override.variables];
    } else {
      // Replace variables with matching IDs, add new ones
      const variableMap = new Map(mergedVariables.map((v) => [v.id, v]));
      for (const variable of override.variables) {
        variableMap.set(variable.id, variable);
      }
      mergedVariables = Array.from(variableMap.values());
    }
  }

  // Merge dependencies arrays
  const mergedDependencies = [
    ...(base.dependencies ?? []),
    ...(override.dependencies ?? []),
  ];
  const uniqueDependencies =
    mergedDependencies.length > 0 ? [...new Set(mergedDependencies)] : undefined;

  // Use override's $sourceUrl if present, otherwise keep base's
  const sourceUrl = override.$sourceUrl ?? base.$sourceUrl;

  return {
    ...base,
    ...override,
    config: mergedConfig,
    ...(mergedPrompts != null && { prompts: mergedPrompts }),
    ...(mergedVariables != null && { variables: mergedVariables }),
    ...(uniqueDependencies != null && { dependencies: uniqueDependencies }),
    ...(sourceUrl != null && { $sourceUrl: sourceUrl }),
  };
}

/**
 * Clear the template cache (useful for testing)
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}

/**
 * Load tasks from a configuration file with template inheritance support
 * @param tasksFilePath - Path to the tasks configuration file
 * @returns Task configuration with tasks, optional variables, and optional prompts
 */
export async function loadTasksWithInheritance(tasksFilePath: string): Promise<{
  tasks: TaskDefinition[];
  variables?: VariableDefinition[];
  prompts?: PromptDefinition[];
}> {
  log(`Loading tasks from ${tasksFilePath}...`, 'info');

  const config = await loadAndMergeTemplate(tasksFilePath);

  log(`Loaded ${config.tasks.length} task(s)`, 'info');

  if (config.extends != null && config.extends !== '') {
    const extendsList = Array.isArray(config.extends) ? config.extends : [config.extends];
    log(`Extended from: ${extendsList.join(', ')}`, 'info');
  }

  if (config.prompts != null && config.prompts.length > 0) {
    log(`Found ${config.prompts.length} top-level prompt(s)`, 'info');
  }

  if (config.variables != null && config.variables.length > 0) {
    log(`Found ${config.variables.length} top-level variable(s)`, 'info');
  }

  const result: {
    tasks: TaskDefinition[];
    variables?: VariableDefinition[];
    prompts?: PromptDefinition[];
  } = {
    tasks: config.tasks,
  };

  if (config.prompts != null) {
    result.prompts = config.prompts;
  }

  if (config.variables != null) {
    result.variables = config.variables;
  }

  return result;
}
