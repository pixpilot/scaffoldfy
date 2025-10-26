/**
 * Configuration and config-related error classes
 *
 * These errors are primarily used when loading and processing configuration files,
 * and can also be used for config file operations.
 */

import { ScaffoldfyError } from './base.js';

/**
 * Error thrown when a configuration or config file cannot be found or accessed
 */
export class ConfigurationFileNotFoundError extends ScaffoldfyError {
  constructor(
    message: string,
    public readonly filePath: string,
  ) {
    super(message, 'CONFIG_FILE_NOT_FOUND');
    this.name = 'ConfigFileNotFoundError';
  }

  /**
   * Create a configuration or config file not found error
   */
  static forPath(filePath: string): ConfigurationFileNotFoundError {
    return new ConfigurationFileNotFoundError(
      `Configuration file not found: ${filePath}`,
      filePath,
    );
  }
}

/**
 * Error thrown when configuration or config file resolution fails
 */
export class ConfigurationResolutionError extends ScaffoldfyError {
  constructor(
    message: string,
    public readonly templateFilePath: string,
    public readonly sourceUrl?: string,
  ) {
    super(message, 'CONFIG_RESOLUTION_ERROR');
    this.name = 'ConfigResolutionError';
  }

  /**
   * Create a configuration file resolution error for remote configurations
   */
  static forRemoteConfig(
    configFilePath: string,
    sourceUrl: string,
  ): ConfigurationResolutionError {
    return new ConfigurationResolutionError(
      `Failed to resolve configuration "${configFilePath}" relative to remote configuration "${sourceUrl}"`,
      configFilePath,
      sourceUrl,
    );
  }
}

/**
 * Error thrown when fetching a remote configuration or config fails
 */
export class ConfigFetchError extends ScaffoldfyError {
  constructor(
    message: string,
    public readonly url: string,
    public readonly originalError?: Error,
  ) {
    super(message, 'CONFIG_FETCH_ERROR');
    this.name = 'ConfigFetchError';
  }

  /**
   * Create a configuration or config fetch error
   */
  static forUrl(url: string, status?: number, statusText?: string): ConfigFetchError;
  static forUrl(url: string, originalError?: Error): ConfigFetchError;
  static forUrl(
    url: string,
    errorOrStatus?: Error | number,
    statusText?: string,
  ): ConfigFetchError {
    if (typeof errorOrStatus === 'number') {
      const statusTextStr = statusText ?? '';
      return new ConfigFetchError(
        `Failed to fetch configuration from ${url}: ${errorOrStatus} ${statusTextStr}`.trim(),
        url,
      );
    }
    const errorMessage =
      errorOrStatus?.message ?? String(errorOrStatus ?? 'Unknown error');
    return new ConfigFetchError(
      `Failed to fetch configuration from ${url}: ${errorMessage}`,
      url,
      errorOrStatus,
    );
  }
}

/**
 * Error thrown when parsing a configuration or config file fails
 */
export class ConfigParseError extends ScaffoldfyError {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly originalError?: Error,
  ) {
    super(message, 'CONFIG_PARSE_ERROR');
    this.name = 'ConfigParseError';
  }

  /**
   * Create a configuration or config parse error
   */
  static forFile(filePath: string, originalError: Error): ConfigParseError {
    return new ConfigParseError(
      `Failed to parse configuration file ${filePath}: ${originalError.message}`,
      filePath,
      originalError,
    );
  }
}

/**
 * Error thrown when configuration or config file structure is invalid
 */
export class InvalidConfigError extends ScaffoldfyError {
  constructor(
    message: string,
    public readonly filePath: string,
  ) {
    super(message, 'INVALID_CONFIG');
    this.name = 'InvalidConfigError';
  }

  /**
   * Create an invalid configuration error
   */
  static forFile(filePath: string, reason: string): InvalidConfigError {
    return new InvalidConfigError(
      `Invalid configuration file ${filePath}: ${reason}`,
      filePath,
    );
  }

  /**
   * Create an invalid configuration error for tasks not being an array
   */
  static tasksNotArray(filePath: string): InvalidConfigError {
    return new InvalidConfigError(
      `Invalid configuration file ${filePath}: 'tasks' must be an array if provided`,
      filePath,
    );
  }

  /**
   * Create an invalid configuration error for missing required name field
   */
  static missingName(filePath: string): InvalidConfigError {
    return new InvalidConfigError(
      `Invalid configuration file ${filePath}: 'name' field is required`,
      filePath,
    );
  }

  /**
   * Create an invalid configuration error for invalid name format
   */
  static invalidNameFormat(filePath: string, name: string): InvalidConfigError {
    return new InvalidConfigError(
      `Invalid configuration file ${filePath}: 'name' field "${name}" must contain only lowercase letters, digits, and hyphens. It cannot start or end with a hyphen, and cannot contain consecutive hyphens.`,
      filePath,
    );
  }
}
