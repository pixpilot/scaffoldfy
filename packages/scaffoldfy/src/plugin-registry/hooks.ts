import type { InitConfig, PluginHooks, TaskDefinition } from '../types';
import { log } from '../utils';
import { hooksRegistry } from './registries';

/**
 * Register global lifecycle hooks
 * @param hooks - Hook functions to register
 */
export function registerHooks(hooks: Partial<PluginHooks>): void {
  if (hooks.beforeAll != null) {
    hooksRegistry.beforeAll = hooks.beforeAll;
  }
  if (hooks.afterAll != null) {
    hooksRegistry.afterAll = hooks.afterAll;
  }
  if (hooks.beforeTask != null) {
    hooksRegistry.beforeTask = hooks.beforeTask;
  }
  if (hooks.afterTask != null) {
    hooksRegistry.afterTask = hooks.afterTask;
  }
  if (hooks.onError != null) {
    hooksRegistry.onError = hooks.onError;
  }
}

/**
 * Call a lifecycle hook
 * @param hookName - Name of the hook
 * @param config - Initialization config for beforeAll/afterAll
 */
export async function callHook(
  hookName: 'beforeAll' | 'afterAll',
  config: InitConfig,
): Promise<void>;
/**
 * Call a lifecycle hook
 * @param hookName - Name of the hook
 * @param task - Task definition for beforeTask/afterTask
 * @param config - Initialization config
 */
export async function callHook(
  hookName: 'beforeTask' | 'afterTask',
  task: TaskDefinition,
  config: InitConfig,
): Promise<void>;
/**
 * Call a lifecycle hook
 * @param hookName - Name of the hook
 * @param error - Error that occurred
 * @param task - Optional task definition
 */
export async function callHook(
  hookName: 'onError',
  error: Error,
  task?: TaskDefinition,
): Promise<void>;
/**
 * Call a lifecycle hook (implementation)
 * @param hookName - Name of the hook
 * @param args - Additional arguments for the hook
 */
export async function callHook(
  hookName: keyof PluginHooks,
  ...args: unknown[]
): Promise<void> {
  const hook = hooksRegistry[hookName];
  if (hook == null) {
    return;
  }

  try {
    if (hookName === 'beforeAll' || hookName === 'afterAll') {
      await (hook as (config: InitConfig) => Promise<void>)(args[0] as InitConfig);
    } else if (hookName === 'beforeTask' || hookName === 'afterTask') {
      await (hook as (task: TaskDefinition, config: InitConfig) => Promise<void>)(
        args[0] as TaskDefinition,
        args[1] as InitConfig,
      );
    } else if (hookName === 'onError') {
      await (hook as (error: Error, task?: TaskDefinition) => Promise<void>)(
        args[0] as Error,
        args[1] as TaskDefinition | undefined,
      );
    }
  } catch (error) {
    log(
      `Error in ${hookName} hook: ${
        error instanceof Error ? error.message : String(error)
      }`,
      'error',
    );
  }
}
