/**
 * Template-related error classes
 */

import { ScaffoldfyError } from './base.js';

/**
 * Error thrown when a template file cannot be found or accessed
 */
export class TemplateFileNotFoundError extends ScaffoldfyError {
  constructor(
    message: string,
    public readonly filePath: string,
  ) {
    super(message, 'TEMPLATE_FILE_NOT_FOUND');
    this.name = 'TemplateFileNotFoundError';
  }

  /**
   * Create a template file not found error
   */
  static forPath(filePath: string): TemplateFileNotFoundError {
    return new TemplateFileNotFoundError(
      `Template file not found: ${filePath}`,
      filePath,
    );
  }
}

/**
 * Error thrown when template resolution fails
 */
export class TemplateResolutionError extends ScaffoldfyError {
  constructor(
    message: string,
    public readonly templateFilePath: string,
    public readonly sourceUrl?: string,
  ) {
    super(message, 'TEMPLATE_RESOLUTION_ERROR');
    this.name = 'TemplateResolutionError';
  }

  /**
   * Create a template resolution error for remote templates
   */
  static forRemoteTemplate(
    templateFilePath: string,
    sourceUrl: string,
  ): TemplateResolutionError {
    return new TemplateResolutionError(
      `Failed to resolve templateFile "${templateFilePath}" relative to remote template "${sourceUrl}"`,
      templateFilePath,
      sourceUrl,
    );
  }
}

/**
 * Error thrown when fetching a remote template fails
 */
export class TemplateFetchError extends ScaffoldfyError {
  constructor(
    message: string,
    public readonly url: string,
    public readonly originalError?: Error,
  ) {
    super(message, 'TEMPLATE_FETCH_ERROR');
    this.name = 'TemplateFetchError';
  }

  /**
   * Create a template fetch error
   */
  static forUrl(url: string, status?: number, statusText?: string): TemplateFetchError;
  static forUrl(url: string, originalError?: Error): TemplateFetchError;
  static forUrl(
    url: string,
    errorOrStatus?: Error | number,
    statusText?: string,
  ): TemplateFetchError {
    if (typeof errorOrStatus === 'number') {
      const statusTextStr = statusText ?? '';
      return new TemplateFetchError(
        `Failed to fetch template from ${url}: ${errorOrStatus} ${statusTextStr}`.trim(),
        url,
      );
    }
    const errorMessage =
      errorOrStatus?.message ?? String(errorOrStatus ?? 'Unknown error');
    return new TemplateFetchError(
      `Failed to fetch template from ${url}: ${errorMessage}`,
      url,
      errorOrStatus,
    );
  }
}

/**
 * Error thrown when parsing a template file fails
 */
export class TemplateParseError extends ScaffoldfyError {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly originalError?: Error,
  ) {
    super(message, 'TEMPLATE_PARSE_ERROR');
    this.name = 'TemplateParseError';
  }

  /**
   * Create a template parse error
   */
  static forFile(filePath: string, originalError: Error): TemplateParseError {
    return new TemplateParseError(
      `Failed to parse template file ${filePath}: ${originalError.message}`,
      filePath,
      originalError,
    );
  }
}

/**
 * Error thrown when template structure is invalid
 */
export class InvalidTemplateError extends ScaffoldfyError {
  constructor(
    message: string,
    public readonly filePath: string,
  ) {
    super(message, 'INVALID_TEMPLATE');
    this.name = 'InvalidTemplateError';
  }

  /**
   * Create an invalid template error
   */
  static forFile(filePath: string, reason: string): InvalidTemplateError {
    return new InvalidTemplateError(
      `Invalid template file ${filePath}: ${reason}`,
      filePath,
    );
  }

  /**
   * Create an invalid template error for tasks not being an array
   */
  static tasksNotArray(filePath: string): InvalidTemplateError {
    return new InvalidTemplateError(
      `Invalid template file ${filePath}: 'tasks' must be an array if provided`,
      filePath,
    );
  }
}
