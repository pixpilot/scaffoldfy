/**
 * Topological Sort Utilities
 *
 * This module provides utilities for topologically sorting configs
 * based on their dependencies while preserving the original order
 * of independent configs.
 */

import type { TasksConfiguration } from '../types';
import { CircularDependencyError } from '../errors/base';

/**
 * Topologically sort configs based on their dependencies
 * while preserving the original order of independent configs.
 *
 * Configs that have no dependencies and are not depended upon by others
 * will maintain their original position in the array. Only configs with
 * dependency relationships will be reordered.
 *
 * @param templates - Array of configs to sort
 * @returns Sorted array of configs
 */
export function topologicalSortConfigs(
  templates: TasksConfiguration[],
): TasksConfiguration[] {
  // If all configs have unique names, use name-based sorting
  // If there are duplicate names, just return configs in order (can't sort by name)
  const nameToConfigs = new Map<string, TasksConfiguration[]>();
  for (const config of templates) {
    const existing = nameToConfigs.get(config.name) || [];
    existing.push(config);
    nameToConfigs.set(config.name, existing);
  }

  // Check if all configs have unique names
  const hasDuplicateNames = Array.from(nameToConfigs.values()).some(
    (arr) => arr.length > 1,
  );

  if (hasDuplicateNames) {
    // Cannot do topological sort with duplicate names
    // Just return configs in the order they were loaded
    return templates;
  }

  // Build a dependency graph
  const configMap = new Map<string, TasksConfiguration>();
  const dependents = new Map<string, Set<string>>(); // Map of config name -> configs that depend on it
  const dependencies = new Map<string, Set<string>>(); // Map of config name -> configs it depends on

  for (const config of templates) {
    configMap.set(config.name, config);
    dependencies.set(config.name, new Set());

    if (config.dependencies != null && config.dependencies.length > 0) {
      for (const depName of config.dependencies) {
        dependencies.get(config.name)!.add(depName);

        if (!dependents.has(depName)) {
          dependents.set(depName, new Set());
        }
        dependents.get(depName)!.add(config.name);
      }
    }
  }

  // Identify configs that are completely independent:
  // - Have no dependencies
  // - Are not depended upon by any other config
  const independentConfigs = new Set<string>();
  const independentPositions = new Map<string, number>(); // Track original positions

  for (let i = 0; i < templates.length; i++) {
    const config = templates[i]!;
    const hasDeps = dependencies.get(config.name)!.size > 0;
    const isDependedUpon =
      dependents.has(config.name) && dependents.get(config.name)!.size > 0;

    if (!hasDeps && !isDependedUpon) {
      independentConfigs.add(config.name);
      independentPositions.set(config.name, i);
    }
  }

  // Get configs that need to be sorted (have dependencies or are depended upon)
  const configsToSort = templates.filter(
    (config) => !independentConfigs.has(config.name),
  );

  // Perform topological sort on dependent configs only
  const sorted: TasksConfiguration[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(configName: string): void {
    if (visited.has(configName)) {
      return;
    }

    if (visiting.has(configName)) {
      // Circular dependency detected
      throw CircularDependencyError.forTemplateDependencies(
        Array.from(visiting),
        configName,
      );
    }

    visiting.add(configName);

    const config = configMap.get(configName);
    if (config != null) {
      // Visit all dependencies first
      const deps = dependencies.get(configName);
      if (deps != null && deps.size > 0) {
        for (const depName of deps) {
          visit(depName);
        }
      }
    }

    visiting.delete(configName);
    visited.add(configName);

    if (config != null && !independentConfigs.has(configName)) {
      sorted.push(config);
    }
  }

  // Visit all configs that need sorting
  for (const config of configsToSort) {
    visit(config.name);
  }

  // Now merge the sorted configs back with independent configs at their original positions
  const result: TasksConfiguration[] = [];
  let sortedIndex = 0;

  for (let i = 0; i < templates.length; i++) {
    const config = templates[i]!;

    if (independentConfigs.has(config.name)) {
      // Keep independent config at its original position
      result.push(config);
    } else if (sortedIndex < sorted.length) {
      // We need to insert a sorted config here
      // But we should insert it only if we haven't used all sorted configs
      result.push(sorted[sortedIndex]!);
      sortedIndex++;
    }
  }

  return result;
}
