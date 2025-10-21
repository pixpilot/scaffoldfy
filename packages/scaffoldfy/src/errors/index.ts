/**
 * Custom error classes for Scaffoldfy
 */

// Base errors
export { CircularDependencyError, ScaffoldfyError } from './base.js';

// ID errors
export { DuplicateIdError, IdConflictError } from './id.js';

// Other errors
export {
  PluginConfigurationError,
  PromptValidationError,
  TaskNotFoundError,
} from './other.js';

// Template errors
export {
  InvalidTemplateError,
  TemplateFetchError,
  TemplateFileNotFoundError,
  TemplateParseError,
  TemplateResolutionError,
} from './template.js';
