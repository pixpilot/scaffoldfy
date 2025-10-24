/**
 * Template Inheritance - Extend base templates
 *
 * This module handles loading and merging template configurations,
 * allowing templates to extend from one or more base templates.
 * Supports both local file paths and remote URLs (http/https).
 */

import type {
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
  DuplicateIdError,
  IdConflictError,
  InvalidTemplateError,
  TemplateFetchError,
  TemplateFileNotFoundError,
  TemplateParseError,
  TemplateResolutionError,
} from './errors/index.js';
import { debug, log } from './utils.js';

const readFile = promisify(fs.readFile);

/**
 * Topologically sort templates based on their dependencies
 * Templates that are depended upon come first
 * @param templates - Array of templates to sort
 * @returns Sorted array of templates
 */
function topologicalSortTemplates(templates: TasksConfiguration[]): TasksConfiguration[] {
  // If all templates have unique names, use name-based sorting
  // If there are duplicate names, just return templates in order (can't sort by name)
  const nameToTemplates = new Map<string, TasksConfiguration[]>();
  for (const template of templates) {
    const existing = nameToTemplates.get(template.name) || [];
    existing.push(template);
    nameToTemplates.set(template.name, existing);
  }

  // Check if all templates have unique names
  const hasDuplicateNames = Array.from(nameToTemplates.values()).some(
    (arr) => arr.length > 1,
  );

  if (hasDuplicateNames) {
    // Cannot do topological sort with duplicate names
    // Just return templates in the order they were loaded
    return templates;
  }

  // All names are unique, proceed with topological sort
  const sorted: TasksConfiguration[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  // Create a map of template name to template for quick lookup
  const templateMap = new Map<string, TasksConfiguration>();
  for (const template of templates) {
    templateMap.set(template.name, template);
  }

  function visit(templateName: string): void {
    if (visited.has(templateName)) {
      return;
    }

    if (visiting.has(templateName)) {
      // Circular dependency detected
      throw CircularDependencyError.forTemplateDependencies(
        Array.from(visiting),
        templateName,
      );
    }

    visiting.add(templateName);

    const template = templateMap.get(templateName);
    if (template != null) {
      // Visit all dependencies first
      if (template.dependencies != null && template.dependencies.length > 0) {
        for (const depName of template.dependencies) {
          visit(depName);
        }
      }
    }

    visiting.delete(templateName);
    visited.add(templateName);

    if (template != null) {
      sorted.push(template);
    }
  }

  // Visit all templates
  for (const template of templates) {
    visit(template.name);
  }

  return sorted;
}

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
    return 'current template';
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
      throw TemplateResolutionError.forRemoteTemplate(templateFilePath, sourceUrl);
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
    throw TemplateFileNotFoundError.forPath(urlOrPath);
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
      throw TemplateFetchError.forUrl(url, response.status, response.statusText);
    }

    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      throw error;
    }
    throw TemplateFetchError.forUrl(url, error instanceof Error ? error : undefined);
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
    throw CircularDependencyError.forTemplateInheritance(visitedPaths, resolvedPath);
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
      throw TemplateFileNotFoundError.forPath(resolvedPath);
    }

    // Load from local file
    content = await readFile(resolvedPath, 'utf-8');
  }

  // Parse the template file
  let config: TasksConfiguration;

  try {
    config = JSON.parse(content) as TasksConfiguration;
  } catch (error) {
    throw TemplateParseError.forFile(
      resolvedPath,
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  // Validate required name field
  if (config.name == null || config.name.trim() === '') {
    throw InvalidTemplateError.missingName(resolvedPath);
  }

  // Validate name format (similar to npm package names)
  // Rules:
  // - Must contain only lowercase letters, digits, and hyphens
  // - Cannot start or end with a hyphen
  // - Cannot contain consecutive hyphens
  // - Must be at least 1 character long
  const namePattern = /^[a-z\d]+(?:-[a-z\d]+)*$/u;
  if (!namePattern.test(config.name)) {
    throw InvalidTemplateError.invalidNameFormat(resolvedPath, config.name);
  }

  // Validate basic structure - tasks can be optional but must be an array if present
  if (config.tasks !== undefined && !Array.isArray(config.tasks)) {
    throw InvalidTemplateError.tasksNotArray(resolvedPath);
  }

  // Initialize tasks as empty array if not provided (for templates that only provide prompts/variables)
  if (config.tasks === undefined) {
    config.tasks = [];
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
 * Load all templates recursively (without merging)
 * @param templatePath - Path or URL to the template file
 * @param baseDir - Base directory or URL for resolving relative paths
 * @param visitedPaths - Set of already visited paths (for deduplication)
 * @param visitingPaths - Set of paths currently being visited (for circular detection)
 * @param allTemplates - Array to collect all loaded templates
 * @returns Array of all loaded templates (unmerged)
 */
async function loadAllTemplatesRecursive(
  templatePath: string,
  baseDir: string | undefined,
  visitedPaths: Set<string>,
  visitingPaths: Set<string>,
  allTemplates: TasksConfiguration[],
): Promise<void> {
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

  // Check if we've already completely loaded this path
  if (visitedPaths.has(resolvedPath)) {
    return;
  }

  // Check for circular dependencies
  if (visitingPaths.has(resolvedPath)) {
    throw CircularDependencyError.forTemplateInheritance(visitingPaths, resolvedPath);
  }

  // Add to visiting paths
  visitingPaths.add(resolvedPath);

  // Load the current template
  const config = await loadTemplate(resolvedPath);

  // Get the directory or base URL for resolving relative extends
  const currentBase = isUrl(resolvedPath)
    ? new URL('.', resolvedPath).href
    : path.dirname(resolvedPath);

  // If template has extends, load them first (recursively)
  if (config.extends != null && config.extends !== '') {
    const extendsList = Array.isArray(config.extends) ? config.extends : [config.extends];

    /* eslint-disable no-await-in-loop */
    for (const extendsPath of extendsList) {
      await loadAllTemplatesRecursive(
        extendsPath,
        currentBase,
        visitedPaths,
        visitingPaths,
        allTemplates,
      );
    }
    /* eslint-enable no-await-in-loop */
  }

  // Remove from visiting paths and add to visited
  visitingPaths.delete(resolvedPath);
  visitedPaths.add(resolvedPath);

  // Add current template to the collection
  allTemplates.push(config);
}

/**
 * Load all templates in dependency order without merging
 * @param templatePath - Path or URL to the template file
 * @param baseDir - Base directory or URL for resolving relative paths in extends
 * @param visitedPaths - Set of already visited paths
 * @returns Array of sorted templates (in dependency order, ready for sequential processing)
 */
export async function loadTemplatesInOrder(
  templatePath: string,
  baseDir?: string,
  visitedPaths: Set<string> = new Set(),
): Promise<TasksConfiguration[]> {
  // Collect all templates first (without merging)
  const allTemplates: TasksConfiguration[] = [];
  const visitingPaths = new Set<string>();
  await loadAllTemplatesRecursive(
    templatePath,
    baseDir,
    visitedPaths,
    visitingPaths,
    allTemplates,
  );

  // Sort templates topologically based on their dependencies
  return topologicalSortTemplates(allTemplates);
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
  // Use the new loadTemplatesInOrder function
  const sortedTemplates = await loadTemplatesInOrder(templatePath, baseDir, visitedPaths);

  // Merge sorted templates
  return mergeTemplates(sortedTemplates);
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

  const result = {
    ...base,
    ...override,
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

  const result = {
    ...base,
    ...override,
  } as Record<string, unknown>;

  // Remove override field from final prompt
  delete result['override'];

  return result as unknown as PromptDefinition;
}

/**
 * Merge multiple template configurations
 * Later templates override earlier ones for conflicting task IDs
 * @param templates - Array of templates to merge (in priority order)
 * @returns Merged template configuration
 */
export function mergeTemplates(templates: TasksConfiguration[]): TasksConfiguration {
  if (templates.length === 0) {
    // This should not happen in practice but return a minimal valid config
    return { name: 'Empty Template', tasks: [] };
  }

  if (templates.length === 1) {
    const template = templates[0]!;
    // Validate even for single templates
    validateUniqueIds(template.tasks ?? [], template.variables, template.prompts);
    return template;
  }

  // Use a Map to handle task overriding by ID
  const taskMap = new Map<string, TaskDefinition>();

  // Use a Map to handle variable overriding by ID
  const variableMap = new Map<string, VariableDefinition>();

  // Use a Map to handle prompt overriding by ID
  const promptMap = new Map<string, PromptDefinition>();

  // Track template enabled conditions for lazy evaluation
  const templateEnabledMap: Record<string, EnabledValue> = {};

  // Process templates in order (earlier templates have lower priority)
  for (const template of templates) {
    // Store the template's enabled condition (if any)
    if (template.enabled != null) {
      templateEnabledMap[template.name] = template.enabled;
    }

    // Skip templates that are explicitly disabled (enabled: false)
    // Note: undefined or true means enabled
    // Only skip if it's the literal boolean false (not conditional expressions)
    if (template.enabled === false) {
      log(
        `⊘ Skipping disabled template "${template.name}" - its tasks, prompts, and variables will not be included`,
        'info',
      );
      // eslint-disable-next-line no-continue
      continue;
    }

    // Merge top-level prompts if present
    if (template.prompts != null) {
      for (const prompt of template.prompts) {
        if (promptMap.has(prompt.id)) {
          // Prompt already exists - require explicit override strategy
          if (prompt.override == null) {
            throw IdConflictError.forPrompt(prompt.id);
          }
          const existingPrompt = promptMap.get(prompt.id)!;
          const mergedPrompt = mergePrompt(existingPrompt, prompt);
          // Add template enabled condition for lazy evaluation
          if (template.enabled != null) {
            mergedPrompt.$templateEnabled = template.enabled;
          }
          promptMap.set(prompt.id, mergedPrompt);
        } else {
          // New prompt, add it with template enabled condition
          const newPrompt = { ...prompt };
          if (template.enabled != null) {
            newPrompt.$templateEnabled = template.enabled;
          }
          promptMap.set(prompt.id, newPrompt);
        }
      }
    }

    // Merge top-level variables if present
    if (template.variables != null) {
      for (const variable of template.variables) {
        if (variableMap.has(variable.id)) {
          // Variable already exists - require explicit override strategy
          if (variable.override == null) {
            throw IdConflictError.forVariable(variable.id);
          }
          const existingVariable = variableMap.get(variable.id)!;
          const mergedVariable = mergeVariable(existingVariable, variable);
          // Add template enabled condition for lazy evaluation
          if (template.enabled != null) {
            mergedVariable.$templateEnabled = template.enabled;
          }
          variableMap.set(variable.id, mergedVariable);
        } else {
          // New variable, add it with template enabled condition
          const newVariable = { ...variable };
          if (template.enabled != null) {
            newVariable.$templateEnabled = template.enabled;
          }
          variableMap.set(variable.id, newVariable);
        }
      }
    }

    // Merge tasks
    for (const task of template.tasks ?? []) {
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
        // Add template enabled condition for lazy evaluation
        if (template.enabled != null) {
          mergedTask.$templateEnabled = template.enabled;
        }
        taskMap.set(task.id, mergedTask);
      } else {
        // New task, add it with template enabled condition
        const newTask = { ...task };
        if (template.enabled != null) {
          newTask.$templateEnabled = template.enabled;
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

  // Use the last template's name, description, and dependencies (highest priority)
  const lastTemplate = templates[templates.length - 1]!;

  const result: TasksConfiguration = {
    name: lastTemplate.name,
    tasks,
  };

  // Add optional fields from last template if they exist
  if (lastTemplate.description != null) {
    result.description = lastTemplate.description;
  }

  if (lastTemplate.dependencies != null) {
    result.dependencies = lastTemplate.dependencies;
  }

  if (lastTemplate.enabled != null) {
    result.enabled = lastTemplate.enabled;
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
 * Clear the template cache (useful for testing)
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}

/**
 * Load tasks from a configuration file with template inheritance support
 * @param tasksFilePath - Path to the tasks configuration file
 * @param options - Optional configuration
 * @param options.sequential - If true, return templates as separate items for sequential processing
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
}> {
  debug(`Loading tasks from ${tasksFilePath}...`);

  // If sequential mode, load templates without merging
  if (options?.sequential === true) {
    const templates = await loadTemplatesInOrder(tasksFilePath);

    debug(`Loaded ${templates.length} template(s) for processing`);

    return {
      tasks: [],
      templates,
    };
  }

  // Otherwise, use the traditional merged approach
  const config = await loadAndMergeTemplate(tasksFilePath);

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

  return result;
}
