/**
 * Tests for loadTasksWithInheritance functionality
 */

import type { ScaffoldfyConfiguration } from '../../src/types';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearConfigurationCache,
  loadTasksWithInheritance,
} from '../../src/configurations/index';
import { getTestTempFilesDir } from '../test-utils';

const testDir = getTestTempFilesDir('test-fixtures', 'load-tasks-with-inheritance');

// Helper to create test configuration files
function createConfigFile(name: string, config: ScaffoldfyConfiguration): string {
  const filePath = path.join(testDir, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  return filePath;
}

describe('loadTasksWithInheritance', () => {
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

  it('should load tasks with inheritance info', async () => {
    const baseConfig: ScaffoldfyConfiguration = {
      name: 'test-config',
      tasks: [
        {
          id: 'base',
          name: 'Base',
          description: 'Test',
          required: true,
          enabled: true,
          type: 'write',
          config: {},
        },
      ],
    };

    const childConfig: ScaffoldfyConfiguration = {
      name: 'child-template',
      extends: 'base.json',
      tasks: [
        {
          id: 'child',
          name: 'Child',
          description: 'Test',
          required: true,
          enabled: true,
          type: 'delete',
          config: {},
        },
      ],
    };

    createConfigFile('base.json', baseConfig);
    const childPath = createConfigFile('child.json', childConfig);

    const result = await loadTasksWithInheritance(childPath);

    expect(result.tasks).toHaveLength(2);
  });
});
