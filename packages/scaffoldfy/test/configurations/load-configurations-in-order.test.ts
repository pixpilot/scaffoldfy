/**
 * Tests for load-configurations-in-order module
 */

import type { ScaffoldfyConfiguration } from '../../src/types';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearConfigurationCache } from '../../src/configurations/index';
import { loadConfigurationsInOrder } from '../../src/configurations/load-configurations-in-order';
import { getTestTempFilesDir } from '../test-utils';

const testDir = getTestTempFilesDir('test-fixtures', 'load-configurations-in-order');

// Helper to create test configuration files
function createConfigFile(name: string, config: ScaffoldfyConfiguration): string {
  const filePath = path.join(testDir, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  return filePath;
}

describe('loadConfigurationsInOrder', () => {
  beforeEach(() => {
    // Clean up before each test
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    clearConfigurationCache();
  });

  afterEach(() => {
    // Clean up after each test
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true });
      }
    } catch (error) {
      // Ignore cleanup errors on Windows
      console.warn('Cleanup failed:', error);
    }
  });

  it('should load a simple configuration', async () => {
    const config: ScaffoldfyConfiguration = {
      name: 'test-config',
      tasks: [
        {
          id: 'task1',
          name: 'Task 1',
          type: 'write',
          config: {
            file: 'test.txt',
            content: 'test',
          },
        },
      ],
    };

    const configPath = createConfigFile('test.json', config);
    const result = await loadConfigurationsInOrder(configPath);

    expect(result).toHaveLength(1);
    expect(result[0]).toBeDefined();
    expect(result[0]!.name).toBe('test-config');
  });

  it('should load configurations with extends in order', async () => {
    const baseConfig: ScaffoldfyConfiguration = {
      name: 'base-config',
      tasks: [
        {
          id: 'base-task',
          name: 'Base Task',
          type: 'write',
          config: {
            file: 'base.txt',
            content: 'base',
          },
        },
      ],
    };

    const childConfig: ScaffoldfyConfiguration = {
      name: 'child-config',
      extends: 'base.json',
      tasks: [
        {
          id: 'child-task',
          name: 'Child Task',
          type: 'write',
          config: {
            file: 'child.txt',
            content: 'child',
          },
        },
      ],
    };

    createConfigFile('base.json', baseConfig);
    const childPath = createConfigFile('child.json', childConfig);

    const result = await loadConfigurationsInOrder(childPath);

    expect(result).toHaveLength(2);
    expect(result[0]).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[0]!.name).toBe('base-config');
    expect(result[1]!.name).toBe('child-config');
  });

  describe('enabled condition propagation to extended configs', () => {
    it('should propagate a static false enabled condition from child to its extended base config', async () => {
      const baseConfig: ScaffoldfyConfiguration = {
        name: 'base-config',
        tasks: [
          {
            id: 'base-task',
            name: 'Base Task',
            type: 'write',
            config: { file: 'base.txt', content: 'base' },
          },
        ],
      };

      const childConfig: ScaffoldfyConfiguration = {
        name: 'child-config',
        extends: 'base.json',
        enabled: false,
        tasks: [
          {
            id: 'child-task',
            name: 'Child Task',
            type: 'write',
            config: { file: 'child.txt', content: 'child' },
          },
        ],
      };

      createConfigFile('base.json', baseConfig);
      const childPath = createConfigFile('child.json', childConfig);

      const result = await loadConfigurationsInOrder(childPath);

      expect(result).toHaveLength(2);
      /*
       * The base config has no own `enabled` so it should inherit `false`
       * from the child that extends it.
       */
      expect(result[0]!.name).toBe('base-config');
      expect(result[0]!.enabled).toBe(false);

      expect(result[1]!.name).toBe('child-config');
      expect(result[1]!.enabled).toBe(false);
    });

    it('should propagate a condition-based enabled from child to its extended base config', async () => {
      const baseConfig: ScaffoldfyConfiguration = {
        name: 'base-config',
        tasks: [
          {
            id: 'base-task',
            name: 'Base Task',
            type: 'write',
            config: { file: 'base.txt', content: 'base' },
          },
        ],
      };

      const enabledCondition = {
        type: 'condition' as const,
        value: 'isNpmPackage == true',
      };

      const childConfig: ScaffoldfyConfiguration = {
        name: 'child-config',
        extends: 'base.json',
        enabled: enabledCondition,
        tasks: [
          {
            id: 'child-task',
            name: 'Child Task',
            type: 'write',
            config: { file: 'child.txt', content: 'child' },
          },
        ],
      };

      createConfigFile('base.json', baseConfig);
      const childPath = createConfigFile('child.json', childConfig);

      const result = await loadConfigurationsInOrder(childPath);

      expect(result).toHaveLength(2);
      /*
       * The base config should inherit the condition-based enabled from the child
       * so it is not executed when the condition evaluates to false.
       */
      expect(result[0]!.name).toBe('base-config');
      expect(result[0]!.enabled).toEqual(enabledCondition);

      expect(result[1]!.name).toBe('child-config');
      expect(result[1]!.enabled).toEqual(enabledCondition);
    });

    it('should NOT override an existing enabled condition on the base config', async () => {
      const baseOwnEnabled = {
        type: 'condition' as const,
        value: 'someOtherCondition == true',
      };

      const baseConfig: ScaffoldfyConfiguration = {
        name: 'base-config',
        enabled: baseOwnEnabled,
        tasks: [
          {
            id: 'base-task',
            name: 'Base Task',
            type: 'write',
            config: { file: 'base.txt', content: 'base' },
          },
        ],
      };

      const childConfig: ScaffoldfyConfiguration = {
        name: 'child-config',
        extends: 'base.json',
        enabled: { type: 'condition' as const, value: 'isNpmPackage == true' },
        tasks: [
          {
            id: 'child-task',
            name: 'Child Task',
            type: 'write',
            config: { file: 'child.txt', content: 'child' },
          },
        ],
      };

      createConfigFile('base.json', baseConfig);
      const childPath = createConfigFile('child.json', childConfig);

      const result = await loadConfigurationsInOrder(childPath);

      expect(result).toHaveLength(2);
      /*
       * The base config already defines its own `enabled` — it must not be
       * overwritten by the child's condition.
       */
      expect(result[0]!.name).toBe('base-config');
      expect(result[0]!.enabled).toEqual(baseOwnEnabled);
    });

    it('should propagate the enabled condition transitively through a multi-level extends chain', async () => {
      const grandparentConfig: ScaffoldfyConfiguration = {
        name: 'grandparent-config',
        tasks: [
          {
            id: 'gp-task',
            name: 'GP Task',
            type: 'write',
            config: { file: 'gp.txt', content: 'gp' },
          },
        ],
      };

      const parentConfig: ScaffoldfyConfiguration = {
        name: 'parent-config',
        extends: 'grandparent.json',
        tasks: [
          {
            id: 'parent-task',
            name: 'Parent Task',
            type: 'write',
            config: { file: 'parent.txt', content: 'parent' },
          },
        ],
      };

      const enabledCondition = {
        type: 'condition' as const,
        value: 'isNpmPackage == true',
      };

      const childConfig: ScaffoldfyConfiguration = {
        name: 'child-config',
        extends: 'parent.json',
        enabled: enabledCondition,
        tasks: [
          {
            id: 'child-task',
            name: 'Child Task',
            type: 'write',
            config: { file: 'child.txt', content: 'child' },
          },
        ],
      };

      createConfigFile('grandparent.json', grandparentConfig);
      createConfigFile('parent.json', parentConfig);
      const childPath = createConfigFile('child.json', childConfig);

      const result = await loadConfigurationsInOrder(childPath);

      expect(result).toHaveLength(3);

      const [grandparent, parent, child] = result;
      /*
       * Both grandparent and parent are ancestors loaded via the child's
       * extends chain.  Neither has its own `enabled`, so both should inherit
       * the child's condition.
       */
      expect(grandparent!.name).toBe('grandparent-config');
      expect(grandparent!.enabled).toEqual(enabledCondition);

      expect(parent!.name).toBe('parent-config');
      expect(parent!.enabled).toEqual(enabledCondition);

      expect(child!.name).toBe('child-config');
      expect(child!.enabled).toEqual(enabledCondition);
    });

    it('should not add an enabled condition to base configs when the child has no enabled condition', async () => {
      const baseConfig: ScaffoldfyConfiguration = {
        name: 'base-config',
        tasks: [
          {
            id: 'base-task',
            name: 'Base Task',
            type: 'write',
            config: { file: 'base.txt', content: 'base' },
          },
        ],
      };

      const childConfig: ScaffoldfyConfiguration = {
        name: 'child-config',
        extends: 'base.json',
        tasks: [
          {
            id: 'child-task',
            name: 'Child Task',
            type: 'write',
            config: { file: 'child.txt', content: 'child' },
          },
        ],
      };

      createConfigFile('base.json', baseConfig);
      const childPath = createConfigFile('child.json', childConfig);

      const result = await loadConfigurationsInOrder(childPath);

      expect(result).toHaveLength(2);
      // Neither config defines `enabled`, so both should remain undefined.
      expect(result[0]!.enabled).toBeUndefined();
      expect(result[1]!.enabled).toBeUndefined();
    });

    it('should propagate enabled from a sibling extend to its own extends when entry has no enabled', async () => {
      /*
       * This is the real-world scenario:
       *
       *   entry.json     (NO enabled)  extends [base.json, project-info.json]
       *   base.json      (NO enabled, provides a variable/prompt used in the condition)
       *   project-info.json  (enabled: condition)  extends  remote.json
       *   remote.json    (NO enabled — should inherit condition from project-info)
       *
       * When the condition on project-info is false, remote.json must also be
       * skipped.  Without the fix, remote.json has no `enabled` and always runs.
       */
      const baseConfig: ScaffoldfyConfiguration = {
        name: 'base-config',
        prompts: [{ id: 'isNpmPackage', type: 'confirm', message: 'Is npm package?' }],
      };

      const remoteConfig: ScaffoldfyConfiguration = {
        name: 'remote-config',
        tasks: [
          {
            id: 'remote-task',
            name: 'Remote Task',
            type: 'write',
            config: { file: 'remote.txt', content: 'remote' },
          },
        ],
      };

      const enabledCondition = {
        type: 'condition' as const,
        value: 'isNpmPackage == true',
      };

      const projectInfoConfig: ScaffoldfyConfiguration = {
        name: 'project-info-config',
        extends: 'remote.json',
        enabled: enabledCondition,
        tasks: [
          {
            id: 'pi-task',
            name: 'PI Task',
            type: 'write',
            config: { file: 'pi.txt', content: 'pi' },
          },
        ],
      };

      const entryConfig: ScaffoldfyConfiguration = {
        name: 'entry-config',
        // NO `enabled` on the entry
        extends: ['base.json', 'project-info.json'],
        tasks: [
          {
            id: 'entry-task',
            name: 'Entry Task',
            type: 'write',
            config: { file: 'entry.txt', content: 'entry' },
          },
        ],
      };

      createConfigFile('base.json', baseConfig);
      createConfigFile('remote.json', remoteConfig);
      createConfigFile('project-info.json', projectInfoConfig);
      const entryPath = createConfigFile('entry.json', entryConfig);

      const result = await loadConfigurationsInOrder(entryPath);

      /*
       * Expected load order (depth-first, extends listed before the config itself):
       *   0. base-config   (leaf, no extends)
       *   1. remote-config (leaf, loaded as extend of project-info)
       *   2. project-info-config
       *   3. entry-config  (loaded last)
       */
      expect(result).toHaveLength(4);

      const base = result.find((c) => c.name === 'base-config');
      const remote = result.find((c) => c.name === 'remote-config');
      const projectInfo = result.find((c) => c.name === 'project-info-config');
      const entry = result.find((c) => c.name === 'entry-config');

      expect(base).toBeDefined();
      expect(remote).toBeDefined();
      expect(projectInfo).toBeDefined();
      expect(entry).toBeDefined();

      // base and entry have no enabled of any kind
      expect(base!.enabled).toBeUndefined();
      expect(entry!.enabled).toBeUndefined();

      // project-info keeps its own condition
      expect(projectInfo!.enabled).toEqual(enabledCondition);

      /*
       * KEY assertion: remote-config must inherit the condition from
       * project-info so it is skipped whenever isNpmPackage != true.
       */
      expect(remote!.enabled).toEqual(enabledCondition);
    });
  });
});
