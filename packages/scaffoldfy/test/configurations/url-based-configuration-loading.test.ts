/**
 * Tests for url-based configuration loading functionality
 */

import type { ScaffoldfyConfiguration } from '../../src/types';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  clearConfigurationCache,
  loadAndMergeConfiguration,
  loadConfiguration,
  loadTasksWithInheritance,
} from '../../src/configurations/index';
import {
  CircularDependencyError,
  ConfigFetchError,
  ConfigParseError,
} from '../../src/errors/index';

const testDir = path.join(
  process.cwd(),
  'test-fixtures',
  'url-based-configuration-loading',
);

// Helper to create test configuration files
function createConfigFile(name: string, config: ScaffoldfyConfiguration): string {
  const filePath = path.join(testDir, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  return filePath;
}

describe('url-based configuration loading', () => {
  // Mock fetch for testing
  const originalFetch = globalThis.fetch;
  let mockFetch: typeof fetch;

  beforeEach(() => {
    // Clean up before each test
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    clearConfigurationCache();

    mockFetch = (async (input: any): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();

      // Mock different URLs
      if (url === 'https://example.com/base.json') {
        return new Response(
          JSON.stringify({
            name: 'test-config',
            tasks: [
              {
                id: 'remote-task',
                name: 'Remote Task',
                description: 'Task from remote URL',
                required: true,
                enabled: true,
                type: 'write',
                config: { remote: true },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url === 'https://example.com/templates/child.json') {
        return new Response(
          JSON.stringify({
            name: 'child-template',
            extends: '../base.json',
            tasks: [
              {
                id: 'child-task',
                name: 'Child Task',
                description: 'Child task',
                required: true,
                enabled: true,
                type: 'write',
                config: {},
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url === 'https://example.com/invalid.json') {
        return new Response('invalid json', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url === 'https://example.com/notfound.json') {
        return new Response('Not Found', { status: 404 });
      }

      if (url === 'https://example.com/circular1.json') {
        return new Response(
          JSON.stringify({
            name: 'circular-template-1',
            extends: 'https://example.com/circular2.json',
            tasks: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url === 'https://example.com/circular2.json') {
        return new Response(
          JSON.stringify({
            name: 'circular-template-2',
            extends: 'https://example.com/circular1.json',
            tasks: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url === 'https://example.com/with-local-extends.json') {
        return new Response(
          JSON.stringify({
            name: 'remote-with-local-extends',
            extends: './local-base.json',
            tasks: [
              {
                id: 'remote-with-local',
                name: 'Remote with local extends',
                description: 'Test',
                required: true,
                enabled: true,
                type: 'write',
                config: {},
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url === 'https://example.com/local-base.json') {
        return new Response(
          JSON.stringify({
            name: 'test-config',
            tasks: [
              {
                id: 'local-base-task',
                name: 'Local Base Task',
                description: 'Base task',
                required: true,
                enabled: true,
                type: 'write',
                config: {},
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response('Not Found', { status: 404 });
    }) as typeof fetch;

    globalThis.fetch = mockFetch;
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
    globalThis.fetch = originalFetch;
  });

  it('should load configuration from HTTP URL', async () => {
    const config = await loadConfiguration('https://example.com/base.json');

    expect(config.tasks).toBeDefined();
    expect(config.tasks).toHaveLength(1);
    expect(config.tasks![0]?.id).toBe('remote-task');
    expect(config.tasks![0]?.name).toBe('Remote Task');
  });

  it('should cache remote configurations', async () => {
    const config1 = await loadConfiguration('https://example.com/base.json');
    const config2 = await loadConfiguration('https://example.com/base.json');

    expect(config1).toBe(config2); // Should be the same cached instance
  });

  it('should throw error for 404 responses', async () => {
    await expect(loadConfiguration('https://example.com/notfound.json')).rejects.toThrow(
      ConfigFetchError,
    );
  });

  it('should throw error for invalid JSON from URL', async () => {
    await expect(loadConfiguration('https://example.com/invalid.json')).rejects.toThrow(
      ConfigParseError,
    );
  });

  it('should support configuration inheritance from URLs', async () => {
    const config = await loadAndMergeConfiguration(
      'https://example.com/templates/child.json',
    );

    expect(config.tasks).toBeDefined();
    expect(config.tasks).toHaveLength(2);
    expect(config.tasks!.some((t) => t.id === 'remote-task')).toBe(true);
    expect(config.tasks!.some((t) => t.id === 'child-task')).toBe(true);
  });

  it('should detect circular dependencies with URLs', async () => {
    await expect(
      loadAndMergeConfiguration('https://example.com/circular1.json'),
    ).rejects.toThrow(CircularDependencyError);
  });

  it('should support mixed local and remote templates', async () => {
    const localConfig: ScaffoldfyConfiguration = {
      name: 'local-template',
      extends: 'https://example.com/base.json',
      tasks: [
        {
          id: 'local-task',
          name: 'Local Task',
          description: 'Local task extending remote',
          required: true,
          enabled: true,
          type: 'write',
          config: {},
        },
      ],
    };

    const localPath = createConfigFile('mixed.json', localConfig);
    const config = await loadAndMergeConfiguration(localPath);

    expect(config.tasks).toBeDefined();
    expect(config.tasks).toHaveLength(2);
    expect(config.tasks!.some((t) => t.id === 'remote-task')).toBe(true);
    expect(config.tasks!.some((t) => t.id === 'local-task')).toBe(true);
  });

  it('should resolve relative URLs correctly', async () => {
    const config = await loadAndMergeConfiguration(
      'https://example.com/with-local-extends.json',
    );

    expect(config.tasks).toBeDefined();
    expect(config.tasks).toHaveLength(2);
    expect(config.tasks!.some((t) => t.id === 'local-base-task')).toBe(true);
    expect(config.tasks!.some((t) => t.id === 'remote-with-local')).toBe(true);
  });

  it('should load tasks with inheritance from URL', async () => {
    const result = await loadTasksWithInheritance('https://example.com/base.json');

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0]?.id).toBe('remote-task');
  });

  it('should support HTTPS URLs', async () => {
    const config = await loadConfiguration('https://example.com/base.json');

    expect(config.tasks).toHaveLength(1);
  });

  it('should handle remote templates with multiple extends', async () => {
    // Mock a template that extends multiple remote templates
    const multiExtendsFetch = (async (input: any): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url === 'https://example.com/multi.json') {
        return new Response(
          JSON.stringify({
            name: 'multi-extends-template',
            extends: ['https://example.com/base1.json', 'https://example.com/base2.json'],
            tasks: [
              {
                id: 'multi-task',
                name: 'Multi Task',
                description: 'Task with multiple extends',
                required: true,
                enabled: true,
                type: 'write',
                config: {},
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url === 'https://example.com/base1.json') {
        return new Response(
          JSON.stringify({
            name: 'test-config',
            tasks: [
              {
                id: 'base1-task',
                name: 'Base 1 Task',
                description: 'Task from base 1',
                required: true,
                enabled: true,
                type: 'write',
                config: {},
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url === 'https://example.com/base2.json') {
        return new Response(
          JSON.stringify({
            name: 'test-config',
            tasks: [
              {
                id: 'base2-task',
                name: 'Base 2 Task',
                description: 'Task from base 2',
                required: true,
                enabled: true,
                type: 'write',
                config: {},
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response('Not Found', { status: 404 });
    }) as typeof fetch;

    globalThis.fetch = multiExtendsFetch;

    const config = await loadAndMergeConfiguration('https://example.com/multi.json');

    expect(config.tasks).toBeDefined();
    expect(config.tasks).toHaveLength(3);
    expect(config.tasks!.some((t) => t.id === 'base1-task')).toBe(true);
    expect(config.tasks!.some((t) => t.id === 'base2-task')).toBe(true);
    expect(config.tasks!.some((t) => t.id === 'multi-task')).toBe(true);
  });
});
