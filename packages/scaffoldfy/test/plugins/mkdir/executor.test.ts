/**
 * Tests for mkdir plugin executor
 */

import type { MkdirConfig } from '../../../src/plugins/mkdir/types.js';
import type { InitConfig } from '../../../src/types.js';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { executeMkdir } from '../../../src/plugins/mkdir/executor.js';

const TEST_DIR = path.join(process.cwd(), '__test_mkdir__');

const mockConfig: InitConfig = {
  projectName: 'test-repo',
  shouldCreate: true,
};

describe('executeMkdir', () => {
  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    // Change to test directory
    process.chdir(TEST_DIR);
  });

  afterEach(async () => {
    // Change back to original directory
    process.chdir(path.join(TEST_DIR, '..'));

    // Small delay to ensure file handles are released on Windows
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 100);
    });

    // Clean up test directory with retry logic for Windows
    if (fs.existsSync(TEST_DIR)) {
      let retries = 3;
      while (retries > 0) {
        try {
          fs.rmSync(TEST_DIR, {
            recursive: true,
            force: true,
          });
          break;
        } catch (error) {
          retries--;
          if (retries === 0) {
            console.warn(`Failed to clean up test directory: ${error as Error}`);
          } else {
            await new Promise<void>((resolve) => {
              setTimeout(() => {
                resolve();
              }, 100);
            });
          }
        }
      }
    }
  });

  it('should create a single directory', async () => {
    const config: MkdirConfig = {
      path: 'new-dir',
    };

    await executeMkdir(config, mockConfig);

    expect(fs.existsSync('new-dir')).toBe(true);
    expect(fs.statSync('new-dir').isDirectory()).toBe(true);
  });

  it('should create nested directories', async () => {
    const config: MkdirConfig = {
      path: 'deeply/nested/directory/structure',
    };

    await executeMkdir(config, mockConfig);

    expect(fs.existsSync('deeply/nested/directory/structure')).toBe(true);
    expect(fs.statSync('deeply/nested/directory/structure').isDirectory()).toBe(true);
  });

  it('should handle existing directories gracefully', async () => {
    // Create directory first
    fs.mkdirSync('existing-dir', { recursive: true });

    const config: MkdirConfig = {
      path: 'existing-dir',
    };

    // Should not throw error
    await executeMkdir(config, mockConfig);

    expect(fs.existsSync('existing-dir')).toBe(true);
  });

  it('should skip mkdir when condition is false', async () => {
    const config: MkdirConfig = {
      path: 'conditional-dir',
      condition: 'shouldCreate === false',
    };

    await executeMkdir(config, mockConfig);

    expect(fs.existsSync('conditional-dir')).toBe(false);
  });

  it('should execute mkdir when condition is true', async () => {
    const config: MkdirConfig = {
      path: 'conditional-dir',
      condition: 'shouldCreate === true',
    };

    await executeMkdir(config, mockConfig);

    expect(fs.existsSync('conditional-dir')).toBe(true);
  });

  it('should create multiple levels in one go', async () => {
    const config: MkdirConfig = {
      path: 'src/components/ui/buttons',
    };

    await executeMkdir(config, mockConfig);

    expect(fs.existsSync('src')).toBe(true);
    expect(fs.existsSync('src/components')).toBe(true);
    expect(fs.existsSync('src/components/ui')).toBe(true);
    expect(fs.existsSync('src/components/ui/buttons')).toBe(true);
  });
});
