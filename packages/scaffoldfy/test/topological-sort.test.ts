/**
 * Tests for topological sort functionality
 */

import type { TasksConfiguration } from '../src/types.js';
import { describe, expect, it } from 'vitest';
import { CircularDependencyError } from '../src/errors/base.js';
import { topologicalSortTemplates } from '../src/topological-sort.js';

describe('topologicalSortTemplates', () => {
  it('should handle empty array', () => {
    const result = topologicalSortTemplates([]);
    expect(result).toEqual([]);
  });

  it('should handle single template', () => {
    const templates: TasksConfiguration[] = [
      {
        name: 'template-a',
        tasks: [],
      },
    ];

    const result = topologicalSortTemplates(templates);
    expect(result).toEqual(templates);
  });

  it('should preserve order of independent templates with no dependencies', () => {
    const templates: TasksConfiguration[] = [
      {
        name: 'template-a',
        tasks: [],
      },
      {
        name: 'template-b',
        tasks: [],
      },
      {
        name: 'template-c',
        tasks: [],
      },
    ];

    const result = topologicalSortTemplates(templates);
    // Order should be preserved since none have dependencies
    expect(result).toEqual(templates);
  });

  it('should sort templates with simple dependency chain', () => {
    const templates: TasksConfiguration[] = [
      {
        name: 'template-c',
        dependencies: ['template-b'],
        tasks: [],
      },
      {
        name: 'template-b',
        dependencies: ['template-a'],
        tasks: [],
      },
      {
        name: 'template-a',
        tasks: [],
      },
    ];

    const result = topologicalSortTemplates(templates);
    // Should be sorted: a, b, c
    expect(result[0]!.name).toBe('template-a');
    expect(result[1]!.name).toBe('template-b');
    expect(result[2]!.name).toBe('template-c');
  });

  it('should keep independent template at original position when mixed with dependent templates', () => {
    const templates: TasksConfiguration[] = [
      {
        name: 'project-info',
        tasks: [],
      },
      {
        name: 'license-file',
        tasks: [],
      },
      {
        name: 'cleanup-setup-artifacts',
        tasks: [],
        // This template has no dependencies and nothing depends on it
      },
    ];

    const result = topologicalSortTemplates(templates);
    // All templates are independent, order should be preserved
    expect(result[0]!.name).toBe('project-info');
    expect(result[1]!.name).toBe('license-file');
    expect(result[2]!.name).toBe('cleanup-setup-artifacts');
  });

  it('should preserve position of independent template at the end', () => {
    const templates: TasksConfiguration[] = [
      {
        name: 'project-info',
        tasks: [],
      },
      {
        name: 'pixpilot-info',
        dependencies: ['project-info'],
        tasks: [],
      },
      {
        name: 'license-file',
        tasks: [],
      },
      {
        name: 'cleanup-setup-artifacts',
        tasks: [],
        // This template has no dependencies and nothing depends on it
        // Should stay at position 3 (index 3)
      },
    ];

    const result = topologicalSortTemplates(templates);
    // Dependencies should be sorted, but cleanup should stay at the end
    expect(result[0]!.name).toBe('project-info');
    expect(result[1]!.name).toBe('pixpilot-info');
    expect(result[2]!.name).toBe('license-file');
    expect(result[3]!.name).toBe('cleanup-setup-artifacts');
  });

  it('should handle complex scenario with multiple independent and dependent templates', () => {
    const templates: TasksConfiguration[] = [
      {
        name: 'project-info',
        tasks: [],
      },
      {
        name: 'pixpilot-info',
        dependencies: ['project-info'],
        tasks: [],
      },
      {
        name: 'turbo-workspace-package-generator',
        dependencies: ['project-info'],
        tasks: [],
      },
      {
        name: 'license-file',
        tasks: [],
        // Independent
      },
      {
        name: 'update-root-package-json',
        dependencies: ['turbo-workspace-package-generator'],
        tasks: [],
      },
      {
        name: 'pixpilot-copilot-instructions',
        tasks: [],
        // Independent
      },
      {
        name: 'cleanup-setup-artifacts',
        tasks: [],
        // Independent - should stay at position 6
      },
    ];

    const result = topologicalSortTemplates(templates);

    // Find positions of key templates
    const cleanupIndex = result.findIndex((t) => t.name === 'cleanup-setup-artifacts');

    // Independent templates should maintain their relative positions
    expect(cleanupIndex).toBe(6); // Should stay at the end

    // Dependencies should be satisfied
    const projectInfoIndex = result.findIndex((t) => t.name === 'project-info');
    const pixpilotInfoIndex = result.findIndex((t) => t.name === 'pixpilot-info');
    const turboIndex = result.findIndex(
      (t) => t.name === 'turbo-workspace-package-generator',
    );
    const updateRootIndex = result.findIndex(
      (t) => t.name === 'update-root-package-json',
    );

    // project-info should come before pixpilot-info and turbo-workspace-package-generator
    expect(projectInfoIndex).toBeLessThan(pixpilotInfoIndex);
    expect(projectInfoIndex).toBeLessThan(turboIndex);

    // turbo-workspace-package-generator should come before update-root-package-json
    expect(turboIndex).toBeLessThan(updateRootIndex);
  });

  it('should handle templates with multiple dependencies', () => {
    const templates: TasksConfiguration[] = [
      {
        name: 'template-d',
        dependencies: ['template-b', 'template-c'],
        tasks: [],
      },
      {
        name: 'template-c',
        tasks: [],
      },
      {
        name: 'template-b',
        tasks: [],
      },
      {
        name: 'template-a',
        tasks: [],
      },
    ];

    const result = topologicalSortTemplates(templates);

    // Find positions
    const bIndex = result.findIndex((t) => t.name === 'template-b');
    const cIndex = result.findIndex((t) => t.name === 'template-c');
    const dIndex = result.findIndex((t) => t.name === 'template-d');

    // b and c should come before d
    expect(bIndex).toBeLessThan(dIndex);
    expect(cIndex).toBeLessThan(dIndex);
  });

  it('should detect circular dependencies', () => {
    const templates: TasksConfiguration[] = [
      {
        name: 'template-a',
        dependencies: ['template-b'],
        tasks: [],
      },
      {
        name: 'template-b',
        dependencies: ['template-c'],
        tasks: [],
      },
      {
        name: 'template-c',
        dependencies: ['template-a'],
        tasks: [],
      },
    ];

    expect(() => topologicalSortTemplates(templates)).toThrow(CircularDependencyError);
  });

  it('should detect self-referential circular dependency', () => {
    const templates: TasksConfiguration[] = [
      {
        name: 'template-a',
        dependencies: ['template-a'],
        tasks: [],
      },
    ];

    expect(() => topologicalSortTemplates(templates)).toThrow(CircularDependencyError);
  });

  it('should handle templates with duplicate names by preserving order', () => {
    const templates: TasksConfiguration[] = [
      {
        name: 'template-a',
        tasks: [],
      },
      {
        name: 'template-b',
        tasks: [],
      },
      {
        name: 'template-a', // Duplicate name
        tasks: [],
      },
    ];

    const result = topologicalSortTemplates(templates);
    // Should preserve original order when duplicate names exist
    expect(result).toEqual(templates);
  });

  it('should handle long dependency chains', () => {
    const templates: TasksConfiguration[] = [
      {
        name: 'template-e',
        dependencies: ['template-d'],
        tasks: [],
      },
      {
        name: 'template-d',
        dependencies: ['template-c'],
        tasks: [],
      },
      {
        name: 'template-c',
        dependencies: ['template-b'],
        tasks: [],
      },
      {
        name: 'template-b',
        dependencies: ['template-a'],
        tasks: [],
      },
      {
        name: 'template-a',
        tasks: [],
      },
    ];

    const result = topologicalSortTemplates(templates);

    // Should be in order: a, b, c, d, e
    expect(result[0]!.name).toBe('template-a');
    expect(result[1]!.name).toBe('template-b');
    expect(result[2]!.name).toBe('template-c');
    expect(result[3]!.name).toBe('template-d');
    expect(result[4]!.name).toBe('template-e');
  });

  it('should handle mixed independent templates at different positions', () => {
    const templates: TasksConfiguration[] = [
      {
        name: 'independent-1',
        tasks: [],
      },
      {
        name: 'dependent-a',
        dependencies: ['dependent-b'],
        tasks: [],
      },
      {
        name: 'independent-2',
        tasks: [],
      },
      {
        name: 'dependent-b',
        tasks: [],
      },
      {
        name: 'independent-3',
        tasks: [],
      },
    ];

    const result = topologicalSortTemplates(templates);

    // Independent templates should keep their positions
    expect(result[0]!.name).toBe('independent-1');
    expect(result[2]!.name).toBe('independent-2');
    expect(result[4]!.name).toBe('independent-3');

    // Dependent templates should be sorted
    const bIndex = result.findIndex((t) => t.name === 'dependent-b');
    const aIndex = result.findIndex((t) => t.name === 'dependent-a');
    expect(bIndex).toBeLessThan(aIndex);
  });

  it('should handle real-world scenario from user example', () => {
    const templates: TasksConfiguration[] = [
      {
        name: 'project-info',
        tasks: [],
      },
      {
        name: 'pixpilot-info',
        dependencies: ['project-info'],
        tasks: [],
      },
      {
        name: 'turbo-workspace-package-generator',
        dependencies: ['project-info'],
        tasks: [],
      },
      {
        name: 'license-file',
        tasks: [],
      },
      {
        name: 'update-root-package-json',
        dependencies: ['turbo-workspace-package-generator'],
        tasks: [],
      },
      {
        name: 'pixpilot-copilot-instructions',
        tasks: [],
      },
      {
        name: 'cleanup-setup-artifacts',
        tasks: [],
        // This should ALWAYS stay at the end (position 6)
      },
    ];

    const result = topologicalSortTemplates(templates);

    // Cleanup should remain at position 6 (last)
    expect(result[6]!.name).toBe('cleanup-setup-artifacts');

    // Verify dependencies are satisfied
    const projectInfoIndex = result.findIndex((t) => t.name === 'project-info');
    const pixpilotInfoIndex = result.findIndex((t) => t.name === 'pixpilot-info');
    const turboIndex = result.findIndex(
      (t) => t.name === 'turbo-workspace-package-generator',
    );
    const updateRootIndex = result.findIndex(
      (t) => t.name === 'update-root-package-json',
    );

    expect(projectInfoIndex).toBeLessThan(pixpilotInfoIndex);
    expect(projectInfoIndex).toBeLessThan(turboIndex);
    expect(turboIndex).toBeLessThan(updateRootIndex);
  });
});
