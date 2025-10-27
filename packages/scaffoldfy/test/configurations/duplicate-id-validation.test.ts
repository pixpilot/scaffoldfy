/**
 * Tests for duplicate ID validation functionality
 */

import type { TasksConfiguration } from '../../src/types';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearConfigurationCache,
  loadAndMergeConfiguration,
  mergeConfigurations,
} from '../../src/configurations/index';

const testDir = path.join(process.cwd(), 'test-fixtures', 'duplicate-id-validation');

// Helper to create test configuration files
function createConfigFile(name: string, config: TasksConfiguration): string {
  const filePath = path.join(testDir, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  return filePath;
}

describe('duplicate ID validation', () => {
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

  it('should throw error when duplicate IDs exist after inheritance merge', async () => {
    const baseConfig: TasksConfiguration = {
      name: 'test-config',
      variables: [
        {
          id: 'shared-id',
          value: 'base-value',
        },
      ],
    };

    const childConfig: TasksConfiguration = {
      name: 'child-template',
      extends: 'base.json',
      tasks: [
        {
          id: 'shared-id',
          name: 'Task',
          description: 'Task with same ID as variable',
          required: true,
          enabled: true,
          type: 'write',
          config: {},
        },
      ],
    };

    createConfigFile('base.json', baseConfig);
    const childPath = createConfigFile('child.json', childConfig);

    await expect(loadAndMergeConfiguration(childPath)).rejects.toThrow(
      'Duplicate ID "shared-id"',
    );
  });

  it('should allow same ID when overriding (task to task)', async () => {
    const baseConfig: TasksConfiguration = {
      name: 'test-config',
      tasks: [
        {
          id: 'same-id',
          name: 'Base Task',
          description: 'Base',
          required: true,
          enabled: true,
          type: 'write',
          config: {},
        },
      ],
    };

    const childConfig: TasksConfiguration = {
      name: 'child-template',
      extends: 'base.json',
      tasks: [
        {
          id: 'same-id',
          name: 'Overridden Task',
          description: 'Overridden',
          required: false,
          enabled: true,
          type: 'write',
          config: {},
          override: 'merge',
        },
      ],
    };

    createConfigFile('base.json', baseConfig);
    const childPath = createConfigFile('child.json', childConfig);

    // This should not throw - it's a valid override
    const merged = await loadAndMergeConfiguration(childPath);
    expect(merged.tasks).toHaveLength(1);
    expect(merged.tasks![0]?.name).toBe('Overridden Task');
  });

  it('should allow same ID when overriding variables', async () => {
    const baseConfig: TasksConfiguration = {
      name: 'test-config',
      variables: [
        {
          id: 'var-id',
          value: 'base',
        },
      ],
    };

    const childConfig: TasksConfiguration = {
      name: 'test-template-2',
      extends: 'base.json',
      variables: [
        {
          id: 'var-id',
          value: 'override',
          override: 'merge',
        },
      ],
    };

    createConfigFile('base.json', baseConfig);
    const childPath = createConfigFile('child.json', childConfig);

    // This should not throw - it's a valid override
    const merged = await loadAndMergeConfiguration(childPath);
    expect(merged.variables).toHaveLength(1);
    expect(merged.variables![0]?.value).toBe('override');
  });

  it('should allow same ID when overriding prompts', async () => {
    const baseConfig: TasksConfiguration = {
      name: 'test-config',
      prompts: [
        {
          id: 'prompt-id',
          type: 'input',
          message: 'Base message',
        },
      ],
    };

    const childConfig: TasksConfiguration = {
      name: 'test-template-3',
      extends: 'base.json',
      prompts: [
        {
          id: 'prompt-id',
          type: 'input',
          message: 'Override message',
          override: 'merge',
        },
      ],
    };

    createConfigFile('base.json', baseConfig);
    const childPath = createConfigFile('child.json', childConfig);

    // This should not throw - it's a valid override
    const merged = await loadAndMergeConfiguration(childPath);
    expect(merged.prompts).toHaveLength(1);
    expect(merged.prompts![0]?.message).toBe('Override message');
  });

  it('should allow same ID when overriding variables with replace strategy', async () => {
    const baseConfig: TasksConfiguration = {
      name: 'test-config',
      variables: [
        {
          id: 'var-id',
          value: 'base',
        },
      ],
    };

    const childConfig: TasksConfiguration = {
      name: 'test-template-4',
      extends: 'base.json',
      variables: [
        {
          id: 'var-id',
          value: 'replaced',
          override: 'replace',
        },
      ],
    };

    createConfigFile('base.json', baseConfig);
    const childPath = createConfigFile('child.json', childConfig);

    // This should not throw - it's a valid override
    const merged = await loadAndMergeConfiguration(childPath);
    expect(merged.variables).toHaveLength(1);
    expect(merged.variables![0]?.value).toBe('replaced');
    // Verify override field is removed
    expect(merged.variables![0]?.override).toBeUndefined();
  });

  it('should allow same ID when overriding prompts with replace strategy', async () => {
    const baseConfig: TasksConfiguration = {
      name: 'test-config',
      prompts: [
        {
          id: 'prompt-id',
          type: 'input',
          message: 'Base message',
          default: 'base default',
        },
      ],
    };

    const childConfig: TasksConfiguration = {
      name: 'test-template-5',
      extends: 'base.json',
      prompts: [
        {
          id: 'prompt-id',
          type: 'confirm',
          message: 'Replaced message',
          override: 'replace',
        },
      ],
    };

    createConfigFile('base.json', baseConfig);
    const childPath = createConfigFile('child.json', childConfig);

    // This should not throw - it's a valid override
    const merged = await loadAndMergeConfiguration(childPath);
    expect(merged.prompts).toHaveLength(1);
    expect(merged.prompts![0]?.message).toBe('Replaced message');
    expect(merged.prompts![0]?.type).toBe('confirm');
    // Verify override field is removed and base properties are completely replaced
    expect(merged.prompts![0]?.override).toBeUndefined();
    expect(merged.prompts![0]?.default).toBeUndefined(); // Should be completely replaced
  });

  it('should throw error when overriding variable without override strategy', () => {
    const baseConfig: TasksConfiguration = {
      name: 'test-config',
      variables: [
        {
          id: 'var-id',
          value: 'base',
        },
      ],
    };

    const childConfig: TasksConfiguration = {
      name: 'test-config',
      variables: [
        {
          id: 'var-id',
          value: 'override',
          // Missing override field - should throw error
        },
      ],
    };

    expect(() => mergeConfigurations([baseConfig, childConfig])).toThrow(
      'Variable ID conflict: "var-id" is defined in multiple templates.\n' +
        '  You must specify an override strategy: add "override": "merge" or "override": "replace" to the variable.\n' +
        '  Variable is being extended/overridden but no override strategy was specified.',
    );
  });

  it('should throw error when overriding prompt without override strategy', () => {
    const baseConfig: TasksConfiguration = {
      name: 'test-config',
      prompts: [
        {
          id: 'prompt-id',
          type: 'input',
          message: 'Base message',
        },
      ],
    };

    const childConfig: TasksConfiguration = {
      name: 'test-config',
      prompts: [
        {
          id: 'prompt-id',
          type: 'input',
          message: 'Override message',
          // Missing override field - should throw error
        },
      ],
    };

    expect(() => mergeConfigurations([baseConfig, childConfig])).toThrow(
      'Prompt ID conflict: "prompt-id" is defined in multiple templates.\n' +
        '  You must specify an override strategy: add "override": "merge" or "override": "replace" to the prompt.\n' +
        '  Prompt is being extended/overridden but no override strategy was specified.',
    );
  });
});
