/**
 * Plugin Registry - Allow custom task types
 *
 * This module provides a plugin architecture for extending
 * the template initialization system with custom task types.
 */

// Re-export all functions from separate modules
export * from './hooks';
export * from './plugin-registration';
export * from './task-execution';
export * from './task-type-mapping';
export * from './utils';
