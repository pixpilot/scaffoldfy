/**
 * Topological Sort Utilities
 *
 * This module provides utilities for topologically sorting templates
 * based on their dependencies while preserving the original order
 * of independent templates.
 */

import type { TasksConfiguration } from './types.js';
import { CircularDependencyError } from './errors/base.js';

/**
 * Topologically sort templates based on their dependencies
 * while preserving the original order of independent templates.
 *
 * Templates that have no dependencies and are not depended upon by others
 * will maintain their original position in the array. Only templates with
 * dependency relationships will be reordered.
 *
 * @param templates - Array of templates to sort
 * @returns Sorted array of templates
 */
export function topologicalSortTemplates(
  templates: TasksConfiguration[],
): TasksConfiguration[] {
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

  // Build a dependency graph
  const templateMap = new Map<string, TasksConfiguration>();
  const dependents = new Map<string, Set<string>>(); // Map of template name -> templates that depend on it
  const dependencies = new Map<string, Set<string>>(); // Map of template name -> templates it depends on

  for (const template of templates) {
    templateMap.set(template.name, template);
    dependencies.set(template.name, new Set());

    if (template.dependencies != null && template.dependencies.length > 0) {
      for (const depName of template.dependencies) {
        dependencies.get(template.name)!.add(depName);

        if (!dependents.has(depName)) {
          dependents.set(depName, new Set());
        }
        dependents.get(depName)!.add(template.name);
      }
    }
  }

  // Identify templates that are completely independent:
  // - Have no dependencies
  // - Are not depended upon by any other template
  const independentTemplates = new Set<string>();
  const independentPositions = new Map<string, number>(); // Track original positions

  for (let i = 0; i < templates.length; i++) {
    const template = templates[i]!;
    const hasDeps = dependencies.get(template.name)!.size > 0;
    const isDependedUpon =
      dependents.has(template.name) && dependents.get(template.name)!.size > 0;

    if (!hasDeps && !isDependedUpon) {
      independentTemplates.add(template.name);
      independentPositions.set(template.name, i);
    }
  }

  // Get templates that need to be sorted (have dependencies or are depended upon)
  const templatesToSort = templates.filter(
    (template) => !independentTemplates.has(template.name),
  );

  // Perform topological sort on dependent templates only
  const sorted: TasksConfiguration[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

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
      const deps = dependencies.get(templateName);
      if (deps != null && deps.size > 0) {
        for (const depName of deps) {
          visit(depName);
        }
      }
    }

    visiting.delete(templateName);
    visited.add(templateName);

    if (template != null && !independentTemplates.has(templateName)) {
      sorted.push(template);
    }
  }

  // Visit all templates that need sorting
  for (const template of templatesToSort) {
    visit(template.name);
  }

  // Now merge the sorted templates back with independent templates at their original positions
  const result: TasksConfiguration[] = [];
  let sortedIndex = 0;

  for (let i = 0; i < templates.length; i++) {
    const template = templates[i]!;

    if (independentTemplates.has(template.name)) {
      // Keep independent template at its original position
      result.push(template);
    } else if (sortedIndex < sorted.length) {
      // We need to insert a sorted template here
      // But we should insert it only if we haven't used all sorted templates
      result.push(sorted[sortedIndex]!);
      sortedIndex++;
    }
  }

  return result;
}
