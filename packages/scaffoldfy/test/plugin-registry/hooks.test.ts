/**
 * Tests for lifecycle hooks functions
 */

import type { CurrentConfigurationContext, TaskDefinition } from '../../src/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { callHook, registerHooks } from '../../src/plugin-registry';

describe('lifecycle hooks', () => {
  beforeEach(() => {
    // Clear hooks by registering empty hooks
    registerHooks({});
  });

  afterEach(() => {
    registerHooks({});
  });

  describe('registerHooks', () => {
    it('should register beforeAll hook', async () => {
      const beforeAllFn = vi.fn();
      registerHooks({ beforeAll: beforeAllFn });

      const config: CurrentConfigurationContext = {
        repoName: 'test',
        repoOwner: 'owner',
        repoUrl: 'url',
        author: 'author',
        baseRepoUrl: 'base',
        orgName: 'org',
      };

      await callHook('beforeAll', config);

      expect(beforeAllFn).toHaveBeenCalledWith(config);
    });

    it('should register afterAll hook', async () => {
      const afterAllFn = vi.fn();
      registerHooks({ afterAll: afterAllFn });

      const config: CurrentConfigurationContext = {
        repoName: 'test',
        repoOwner: 'owner',
        repoUrl: 'url',
        author: 'author',
        baseRepoUrl: 'base',
        orgName: 'org',
      };

      await callHook('afterAll', config);

      expect(afterAllFn).toHaveBeenCalledWith(config);
    });

    it('should register beforeTask hook', async () => {
      const beforeTaskFn = vi.fn();
      registerHooks({ beforeTask: beforeTaskFn });

      const task: TaskDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        required: true,
        enabled: true,
        type: 'write',
        config: {},
      };

      const config: CurrentConfigurationContext = {
        repoName: 'test',
        repoOwner: 'owner',
        repoUrl: 'url',
        author: 'author',
        baseRepoUrl: 'base',
        orgName: 'org',
      };

      await callHook('beforeTask', task, config);

      expect(beforeTaskFn).toHaveBeenCalledWith(task, config);
    });

    it('should register afterTask hook', async () => {
      const afterTaskFn = vi.fn();
      registerHooks({ afterTask: afterTaskFn });

      const task: TaskDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        required: true,
        enabled: true,
        type: 'write',
        config: {},
      };

      const config: CurrentConfigurationContext = {
        repoName: 'test',
        repoOwner: 'owner',
        repoUrl: 'url',
        author: 'author',
        baseRepoUrl: 'base',
        orgName: 'org',
      };

      await callHook('afterTask', task, config);

      expect(afterTaskFn).toHaveBeenCalledWith(task, config);
    });

    it('should register onError hook', async () => {
      const onErrorFn = vi.fn();
      registerHooks({ onError: onErrorFn });

      const error = new Error('Test error');
      const task: TaskDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        required: true,
        enabled: true,
        type: 'write',
        config: {},
      };

      await callHook('onError', error, task);

      expect(onErrorFn).toHaveBeenCalledWith(error, task);
    });

    it('should register multiple hooks', async () => {
      const beforeAllFn = vi.fn();
      const afterAllFn = vi.fn();
      const beforeTaskFn = vi.fn();
      const afterTaskFn = vi.fn();
      const onErrorFn = vi.fn();

      registerHooks({
        beforeAll: beforeAllFn,
        afterAll: afterAllFn,
        beforeTask: beforeTaskFn,
        afterTask: afterTaskFn,
        onError: onErrorFn,
      });

      const config: CurrentConfigurationContext = {
        repoName: 'test',
        repoOwner: 'owner',
        repoUrl: 'url',
        author: 'author',
        baseRepoUrl: 'base',
        orgName: 'org',
      };

      const task: TaskDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        required: true,
        enabled: true,
        type: 'write',
        config: {},
      };

      const error = new Error('Test error');

      await callHook('beforeAll', config);
      await callHook('afterAll', config);
      await callHook('beforeTask', task, config);
      await callHook('afterTask', task, config);
      await callHook('onError', error, task);

      expect(beforeAllFn).toHaveBeenCalledWith(config);
      expect(afterAllFn).toHaveBeenCalledWith(config);
      expect(beforeTaskFn).toHaveBeenCalledWith(task, config);
      expect(afterTaskFn).toHaveBeenCalledWith(task, config);
      expect(onErrorFn).toHaveBeenCalledWith(error, task);
    });
  });

  describe('callHook', () => {
    it('should call beforeAll hook', async () => {
      const beforeAllFn = vi.fn();
      registerHooks({ beforeAll: beforeAllFn });

      const config: CurrentConfigurationContext = {
        repoName: 'test',
        repoOwner: 'owner',
        repoUrl: 'url',
        author: 'author',
        baseRepoUrl: 'base',
        orgName: 'org',
      };

      await callHook('beforeAll', config);

      expect(beforeAllFn).toHaveBeenCalledWith(config);
    });

    it('should call beforeTask hook', async () => {
      const beforeTaskFn = vi.fn();
      registerHooks({ beforeTask: beforeTaskFn });

      const task: TaskDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        required: true,
        enabled: true,
        type: 'write',
        config: {},
      };

      const config: CurrentConfigurationContext = {
        repoName: 'test',
        repoOwner: 'owner',
        repoUrl: 'url',
        author: 'author',
        baseRepoUrl: 'base',
        orgName: 'org',
      };

      await callHook('beforeTask', task, config);

      expect(beforeTaskFn).toHaveBeenCalledWith(task, config);
    });

    it('should call onError hook', async () => {
      const onErrorFn = vi.fn();
      registerHooks({ onError: onErrorFn });

      const error = new Error('Test error');
      const task: TaskDefinition = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        required: true,
        enabled: true,
        type: 'write',
        config: {},
      };

      await callHook('onError', error, task);

      expect(onErrorFn).toHaveBeenCalledWith(error, task);
    });

    it('should handle hooks that throw errors', async () => {
      const errorThrowingHook = vi.fn().mockRejectedValue(new Error('Hook error'));
      registerHooks({ beforeAll: errorThrowingHook });

      const config: CurrentConfigurationContext = {
        repoName: 'test',
        repoOwner: 'owner',
        repoUrl: 'url',
        author: 'author',
        baseRepoUrl: 'base',
        orgName: 'org',
      };

      // Should not throw
      await expect(callHook('beforeAll', config)).resolves.toBeUndefined();
    });

    it('should do nothing when no hook is registered', async () => {
      const config: CurrentConfigurationContext = {
        repoName: 'test',
        repoOwner: 'owner',
        repoUrl: 'url',
        author: 'author',
        baseRepoUrl: 'base',
        orgName: 'org',
      };

      // Should not throw
      await expect(callHook('beforeAll', config)).resolves.toBeUndefined();
    });
  });
});
