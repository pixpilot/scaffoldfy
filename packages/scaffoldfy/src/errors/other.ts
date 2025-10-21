/**
 * Other error classes
 */

import { ScaffoldfyError } from './base.js';

/**
 * Error thrown when a task cannot be found
 */
export class TaskNotFoundError extends ScaffoldfyError {
  constructor(
    message: string,
    public readonly taskId: string,
  ) {
    super(message, 'TASK_NOT_FOUND');
    this.name = 'TaskNotFoundError';
  }

  /**
   * Create a task not found error
   */
  static forId(taskId: string): TaskNotFoundError {
    return new TaskNotFoundError(`Task not found: ${taskId}`, taskId);
  }
}

/**
 * Error thrown when prompt validation fails
 */
export class PromptValidationError extends ScaffoldfyError {
  constructor(
    message: string,
    public readonly promptId: string,
    public readonly reason: 'required' | 'unknown_type',
  ) {
    super(message, 'PROMPT_VALIDATION_ERROR');
    this.name = 'PromptValidationError';
  }

  /**
   * Create a required prompt error
   */
  static required(promptId: string): PromptValidationError {
    return new PromptValidationError(
      `Prompt "${promptId}" is required`,
      promptId,
      'required',
    );
  }

  /**
   * Create an unknown prompt type error
   */
  static unknownType(type: string): PromptValidationError {
    return new PromptValidationError(
      `Unknown prompt type: ${type}`,
      type,
      'unknown_type',
    );
  }
}

/**
 * Error thrown when plugin configuration is invalid
 */
export class PluginConfigurationError extends ScaffoldfyError {
  constructor(
    message: string,
    public readonly pluginType: string,
    public readonly configIssue?: string,
  ) {
    super(message, 'PLUGIN_CONFIGURATION_ERROR');
    this.name = 'PluginConfigurationError';
  }

  /**
   * Create a template plugin configuration error - missing template or templateFile
   */
  static templateMissingTemplateOrFile(): PluginConfigurationError {
    return new PluginConfigurationError(
      'Template task requires either "template" (inline) or "templateFile" (file path) to be specified',
      'template',
      'missing_template_or_file',
    );
  }

  /**
   * Create a template plugin configuration error - both template and templateFile specified
   */
  static templateHasBothTemplateAndFile(): PluginConfigurationError {
    return new PluginConfigurationError(
      'Template task cannot have both "template" and "templateFile" specified. Use one or the other.',
      'template',
      'both_template_and_file',
    );
  }

  /**
   * Create a create plugin configuration error - missing template or templateFile
   */
  static createMissingTemplateOrFile(): PluginConfigurationError {
    return new PluginConfigurationError(
      'Create task requires either "template" (inline) or "templateFile" (file path) to be specified',
      'create',
      'missing_template_or_file',
    );
  }

  /**
   * Create a create plugin configuration error - both template and templateFile specified
   */
  static createHasBothTemplateAndFile(): PluginConfigurationError {
    return new PluginConfigurationError(
      'Create task cannot have both "template" and "templateFile" specified. Use one or the other.',
      'create',
      'both_template_and_file',
    );
  }
}
