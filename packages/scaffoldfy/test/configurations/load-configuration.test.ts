/**
 * Tests for loadConfiguration functionality
 */

import type { TasksConfiguration } from '../../src/types';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearConfigurationCache,
  loadAndMergeConfiguration,
  loadConfiguration,
} from '../../src/configurations/index';
import { ConfigParseError, ConfigurationFileNotFoundError } from '../../src/errors/index';

const testDir = path.join(process.cwd(), 'test-fixtures', 'load-configuration');

// Helper to create test configuration files
function createConfigFile(name: string, config: TasksConfiguration): string {
  const filePath = path.join(testDir, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  return filePath;
}

describe('loadConfiguration', () => {
  beforeEach(() => {
    // Clean up before each test
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    clearConfigurationCache();
  });

  afterEach(() => {
    // Clean up after each test
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it('should load a simple configuration file', async () => {
    const config: TasksConfiguration = {
      name: 'test-config',
      tasks: [
        {
          id: 'task1',
          name: 'Task 1',
          description: 'Test task',
          required: true,
          enabled: true,
          type: 'write',
          config: { file: 'test.txt', template: 'Hello {{name}}' },
        },
      ],
    };

    const filePath = createConfigFile('simple.json', config);
    const loaded = await loadConfiguration(filePath);

    // Tasks should be annotated with $sourceUrl
    expect(loaded.tasks).toBeDefined();
    expect(loaded.tasks).toHaveLength(1);
    expect(loaded.tasks![0]?.$sourceUrl).toBe(filePath);
    expect(loaded.tasks![0]?.id).toBe('task1');
    expect(loaded.tasks![0]?.name).toBe('Task 1');
  });

  it('should throw error for non-existent file', async () => {
    await expect(loadConfiguration('non-existent.json')).rejects.toThrow(
      ConfigurationFileNotFoundError,
    );
  });

  it('should throw error for invalid JSON', async () => {
    const filePath = path.join(testDir, 'invalid.json');
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(filePath, 'invalid json');

    await expect(loadConfiguration(filePath)).rejects.toThrow(ConfigParseError);
  });

  it('should allow missing tasks array (for configurations with only prompts/variables)', async () => {
    const filePath = path.join(testDir, 'no-tasks.json');
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        name: 'prompts-only-template',
        prompts: [
          {
            id: 'projectName',
            type: 'input',
            message: 'Project name?',
          },
        ],
      }),
    );

    const config = await loadConfiguration(filePath);
    expect(config.tasks).toEqual([]);
    expect(config.prompts).toBeDefined();
    expect(config.prompts).toHaveLength(1);
  });

  it('should detect circular dependencies', async () => {
    const config1: TasksConfiguration = {
      name: 'test-template-1',
      extends: 'template2.json',
      tasks: [],
    };
    const config2: TasksConfiguration = {
      name: 'test-template-2',
      extends: 'template1.json',
      tasks: [],
    };

    createConfigFile('template1.json', config1);
    createConfigFile('template2.json', config2);

    await expect(
      loadAndMergeConfiguration(path.join(testDir, 'template1.json')),
    ).rejects.toThrow('Circular dependency detected');
  });
});
