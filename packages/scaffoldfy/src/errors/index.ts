/**
 * Custom error classes for Scaffoldfy
 */

// Base errors
export { CircularDependencyError, ScaffoldfyError } from './base.js';

// Template errors
export {
  ConfigFetchError,
  ConfigParseError,
  ConfigurationFileNotFoundError,
  ConfigurationResolutionError,
  InvalidConfigError,
} from './config.js';

// ID errors
export { DuplicateIdError, IdConflictError } from './id.js';

// Other errors
export {
  PluginConfigurationError,
  PromptValidationError,
  TaskNotFoundError,
} from './other.js';
