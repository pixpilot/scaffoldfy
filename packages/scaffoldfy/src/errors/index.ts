/**
 * Custom error classes for Scaffoldfy
 */

// Base errors
export { CircularDependencyError, ScaffoldfyError } from './base';

// Template errors
export {
  ConfigFetchError,
  ConfigParseError,
  ConfigurationFileNotFoundError,
  ConfigurationResolutionError,
  InvalidConfigError,
} from './config';

// ID errors
export { DuplicateIdError, IdConflictError } from './id';

// Other errors
export {
  PluginConfigurationError,
  PromptValidationError,
  TaskNotFoundError,
} from './other';
