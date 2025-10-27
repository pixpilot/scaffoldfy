/**
 * Tests for $sourceUrl annotation functionality
 */

import type { ScaffoldfyConfiguration } from '../../src/types';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearConfigurationCache,
  loadAndMergeConfiguration,
  loadConfiguration,
} from '../../src/configurations/index';
import { getTestTempFilesDir } from '../test-utils';

const testDir = getTestTempFilesDir('test-fixtures', 'source-url-annotation');

// Helper to create test configuration files
function createConfigFile(name: string, config: ScaffoldfyConfiguration): string {
  const filePath = path.join(testDir, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  return filePath;
}

describe('$sourceUrl annotation', () => {
  // Mock fetch for testing
  const originalFetch = globalThis.fetch;

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
    globalThis.fetch = originalFetch;
  });

  it('should annotate tasks with source URL from remote configuration', async () => {
    const mockFetch = (async (input: any): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url === 'https://example.com/remote-config.json') {
        return new Response(
          JSON.stringify({
            name: 'test-config',
            tasks: [
              {
                id: 'remote-task',
                name: 'Remote Task',
                description: 'Task from remote',
                required: true,
                enabled: true,
                type: 'write',
                config: {
                  file: 'output.txt',
                  templateFile: './template.hbs',
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('Not Found', { status: 404 });
    }) as typeof fetch;

    globalThis.fetch = mockFetch;

    const config = await loadConfiguration('https://example.com/remote-config.json');
    expect(config.tasks).toBeDefined();
    expect(config.tasks![0]?.$sourceUrl).toBe('https://example.com/remote-config.json');
  });

  it('should annotate tasks with source path from local configuration', async () => {
    const config: ScaffoldfyConfiguration = {
      name: 'test-config',
      tasks: [
        {
          id: 'local-task',
          name: 'Local Task',
          description: 'Task from local',
          required: true,
          enabled: true,
          type: 'write',
          config: { file: 'output.txt', templateFile: './template.hbs' },
        },
      ],
    };

    const filePath = createConfigFile('local-with-templatefile.json', config);
    const loaded = await loadConfiguration(filePath);

    expect(loaded.tasks).toBeDefined();
    expect(loaded.tasks![0]?.$sourceUrl).toBe(filePath);
  });

  it('should preserve $sourceUrl when merging templates', async () => {
    const baseConfig: ScaffoldfyConfiguration = {
      name: 'test-config',
      tasks: [
        {
          id: 'task1',
          name: 'Base Task',
          description: 'Base',
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
          id: 'task1',
          name: 'Overridden Task',
          description: 'Overridden',
          required: false,
          enabled: true,
          type: 'write',
          config: { value: 'new' },
          override: 'merge',
        },
      ],
    };

    createConfigFile('base.json', baseConfig);
    const childPath = createConfigFile('child.json', childConfig);

    const merged = await loadAndMergeConfiguration(childPath);

    // The overridden task should have the child's source URL
    expect(merged.tasks).toBeDefined();
    expect(merged.tasks![0]?.$sourceUrl).toBe(childPath);
  });

  it('should annotate variables with source URL from local configuration', async () => {
    const config: ScaffoldfyConfiguration = {
      name: 'test-config',
      variables: [
        {
          id: 'testVar',
          value: { type: 'exec-file', file: './script' },
        },
      ],
    };

    const filePath = createConfigFile('with-variables.json', config);
    const loaded = await loadConfiguration(filePath);

    expect(loaded.variables).toBeDefined();
    expect(loaded.variables).toHaveLength(1);
    expect(loaded.variables![0]?.$sourceUrl).toBe(filePath);
    expect(loaded.variables![0]?.id).toBe('testVar');
  });

  it('should preserve $sourceUrl when merging variables', async () => {
    const baseConfig: ScaffoldfyConfiguration = {
      name: 'base-template',
      variables: [
        {
          id: 'var1',
          value: 'base-value',
        },
      ],
    };

    const childConfig: ScaffoldfyConfiguration = {
      name: 'child-template',
      extends: 'base-vars.json',
      variables: [
        {
          id: 'var1',
          value: 'overridden-value',
          override: 'merge',
        },
      ],
    };

    createConfigFile('base-vars.json', baseConfig);
    const childPath = createConfigFile('child-vars.json', childConfig);

    const merged = await loadAndMergeConfiguration(childPath);

    // The overridden variable should have the child's source URL
    expect(merged.variables).toBeDefined();
    expect(merged.variables![0]?.$sourceUrl).toBe(childPath);
    expect(merged.variables![0]?.value).toBe('overridden-value');
  });
});
