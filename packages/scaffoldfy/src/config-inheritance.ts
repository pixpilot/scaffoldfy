/**
 * Configuration Inheritance - Extend base configurations
 *
 * This module handles loading and merging configuration files,
 * allowing configurations to extend from one or more base configurations.
 * Supports both local file paths and remote URLs (http/https).
 *
 * Note: "Configuration files" (.json/.ts) define tasks, prompts, and variables.
 * The actual "template files" (.hbs) are Handlebars templates referenced via
 * the templateFile property in task configurations.
 */

import type {
  DynamicBooleanValue,
  EnabledValue,
  MergeStrategy,
  PromptDefinition,
  TaskDefinition,
  TasksConfiguration,
  VariableDefinition,
} from './types.js';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { CircularDependencyError } from './errors/base.js';
import {
  ConfigFetchError,
  ConfigParseError,
  ConfigurationFileNotFoundError,
  DuplicateIdError,
  IdConflictError,
  InvalidConfigError,
} from './errors/index.js';
import { topologicalSortConfigs } from './topological-sort.js';
import { debug, log } from './utils';
import { isUrl } from './utils/is-url.js';

const readFile = promisify(fs.readFile);

/**
 * Conflicting field groups for different task types
 * These fields cannot coexist in the same config
 */
const CONFLICTING_FIELDS: Record<string, string[][]> = {
  template: [['template', 'templateFile']], // template tasks can have either inline template OR templateFile
};

/**
 * Get display name for source URL
 */
function getSourceDisplayName(sourceUrl?: string): string {
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
async function fetchRemoteConfiguration(url: string): Promise<string> {
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

/**
 * Cache for loaded configurations to avoid reloading
 */
const configurationCache = new Map<string, TasksConfiguration>();

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

/**
 * Load all configurations recursively (without merging)
 * @param configPath - Path or URL to the configuration file
 * @param baseDir - Base directory or URL for resolving relative paths
 * @param visitedPaths - Set of already visited paths (for deduplication)
 * @param visitingPaths - Set of paths currently being visited (for circular detection)
 * @param allConfigurations - Array to collect all loaded configurations
 * @returns Array of all loaded configurations (unmerged)
 */
async function loadAllConfigurationsRecursive(
  configPath: string,
  baseDir: string | undefined,
  visitedPaths: Set<string>,
  visitingPaths: Set<string>,
  allConfigurations: TasksConfiguration[],
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

  // If configuration has extends, load them first (recursively)
  if (config.extends != null && config.extends !== '') {
    const extendsList = Array.isArray(config.extends) ? config.extends : [config.extends];

    /* eslint-disable no-await-in-loop */
    for (const extendsPath of extendsList) {
      await loadAllConfigurationsRecursive(
        extendsPath,
        currentBase,
        visitedPaths,
        visitingPaths,
        allConfigurations,
      );
    }
    /* eslint-enable no-await-in-loop */
  }

  // Remove from visiting paths and add to visited
  visitingPaths.delete(resolvedPath);
  visitedPaths.add(resolvedPath);

  // Add current configuration to the collection
  allConfigurations.push(config);
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
): Promise<TasksConfiguration[]> {
  // Collect all configurations first (without merging)
  const allConfigurations: TasksConfiguration[] = [];
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

/**
 * Recursively load and merge configurations
 * @param configPath - Path or URL to the configuration file
 * @param baseDir - Base directory or URL for resolving relative paths in extends
 * @param visitedPaths - Set of already visited paths
 * @returns Merged configuration
 */
export async function loadAndMergeConfiguration(
  configPath: string,
  baseDir?: string,
  visitedPaths: Set<string> = new Set(),
): Promise<TasksConfiguration> {
  // Use the new loadConfigurationsInOrder function
  const sortedConfigurations = await loadConfigurationsInOrder(
    configPath,
    baseDir,
    visitedPaths,
  );

  // Merge sorted configurations
  return mergeConfigurations(sortedConfigurations);
}

/**
 * Validate that there are no duplicate IDs across tasks, variables, and prompts
 * @param tasks - Array of tasks
 * @param variables - Array of variables
 * @param prompts - Array of prompts
 * @throws Error if duplicate IDs are found
 */
function validateUniqueIds(
  tasks: TaskDefinition[],
  variables?: VariableDefinition[],
  prompts?: PromptDefinition[],
): void {
  const allIds = new Map<string, string>();

  // Check task IDs
  for (const task of tasks) {
    if (allIds.has(task.id)) {
      throw DuplicateIdError.forId(task.id, 'task', allIds.get(task.id));
    }
    allIds.set(task.id, 'task');
  }

  // Check variable IDs
  if (variables != null) {
    for (const variable of variables) {
      if (allIds.has(variable.id)) {
        throw DuplicateIdError.forId(variable.id, 'variable', allIds.get(variable.id));
      }
      allIds.set(variable.id, 'variable');
    }
  }

  // Check prompt IDs
  if (prompts != null) {
    for (const prompt of prompts) {
      if (allIds.has(prompt.id)) {
        throw DuplicateIdError.forId(prompt.id, 'prompt', allIds.get(prompt.id));
      }
      allIds.set(prompt.id, 'prompt');
    }
  }
}

/**
 * Merge two variable definitions (later variable overrides earlier)
 * @param base - Base variable definition
 * @param override - Override variable definition
 * @returns Merged variable definition
 */
function mergeVariable(
  base: VariableDefinition,
  override: VariableDefinition,
): VariableDefinition {
  // Determine merge strategy
  const strategy: MergeStrategy = override.override ?? 'merge';

  // If strategy is 'replace', completely replace the base variable
  if (strategy === 'replace') {
    log(`  → Variable "${override.id}" using 'replace' strategy`, 'info');
    // Remove the override field from the final variable
    const { override: _override, ...variableWithoutOverrideFlag } = override;
    return variableWithoutOverrideFlag as VariableDefinition;
  }

  // Strategy is 'merge' - for variables, this essentially means replace since variables are simple
  // But we log it for clarity
  log(`  → Variable "${override.id}" merged (value replaced)`, 'info');

  // Use override's $sourceUrl if present, otherwise keep base's
  const sourceUrl = override.$sourceUrl ?? base.$sourceUrl;

  const result = {
    ...base,
    ...override,
    ...(sourceUrl != null && { $sourceUrl: sourceUrl }),
  } as Record<string, unknown>;

  // Remove override field from final variable
  delete result['override'];

  return result as unknown as VariableDefinition;
}

/**
 * Merge two prompt definitions (later prompt overrides earlier)
 * @param base - Base prompt definition
 * @param override - Override prompt definition
 * @returns Merged prompt definition
 */
function mergePrompt(
  base: PromptDefinition,
  override: PromptDefinition,
): PromptDefinition {
  // Determine merge strategy
  const strategy: MergeStrategy = override.override ?? 'merge';

  // If strategy is 'replace', completely replace the base prompt
  if (strategy === 'replace') {
    log(`  → Prompt "${override.id}" using 'replace' strategy`, 'info');
    // Remove the override field from the final prompt
    const { override: _override, ...promptWithoutOverrideFlag } = override;
    return promptWithoutOverrideFlag as PromptDefinition;
  }

  // Strategy is 'merge' - intelligently merge prompt properties
  log(`  → Prompt "${override.id}" merged`, 'info');

  // Use override's $sourceUrl if present, otherwise keep base's
  const sourceUrl = override.$sourceUrl ?? base.$sourceUrl;

  const result = {
    ...base,
    ...override,
    ...(sourceUrl != null && { $sourceUrl: sourceUrl }),
  } as Record<string, unknown>;

  // Remove override field from final prompt
  delete result['override'];

  return result as unknown as PromptDefinition;
}

/**
 * Merge multiple configurations
 * Later configurations override earlier ones for conflicting task IDs
 * @param configurations - Array of configurations to merge (in priority order)
 * @returns Merged configuration
 */
export function mergeConfigurations(
  configurations: TasksConfiguration[],
): TasksConfiguration {
  if (configurations.length === 0) {
    // This should not happen in practice but return a minimal valid config
    return { name: 'Empty Configuration', tasks: [] };
  }

  if (configurations.length === 1) {
    const configuration = configurations[0]!;
    // Validate even for single configurations
    validateUniqueIds(
      configuration.tasks ?? [],
      configuration.variables,
      configuration.prompts,
    );
    return configuration;
  }

  // Use a Map to handle task overriding by ID
  const taskMap = new Map<string, TaskDefinition>();

  // Use a Map to handle variable overriding by ID
  const variableMap = new Map<string, VariableDefinition>();

  // Use a Map to handle prompt overriding by ID
  const promptMap = new Map<string, PromptDefinition>();

  // Track configuration enabled conditions for lazy evaluation
  const configurationEnabledMap: Record<string, DynamicBooleanValue | EnabledValue> = {};

  // Process configurations in order (earlier configurations have lower priority)
  for (const configuration of configurations) {
    // Store the configuration's enabled condition (if any)
    if (configuration.enabled != null) {
      configurationEnabledMap[configuration.name] = configuration.enabled;
    }

    // Skip configurations that are explicitly disabled (enabled: false)
    // Note: undefined or true means enabled
    // Only skip if it's the literal boolean false (not conditional expressions)
    if (configuration.enabled === false) {
      log(
        `⊘ Skipping disabled configuration "${configuration.name}" - its tasks, prompts, and variables will not be included`,
        'info',
      );
      // eslint-disable-next-line no-continue
      continue;
    }

    // Merge top-level prompts if present
    if (configuration.prompts != null) {
      for (const prompt of configuration.prompts) {
        if (promptMap.has(prompt.id)) {
          // Prompt already exists - require explicit override strategy
          if (prompt.override == null) {
            throw IdConflictError.forPrompt(prompt.id);
          }
          const existingPrompt = promptMap.get(prompt.id)!;
          const mergedPrompt = mergePrompt(existingPrompt, prompt);
          // Add configuration enabled condition for lazy evaluation
          if (configuration.enabled != null) {
            mergedPrompt.$configEnabled = configuration.enabled;
          }
          promptMap.set(prompt.id, mergedPrompt);
        } else {
          // New prompt, add it with configuration enabled condition
          const newPrompt = { ...prompt };
          if (configuration.enabled != null) {
            newPrompt.$configEnabled = configuration.enabled;
          }
          promptMap.set(prompt.id, newPrompt);
        }
      }
    }

    // Merge top-level variables if present
    if (configuration.variables != null) {
      for (const variable of configuration.variables) {
        if (variableMap.has(variable.id)) {
          // Variable already exists - require explicit override strategy
          if (variable.override == null) {
            throw IdConflictError.forVariable(variable.id);
          }
          const existingVariable = variableMap.get(variable.id)!;
          const mergedVariable = mergeVariable(existingVariable, variable);
          // Add configuration enabled condition for lazy evaluation
          if (configuration.enabled != null) {
            mergedVariable.$configEnabled = configuration.enabled;
          }
          variableMap.set(variable.id, mergedVariable);
        } else {
          // New variable, add it with configuration enabled condition
          const newVariable = { ...variable };
          if (configuration.enabled != null) {
            newVariable.$configEnabled = configuration.enabled;
          }
          variableMap.set(variable.id, newVariable);
        }
      }
    }

    // Merge tasks
    for (const task of configuration.tasks ?? []) {
      if (taskMap.has(task.id)) {
        // Task already exists - require explicit override strategy
        if (task.override == null) {
          const existing = taskMap.get(task.id)!;
          throw IdConflictError.forTask(
            task.id,
            getSourceDisplayName(existing.$sourceUrl),
            getSourceDisplayName(task.$sourceUrl),
          );
        }
        const existingTask = taskMap.get(task.id)!;
        const mergedTask = mergeTask(existingTask, task);
        // Add configuration enabled condition for lazy evaluation
        if (configuration.enabled != null) {
          mergedTask.$configEnabled = configuration.enabled;
        }
        taskMap.set(task.id, mergedTask);
      } else {
        // New task, add it with configuration enabled condition
        const newTask = { ...task };
        if (configuration.enabled != null) {
          newTask.$configEnabled = configuration.enabled;
        }
        taskMap.set(task.id, newTask);
      }
    }
  }

  // Convert maps back to arrays
  const tasks = Array.from(taskMap.values());
  const prompts = promptMap.size > 0 ? Array.from(promptMap.values()) : undefined;
  const variables = variableMap.size > 0 ? Array.from(variableMap.values()) : undefined;

  // Validate that all IDs are unique across tasks, variables, and prompts
  validateUniqueIds(tasks, variables, prompts);

  // Use the last configuration's name, description, and dependencies (highest priority)
  const lastConfiguration = configurations[configurations.length - 1]!;

  const result: TasksConfiguration = {
    name: lastConfiguration.name,
    tasks,
  };

  // Add optional fields from last configuration if they exist
  if (lastConfiguration.description != null) {
    result.description = lastConfiguration.description;
  }

  if (lastConfiguration.dependencies != null) {
    result.dependencies = lastConfiguration.dependencies;
  }

  if (lastConfiguration.enabled != null) {
    result.enabled = lastConfiguration.enabled;
  }

  // Add prompts if any exist
  if (prompts != null) {
    result.prompts = prompts;
  }

  // Add variables if any exist
  if (variables != null) {
    result.variables = variables;
  }

  return result;
}

/**
 * Detect conflicting fields in config based on task type
 */
function detectConfigConflicts(
  taskType: string,
  config: Record<string, unknown>,
): string[] | null {
  const conflictGroups = CONFLICTING_FIELDS[taskType];
  if (!conflictGroups) {
    return null;
  }

  for (const group of conflictGroups) {
    const presentFields = group.filter(
      (field) => field in config && config[field] != null,
    );
    if (presentFields.length > 1) {
      return presentFields;
    }
  }

  return null;
}

/**
 * Intelligently merge config objects, handling conflicts
 */
function mergeConfigs(
  baseConfig: Record<string, unknown>,
  overrideConfig: Record<string, unknown>,
  taskType: string,
): Record<string, unknown> {
  // Start with base config
  const merged = { ...baseConfig };

  // Get conflict groups for this task type
  const conflictGroups = CONFLICTING_FIELDS[taskType] ?? [];

  // For each field in override, decide how to merge
  for (const [key, value] of Object.entries(overrideConfig)) {
    // Check if this field is part of a conflict group
    for (const group of conflictGroups) {
      if (group.includes(key)) {
        // This field is part of a conflict group
        // Remove ALL other fields in this group from merged config
        for (const conflictField of group) {
          if (conflictField !== key) {
            delete merged[conflictField];
          }
        }
        break;
      }
    }

    // Set the override value
    merged[key] = value;
  }

  return merged;
}

/**
 * Merge two task definitions (later task overrides earlier)
 * @param base - Base task definition
 * @param override - Override task definition
 * @returns Merged task definition
 */
function mergeTask(base: TaskDefinition, override: TaskDefinition): TaskDefinition {
  // Determine merge strategy
  const strategy: MergeStrategy = override.override ?? 'merge';

  // If strategy is 'replace', completely replace the base task
  if (strategy === 'replace') {
    log(
      `  → Task "${override.id}" using 'replace' strategy - completely replacing base task`,
      'info',
    );
    log(`    Base: ${getSourceDisplayName(base.$sourceUrl)}`, 'info');
    log(`    Override: ${getSourceDisplayName(override.$sourceUrl)}`, 'info');

    // Remove the override field from the final task
    const { override: _override, ...taskWithoutOverrideFlag } = override;
    return taskWithoutOverrideFlag as TaskDefinition;
  }

  // Strategy is 'merge' - intelligent merging
  log(`  → Merging task "${override.id}"`, 'info');
  log(`    Base: ${getSourceDisplayName(base.$sourceUrl)}`, 'info');
  log(`    Override: ${getSourceDisplayName(override.$sourceUrl)}`, 'info');

  // Intelligently merge config objects
  let mergedConfig: Record<string, unknown>;
  if (
    typeof base.config === 'object' &&
    base.config !== null &&
    typeof override.config === 'object' &&
    override.config !== null
  ) {
    mergedConfig = mergeConfigs(
      base.config as Record<string, unknown>,
      override.config as Record<string, unknown>,
      override.type,
    );

    // Check for conflicts in the merged config
    const conflicts = detectConfigConflicts(override.type, mergedConfig);
    if (conflicts !== null && conflicts.length > 0) {
      log(
        `    ⚠️  Warning: Conflicting config fields detected: ${conflicts.join(', ')}`,
        'warn',
      );
      log(
        `    Please use override: "replace" or specify only one of these fields`,
        'warn',
      );
    }
  } else {
    mergedConfig = (override.config ?? base.config) as Record<string, unknown>;
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

  const result = {
    ...base,
    ...override,
    config: mergedConfig,
    ...(uniqueDependencies != null && { dependencies: uniqueDependencies }),
    ...(sourceUrl != null && { $sourceUrl: sourceUrl }),
  } as Record<string, unknown>;

  // Remove override field from final task
  delete result['override'];

  return result as unknown as TaskDefinition;
}

/**
 * Clear the configuration cache (useful for testing)
 */
export function clearConfigurationCache(): void {
  configurationCache.clear();
}

/**
 * Load tasks from a configuration file with configuration inheritance support
 * @param tasksFilePath - Path to the tasks configuration file
 * @param options - Optional configuration
 * @param options.sequential - If true, return configurations as separate items for sequential processing
 * @returns Task configuration with tasks, optional variables, and optional prompts
 */
export async function loadTasksWithInheritance(
  tasksFilePath: string,
  options?: { sequential?: boolean },
): Promise<{
  tasks: TaskDefinition[];
  variables?: VariableDefinition[];
  prompts?: PromptDefinition[];
  enabled?: EnabledValue;
  templates?: TasksConfiguration[];
  transformers?: import('./transformers/types.js').Transformer[];
}> {
  debug(`Loading tasks from ${tasksFilePath}...`);

  // If sequential mode, load configurations without merging
  if (options?.sequential === true) {
    const configurations = await loadConfigurationsInOrder(tasksFilePath);

    debug(`Loaded ${configurations.length} configuration(s) for processing`);

    return {
      tasks: [],
      templates: configurations,
    };
  }

  // Otherwise, use the traditional merged approach
  const config = await loadAndMergeConfiguration(tasksFilePath);

  log(`Loaded ${config.tasks?.length ?? 0} task(s)`, 'info');

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
    enabled?: EnabledValue;
    transformers?: import('./transformers/types.js').Transformer[];
  } = {
    tasks: config.tasks ?? [],
  };

  if (config.prompts != null) {
    result.prompts = config.prompts;
  }

  if (config.variables != null) {
    result.variables = config.variables;
  }

  if (config.enabled != null) {
    result.enabled = config.enabled;
  }

  if (config.transformers != null) {
    result.transformers = config.transformers;
  }

  return result;
}
