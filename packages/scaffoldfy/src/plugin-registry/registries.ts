/**
 * Plugin Registry - Allow custom task types
 *
 * This module provides a plugin architecture for extending
 * the template initialization system with custom task types.
 */

import type { PluginHooks, TaskPlugin } from '../types';

/**
 * Registry of installed plugins
 */
export const pluginRegistry = new Map<string, TaskPlugin>();

/**
 * Registry of global hooks
 */
export const hooksRegistry: Partial<PluginHooks> = {};

/**
 * Map of task types to their plugins
 */
export const taskTypeToPlugin = new Map<string, string>();
