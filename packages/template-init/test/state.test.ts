/**
 * Tests for state management
 */

import type { InitConfig } from '../src/types.js';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadInitializationState, saveInitializationState } from '../src/state.js';

const TEST_DIR = path.join(process.cwd(), '__test_state__');
const INIT_FLAG = '.template-initialized';

describe('state Management', () => {
  beforeEach(() => {
    // Clean up any previous test directory first
    if (fs.existsSync(TEST_DIR)) {
      try {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }

    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    // Change to test directory
    process.chdir(TEST_DIR);
  });

  afterEach(() => {
    // Change back to root to release file locks
    const originalDir = path.join(TEST_DIR, '..');
    try {
      process.chdir(originalDir);
    } catch {
      // Ignore errors
    }

    // Clean up test directory with retry logic
    let attempts = 0;
    const maxAttempts = 5;
    while (attempts < maxAttempts) {
      try {
        if (fs.existsSync(TEST_DIR)) {
          fs.rmSync(TEST_DIR, { recursive: true, force: true });
        }
        break;
      } catch {
        attempts++;
        if (attempts >= maxAttempts) {
          console.warn(
            `Warning: Could not clean up test directory after ${maxAttempts} attempts`,
          );
        }
      }
    }
  });

  describe('loadInitializationState', () => {
    it('should return null when init flag does not exist', () => {
      const state = loadInitializationState();
      expect(state).toBeNull();
    });

    it('should load state from init flag file', () => {
      const config: InitConfig = {
        repoName: 'test-repo',
        repoOwner: 'test-owner',
        repoUrl: 'https://github.com/test-owner/test-repo.git',
        author: 'Test Author',
        baseRepoUrl: 'https://github.com/test-owner/test-repo',
        orgName: '@test-org',
      };

      const metadata = {
        initializedAt: new Date().toISOString(),
        config,
        completedTasks: ['task1', 'task2'],
        version: '2.0.0',
      };

      // Write init flag file
      fs.writeFileSync(INIT_FLAG, JSON.stringify(metadata, null, 2));

      const state = loadInitializationState();

      expect(state).not.toBeNull();
      expect(state?.config.repoName).toBe('test-repo');
      expect(state?.completedTasks).toEqual(['task1', 'task2']);
    });

    it('should return null for invalid JSON in init flag', () => {
      // Write invalid JSON
      fs.writeFileSync(INIT_FLAG, 'invalid json content');

      const state = loadInitializationState();
      expect(state).toBeNull();
    });

    it('should return null for corrupted init flag file', () => {
      // Write partial JSON
      fs.writeFileSync(INIT_FLAG, '{"config": {');

      const state = loadInitializationState();
      expect(state).toBeNull();
    });
  });

  describe('saveInitializationState', () => {
    it('should save state to init flag file', () => {
      const config: InitConfig = {
        repoName: 'test-repo',
        repoOwner: 'test-owner',
        repoUrl: 'https://github.com/test-owner/test-repo.git',
        author: 'Test Author',
        baseRepoUrl: 'https://github.com/test-owner/test-repo',
        orgName: '@test-org',
      };

      const completedTasks = ['task1', 'task2', 'task3'];

      saveInitializationState(config, completedTasks, false);

      expect(fs.existsSync(INIT_FLAG)).toBe(true);

      const content = fs.readFileSync(INIT_FLAG, 'utf-8');
      const state = JSON.parse(content);

      expect(state.config.repoName).toBe('test-repo');
      expect(state.completedTasks).toEqual(completedTasks);
      expect(state.version).toBeDefined();
      expect(state.initializedAt).toBeDefined();
    });

    it('should not save state in dry run mode', () => {
      const config: InitConfig = {
        repoName: 'test-repo',
        repoOwner: 'test-owner',
        repoUrl: 'https://github.com/test-owner/test-repo.git',
        author: 'Test Author',
        baseRepoUrl: 'https://github.com/test-owner/test-repo',
        orgName: '@test-org',
      };

      // Ensure file doesn't exist before test
      if (fs.existsSync(INIT_FLAG)) {
        fs.unlinkSync(INIT_FLAG);
      }

      saveInitializationState(config, ['task1'], true);

      expect(fs.existsSync(INIT_FLAG)).toBe(false);
    });

    it('should save valid timestamp', () => {
      const config: InitConfig = {
        repoName: 'test-repo',
        repoOwner: 'test-owner',
        repoUrl: 'https://github.com/test-owner/test-repo.git',
        author: 'Test Author',
        baseRepoUrl: 'https://github.com/test-owner/test-repo',
        orgName: '@test-org',
      };

      const before = new Date().toISOString();
      saveInitializationState(config, [], false);
      const after = new Date().toISOString();

      const content = fs.readFileSync(INIT_FLAG, 'utf-8');
      const state = JSON.parse(content);

      expect(state.initializedAt).toBeDefined();
      expect(state.initializedAt >= before).toBe(true);
      expect(state.initializedAt <= after).toBe(true);
    });

    it('should overwrite existing state', () => {
      const config1: InitConfig = {
        repoName: 'old-repo',
        repoOwner: 'old-owner',
        repoUrl: 'https://github.com/old-owner/old-repo.git',
        author: 'Old Author',
        baseRepoUrl: 'https://github.com/old-owner/old-repo',
        orgName: '@old-org',
      };

      saveInitializationState(config1, ['task1'], false);

      const config2: InitConfig = {
        repoName: 'new-repo',
        repoOwner: 'new-owner',
        repoUrl: 'https://github.com/new-owner/new-repo.git',
        author: 'New Author',
        baseRepoUrl: 'https://github.com/new-owner/new-repo',
        orgName: '@new-org',
      };

      saveInitializationState(config2, ['task2', 'task3'], false);

      const content = fs.readFileSync(INIT_FLAG, 'utf-8');
      const state = JSON.parse(content);

      expect(state.config.repoName).toBe('new-repo');
      expect(state.completedTasks).toEqual(['task2', 'task3']);
    });

    it('should save empty completed tasks array', () => {
      const config: InitConfig = {
        repoName: 'test-repo',
        repoOwner: 'test-owner',
        repoUrl: 'https://github.com/test-owner/test-repo.git',
        author: 'Test Author',
        baseRepoUrl: 'https://github.com/test-owner/test-repo',
        orgName: '@test-org',
      };

      saveInitializationState(config, [], false);

      const content = fs.readFileSync(INIT_FLAG, 'utf-8');
      const state = JSON.parse(content);

      expect(state.completedTasks).toEqual([]);
    });
  });

  describe('round-trip (save and load)', () => {
    it('should be able to load what was saved', () => {
      const config: InitConfig = {
        repoName: 'round-trip-repo',
        repoOwner: 'round-trip-owner',
        repoUrl: 'https://github.com/round-trip-owner/round-trip-repo.git',
        author: 'Round Trip Author',
        baseRepoUrl: 'https://github.com/round-trip-owner/round-trip-repo',
        orgName: '@round-trip',
      };

      const completedTasks = ['init', 'config', 'finalize'];

      saveInitializationState(config, completedTasks, false);

      const loadedState = loadInitializationState();

      expect(loadedState).not.toBeNull();
      expect(loadedState?.config).toEqual(config);
      expect(loadedState?.completedTasks).toEqual(completedTasks);
      expect(loadedState?.initializedAt).toBeDefined();
    });
  });
});
