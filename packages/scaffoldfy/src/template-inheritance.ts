/**
 * Template Inheritance - Extend base templates
 *
 * This module handles loading and merging template configurations,
 * allowing templates to extend from one or more base templates.
 */

import type { TaskDefinition, TasksConfiguration } from './types.js';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { log } from './utils.js';

const readFile = promisify(fs.readFile);

/**
 * Cache for loaded templates to avoid reloading
 */
const templateCache = new Map<string, TasksConfiguration>();

/**
 * Load a template configuration file
 * @param templatePath - Path to the template file
 * @param visitedPaths - Set of already visited paths to detect circular dependencies
 * @returns The loaded template configuration
 */
export async function loadTemplate(
  templatePath: string,
  visitedPaths: Set<string> = new Set(),
): Promise<TasksConfiguration> {
  // Resolve to absolute path
  const absolutePath = path.isAbsolute(templatePath)
    ? templatePath
    : path.resolve(process.cwd(), templatePath);

  // Check cache first
  if (templateCache.has(absolutePath)) {
    return templateCache.get(absolutePath)!;
  }

  // Check for circular dependencies
  if (visitedPaths.has(absolutePath)) {
    throw new Error(
      `Circular dependency detected: ${Array.from(visitedPaths).join(' -> ')} -> ${absolutePath}`,
    );
  }

  // Check if file exists
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Template file not found: ${absolutePath}`);
  }

  // Add to visited paths
  visitedPaths.add(absolutePath);

  // Load and parse the template file
  const content = await readFile(absolutePath, 'utf-8');
  let config: TasksConfiguration;

  try {
    config = JSON.parse(content) as TasksConfiguration;
  } catch (error) {
    throw new Error(
      `Failed to parse template file ${absolutePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Validate basic structure
  if (!Array.isArray(config.tasks)) {
    throw new TypeError(
      `Invalid template file ${absolutePath}: 'tasks' array is required`,
    );
  }

  // Cache the loaded template
  templateCache.set(absolutePath, config);

  return config;
}

/**
 * Recursively load and merge templates
 * @param templatePath - Path to the template file
 * @param baseDir - Base directory for resolving relative paths in extends
 * @param visitedPaths - Set of already visited paths
 * @returns Merged template configuration
 */
export async function loadAndMergeTemplate(
  templatePath: string,
  baseDir?: string,
  visitedPaths: Set<string> = new Set(),
): Promise<TasksConfiguration> {
  const absolutePath = path.isAbsolute(templatePath)
    ? templatePath
    : path.resolve(baseDir ?? process.cwd(), templatePath);

  // Check for circular dependencies before loading
  if (visitedPaths.has(absolutePath)) {
    throw new Error(
      `Circular dependency detected: ${Array.from(visitedPaths).join(' -> ')} -> ${absolutePath}`,
    );
  }

  // Add current path to visited set
  visitedPaths.add(absolutePath);

  // Load the current template (don't pass visitedPaths to avoid double-checking)
  const config = await loadTemplate(absolutePath);

  // If no extends, return as is
  if (config.extends == null || config.extends === '') {
    return config;
  }

  // Get the directory of the current template for resolving relative extends
  const currentDir = path.dirname(absolutePath);

  // Process extends (can be string or array)
  const extendsList = Array.isArray(config.extends) ? config.extends : [config.extends];

  // Load all base templates
  const baseConfigs: TasksConfiguration[] = [];

  /* eslint-disable no-await-in-loop */
  for (const extendsPath of extendsList) {
    const baseConfig = await loadAndMergeTemplate(extendsPath, currentDir, visitedPaths);
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

  // Process templates in order (earlier templates have lower priority)
  for (const template of templates) {
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

  // Convert map back to array, preserving order
  return {
    tasks: Array.from(taskMap.values()),
  };
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

  // Merge dependencies arrays
  const mergedDependencies = [
    ...(base.dependencies ?? []),
    ...(override.dependencies ?? []),
  ];
  const uniqueDependencies =
    mergedDependencies.length > 0 ? [...new Set(mergedDependencies)] : undefined;

  return {
    ...base,
    ...override,
    config: mergedConfig,
    ...(mergedPrompts != null && { prompts: mergedPrompts }),
    ...(uniqueDependencies != null && { dependencies: uniqueDependencies }),
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
 * @returns Array of task definitions
 */
export async function loadTasksWithInheritance(
  tasksFilePath: string,
): Promise<TaskDefinition[]> {
  log(`Loading tasks from ${tasksFilePath}...`, 'info');

  const config = await loadAndMergeTemplate(tasksFilePath);

  log(`Loaded ${config.tasks.length} task(s)`, 'info');

  if (config.extends != null && config.extends !== '') {
    const extendsList = Array.isArray(config.extends) ? config.extends : [config.extends];
    log(`Extended from: ${extendsList.join(', ')}`, 'info');
  }

  return config.tasks;
}
