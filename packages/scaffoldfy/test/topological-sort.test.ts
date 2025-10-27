/**
 * Tests for topological sort functionality
 */

import type { TasksConfiguration } from '../src/types';
import { describe, expect, it } from 'vitest';
import { CircularDependencyError } from '../src/errors/base';
import { topologicalSortConfigs } from '../src/topological-sort';

describe('topologicalSortConfigs', () => {
  it('should handle empty array', () => {
    const result = topologicalSortConfigs([]);
    expect(result).toEqual([]);
  });

  it('should handle single config', () => {
    const configs: TasksConfiguration[] = [
      {
        name: 'config-a',
        tasks: [],
      },
    ];

    const result = topologicalSortConfigs(configs);
    expect(result).toEqual(configs);
  });

  it('should preserve order of independent configs with no dependencies', () => {
    const configs: TasksConfiguration[] = [
      {
        name: 'config-a',
        tasks: [],
      },
      {
        name: 'config-b',
        tasks: [],
      },
      {
        name: 'config-c',
        tasks: [],
      },
    ];

    const result = topologicalSortConfigs(configs);
    // Order should be preserved since none have dependencies
    expect(result).toEqual(configs);
  });

  it('should sort configs with simple dependency chain', () => {
    const configs: TasksConfiguration[] = [
      {
        name: 'config-c',
        dependencies: ['config-b'],
        tasks: [],
      },
      {
        name: 'config-b',
        dependencies: ['config-a'],
        tasks: [],
      },
      {
        name: 'config-a',
        tasks: [],
      },
    ];

    const result = topologicalSortConfigs(configs);
    // Should be sorted: a, b, c
    expect(result[0]!.name).toBe('config-a');
    expect(result[1]!.name).toBe('config-b');
    expect(result[2]!.name).toBe('config-c');
  });

  it('should keep independent config at original position when mixed with dependent configs', () => {
    const configs: TasksConfiguration[] = [
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
        // This config has no dependencies and nothing depends on it
      },
    ];

    const result = topologicalSortConfigs(configs);
    // All configs are independent, order should be preserved
    expect(result[0]!.name).toBe('project-info');
    expect(result[1]!.name).toBe('license-file');
    expect(result[2]!.name).toBe('cleanup-setup-artifacts');
  });

  it('should preserve position of independent config at the end', () => {
    const configs: TasksConfiguration[] = [
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
        // This config has no dependencies and nothing depends on it
        // Should stay at position 3 (index 3)
      },
    ];

    const result = topologicalSortConfigs(configs);
    // Dependencies should be sorted, but cleanup should stay at the end
    expect(result[0]!.name).toBe('project-info');
    expect(result[1]!.name).toBe('pixpilot-info');
    expect(result[2]!.name).toBe('license-file');
    expect(result[3]!.name).toBe('cleanup-setup-artifacts');
  });

  it('should handle complex scenario with multiple independent and dependent configs', () => {
    const configs: TasksConfiguration[] = [
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

    const result = topologicalSortConfigs(configs);

    // Find positions of key configs
    const cleanupIndex = result.findIndex((t) => t.name === 'cleanup-setup-artifacts');

    // Independent configs should maintain their relative positions
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

  it('should handle configs with multiple dependencies', () => {
    const configs: TasksConfiguration[] = [
      {
        name: 'config-d',
        dependencies: ['config-b', 'config-c'],
        tasks: [],
      },
      {
        name: 'config-c',
        tasks: [],
      },
      {
        name: 'config-b',
        tasks: [],
      },
      {
        name: 'config-a',
        tasks: [],
      },
    ];

    const result = topologicalSortConfigs(configs);

    // Find positions
    const bIndex = result.findIndex((t) => t.name === 'config-b');
    const cIndex = result.findIndex((t) => t.name === 'config-c');
    const dIndex = result.findIndex((t) => t.name === 'config-d');

    // b and c should come before d
    expect(bIndex).toBeLessThan(dIndex);
    expect(cIndex).toBeLessThan(dIndex);
  });

  it('should detect circular dependencies', () => {
    const configs: TasksConfiguration[] = [
      {
        name: 'config-a',
        dependencies: ['config-b'],
        tasks: [],
      },
      {
        name: 'config-b',
        dependencies: ['config-c'],
        tasks: [],
      },
      {
        name: 'config-c',
        dependencies: ['config-a'],
        tasks: [],
      },
    ];

    expect(() => topologicalSortConfigs(configs)).toThrow(CircularDependencyError);
  });

  it('should detect self-referential circular dependency', () => {
    const configs: TasksConfiguration[] = [
      {
        name: 'config-a',
        dependencies: ['config-a'],
        tasks: [],
      },
    ];

    expect(() => topologicalSortConfigs(configs)).toThrow(CircularDependencyError);
  });

  it('should handle configs with duplicate names by preserving order', () => {
    const configs: TasksConfiguration[] = [
      {
        name: 'config-a',
        tasks: [],
      },
      {
        name: 'config-b',
        tasks: [],
      },
      {
        name: 'config-a', // Duplicate name
        tasks: [],
      },
    ];

    const result = topologicalSortConfigs(configs);
    // Should preserve original order when duplicate names exist
    expect(result).toEqual(configs);
  });

  it('should handle long dependency chains', () => {
    const configs: TasksConfiguration[] = [
      {
        name: 'config-e',
        dependencies: ['config-d'],
        tasks: [],
      },
      {
        name: 'config-d',
        dependencies: ['config-c'],
        tasks: [],
      },
      {
        name: 'config-c',
        dependencies: ['config-b'],
        tasks: [],
      },
      {
        name: 'config-b',
        dependencies: ['config-a'],
        tasks: [],
      },
      {
        name: 'config-a',
        tasks: [],
      },
    ];

    const result = topologicalSortConfigs(configs);

    // Should be in order: a, b, c, d, e
    expect(result[0]!.name).toBe('config-a');
    expect(result[1]!.name).toBe('config-b');
    expect(result[2]!.name).toBe('config-c');
    expect(result[3]!.name).toBe('config-d');
    expect(result[4]!.name).toBe('config-e');
  });

  it('should handle mixed independent configs at different positions', () => {
    const configs: TasksConfiguration[] = [
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

    const result = topologicalSortConfigs(configs);

    // Independent configs should keep their positions
    expect(result[0]!.name).toBe('independent-1');
    expect(result[2]!.name).toBe('independent-2');
    expect(result[4]!.name).toBe('independent-3');

    // Dependent configs should be sorted
    const bIndex = result.findIndex((t) => t.name === 'dependent-b');
    const aIndex = result.findIndex((t) => t.name === 'dependent-a');
    expect(bIndex).toBeLessThan(aIndex);
  });

  it('should handle real-world scenario from user example', () => {
    const configs: TasksConfiguration[] = [
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

    const result = topologicalSortConfigs(configs);

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
