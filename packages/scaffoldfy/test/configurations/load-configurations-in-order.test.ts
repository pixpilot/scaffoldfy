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
});
