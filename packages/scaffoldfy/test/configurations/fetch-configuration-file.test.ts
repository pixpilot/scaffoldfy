/**
 * Tests for fetchConfigurationFile functionality
 */

import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getTestTempFilesDir } from '../test-utils';

const testDir = getTestTempFilesDir('test-fixtures', 'inheritance');

describe('fetchConfigurationFile', () => {
  // Mock fetch for testing
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Clean up before each test
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up after each test
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    globalThis.fetch = originalFetch;
  });

  it('should fetch from remote URL', async () => {
    const { fetchConfigurationFile } = await import('../../src/configurations/index');
    const mockFetch = (async (url: string) => {
      if (url === 'https://example.com/template.hbs') {
        return Promise.resolve(
          new Response('# {{title}}\n\nWelcome to {{projectName}}', {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          }),
        );
      }
      return Promise.resolve(new Response('Not Found', { status: 404 }));
    }) as typeof fetch;

    globalThis.fetch = mockFetch;

    const content = await fetchConfigurationFile('https://example.com/template.hbs');
    expect(content).toBe('# {{title}}\n\nWelcome to {{projectName}}');
  });

  it('should read from local file', async () => {
    const { fetchConfigurationFile } = await import('../../src/configurations/index');
    const templatePath = path.join(testDir, 'local-template.hbs');
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(templatePath, 'Local content: {{name}}');

    const content = await fetchConfigurationFile(templatePath);
    expect(content).toBe('Local content: {{name}}');
  });

  it('should throw error for non-existent local file', async () => {
    const { fetchConfigurationFile } = await import('../../src/configurations/index');
    const nonExistentPath = path.join(testDir, 'does-not-exist.hbs');
    await expect(fetchConfigurationFile(nonExistentPath)).rejects.toThrow(
      'Configuration file not found',
    );
  });
});
