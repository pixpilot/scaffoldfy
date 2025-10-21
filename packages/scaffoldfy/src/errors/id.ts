/**
 * ID-related error classes
 */

import { ScaffoldfyError } from './base.js';

/**
 * Error thrown when duplicate IDs are found
 */
export class DuplicateIdError extends ScaffoldfyError {
  constructor(
    message: string,
    public readonly id: string,
    public readonly type: 'task' | 'variable' | 'prompt',
    public readonly existingType?: string,
  ) {
    super(message, 'DUPLICATE_ID');
    this.name = 'DuplicateIdError';
  }

  /**
   * Create a duplicate ID error
   */
  static forId(
    id: string,
    type: 'task' | 'variable' | 'prompt',
    existingType?: string,
  ): DuplicateIdError {
    const existingTypeStr = existingType ?? 'unknown';
    const message = `Duplicate ID "${id}" found in ${type}. This ID is already used in ${existingTypeStr}`;

    return new DuplicateIdError(message, id, type, existingType);
  }
}

/**
 * Error thrown when ID conflicts occur during merging
 */
export class IdConflictError extends ScaffoldfyError {
  constructor(
    message: string,
    public readonly id: string,
    public readonly type: 'task' | 'variable' | 'prompt',
    public readonly baseSource?: string,
    public readonly overrideSource?: string,
  ) {
    super(message, 'ID_CONFLICT');
    this.name = 'IdConflictError';
  }

  /**
   * Create an ID conflict error for tasks
   */
  static forTask(
    id: string,
    baseSource?: string,
    overrideSource?: string,
  ): IdConflictError {
    const baseSourceStr = baseSource ?? 'unknown';
    const overrideSourceStr = overrideSource ?? 'unknown';
    const message =
      `Task ID conflict: "${id}" is defined in multiple templates.\n` +
      `  Base task from: ${baseSourceStr}\n` +
      `  Override task from: ${overrideSourceStr}\n` +
      `  You must specify an override strategy: add "override": "merge" or "override": "replace" to the task.\n` +
      `  Task is being extended/overridden but no override strategy was specified.`;

    return new IdConflictError(message, id, 'task', baseSource, overrideSource);
  }

  /**
   * Create an ID conflict error for variables
   */
  static forVariable(id: string): IdConflictError {
    const message =
      `Variable ID conflict: "${id}" is defined in multiple templates.\n` +
      `  You must specify an override strategy: add "override": "merge" or "override": "replace" to the variable.\n` +
      `  Variable is being extended/overridden but no override strategy was specified.`;

    return new IdConflictError(message, id, 'variable');
  }

  /**
   * Create an ID conflict error for prompts
   */
  static forPrompt(id: string): IdConflictError {
    const message =
      `Prompt ID conflict: "${id}" is defined in multiple templates.\n` +
      `  You must specify an override strategy: add "override": "merge" or "override": "replace" to the prompt.\n` +
      `  Prompt is being extended/overridden but no override strategy was specified.`;

    return new IdConflictError(message, id, 'prompt');
  }
}
