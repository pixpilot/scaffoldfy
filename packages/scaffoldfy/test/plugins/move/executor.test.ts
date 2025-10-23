/**
 * Tests for move plugin executor
 */

import type { MoveConfig } from '../../../src/plugins/move/types.js';
import type { InitConfig } from '../../../src/types.js';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { executeMove } from '../../../src/plugins/move/executor.js';

const TEST_DIR = path.join(process.cwd(), '__test_move__');

const mockConfig: InitConfig = {
  projectName: 'test-repo',
  shouldMove: true,
};

describe('executeMove', () => {
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

  it('should move a file to a new location', async () => {
    // Create source file
    fs.writeFileSync('source.txt', 'test content');

    const config: MoveConfig = {
      from: 'source.txt',
      to: 'destination.txt',
    };

    await executeMove(config, mockConfig);

    expect(fs.existsSync('source.txt')).toBe(false);
    expect(fs.existsSync('destination.txt')).toBe(true);
    expect(fs.readFileSync('destination.txt', 'utf-8')).toBe('test content');
  });

  it('should move a file to a nested directory', async () => {
    // Create source file
    fs.writeFileSync('file.txt', 'test content');

    const config: MoveConfig = {
      from: 'file.txt',
      to: 'nested/dir/file.txt',
    };

    await executeMove(config, mockConfig);

    expect(fs.existsSync('file.txt')).toBe(false);
    expect(fs.existsSync('nested/dir/file.txt')).toBe(true);
    expect(fs.readFileSync('nested/dir/file.txt', 'utf-8')).toBe('test content');
  });

  it('should move a directory', async () => {
    // Create source directory with files
    fs.mkdirSync('source-dir', { recursive: true });
    fs.writeFileSync('source-dir/file1.txt', 'content1');
    fs.writeFileSync('source-dir/file2.txt', 'content2');

    const config: MoveConfig = {
      from: 'source-dir',
      to: 'destination-dir',
    };

    await executeMove(config, mockConfig);

    expect(fs.existsSync('source-dir')).toBe(false);
    expect(fs.existsSync('destination-dir')).toBe(true);
    expect(fs.existsSync('destination-dir/file1.txt')).toBe(true);
    expect(fs.existsSync('destination-dir/file2.txt')).toBe(true);
    expect(fs.readFileSync('destination-dir/file1.txt', 'utf-8')).toBe('content1');
    expect(fs.readFileSync('destination-dir/file2.txt', 'utf-8')).toBe('content2');
  });

  it('should skip move if source does not exist', async () => {
    const config: MoveConfig = {
      from: 'non-existent.txt',
      to: 'destination.txt',
    };

    await executeMove(config, mockConfig);

    expect(fs.existsSync('destination.txt')).toBe(false);
  });

  it('should skip move when condition is false', async () => {
    // Create source file
    fs.writeFileSync('source.txt', 'test content');

    const config: MoveConfig = {
      from: 'source.txt',
      to: 'destination.txt',
      condition: 'shouldMove === false',
    };

    await executeMove(config, mockConfig);

    expect(fs.existsSync('source.txt')).toBe(true);
    expect(fs.existsSync('destination.txt')).toBe(false);
  });

  it('should execute move when condition is true', async () => {
    // Create source file
    fs.writeFileSync('source.txt', 'test content');

    const config: MoveConfig = {
      from: 'source.txt',
      to: 'destination.txt',
      condition: 'shouldMove === true',
    };

    await executeMove(config, mockConfig);

    expect(fs.existsSync('source.txt')).toBe(false);
    expect(fs.existsSync('destination.txt')).toBe(true);
  });
});
