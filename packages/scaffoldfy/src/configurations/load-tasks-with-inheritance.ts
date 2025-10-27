import type {
  EnabledValue,
  PromptDefinition,
  ScaffoldfyConfiguration,
  TaskDefinition,
  VariableDefinition,
} from '../types';
import { debug, log } from '../utils';
import { loadConfigurationsInOrder } from './load-configurations-in-order';
import { mergeConfigurations } from './merge-configurations';

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
): Promise<ScaffoldfyConfiguration> {
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
  configs?: ScaffoldfyConfiguration[];
  transformers?: import('../transformers/types').Transformer[];
}> {
  debug(`Loading tasks from ${tasksFilePath}...`);

  // If sequential mode, load configurations without merging
  if (options?.sequential === true) {
    const configurations = await loadConfigurationsInOrder(tasksFilePath);

    debug(`Loaded ${configurations.length} configuration(s) for processing`);

    return {
      tasks: [],
      configs: configurations,
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
    transformers?: import('../transformers/types').Transformer[];
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
