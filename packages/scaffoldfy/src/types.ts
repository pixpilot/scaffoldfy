/**
 * Task Types and Interfaces for Template Automation
 */

// Import and re-export config types from plugins
import type { AppendConfig } from './plugins/append/types.js';
import type { CopyConfig } from './plugins/copy/types.js';
import type { CreateConfig } from './plugins/create/types.js';
import type { DeleteConfig } from './plugins/delete/types.js';
import type { ExecConfig } from './plugins/exec/types.js';
import type { GitInitConfig } from './plugins/git-init/types.js';
import type { MkdirConfig } from './plugins/mkdir/types.js';
import type { MoveConfig } from './plugins/move/types.js';
import type { RegexReplaceConfig } from './plugins/regex-replace/types.js';
import type { RenameConfig } from './plugins/rename/types.js';
import type { ReplaceInFileConfig } from './plugins/replace-in-file/types.js';
import type { UpdateJsonConfig } from './plugins/update-json/types.js';
import type { WriteConfig } from './plugins/write/types.js';

export type {
  AppendConfig,
  CopyConfig,
  CreateConfig,
  DeleteConfig,
  ExecConfig,
  GitInitConfig,
  MkdirConfig,
  MoveConfig,
  RegexReplaceConfig,
  RenameConfig,
  ReplaceInFileConfig,
  UpdateJsonConfig,
  WriteConfig,
};

export interface InitConfig {
  // Dynamic properties from prompts
  [key: string]: unknown;
}

/**
 * Prompt type definitions for task-embedded prompts
 */
export type PromptType = 'input' | 'select' | 'confirm' | 'password' | 'number';

/**
 * Default value types for prompts
 * - 'static': Static value provided directly
 * - 'exec': Execute a command to get the value dynamically
 * - 'conditional': Choose value based on a condition
 * - 'interpolate': Reference string with {{variable}} placeholders that will be interpolated with previously resolved prompts/variables
 */
export type DefaultValueType = 'static' | 'exec' | 'conditional' | 'interpolate';

/**
 * Conditional default value configuration
 * Evaluates a condition and returns different values based on the result
 */
export interface ConditionalDefaultConfig<T = string | number | boolean> {
  type: 'conditional';
  condition: string; // JavaScript expression to evaluate
  ifTrue: T | DefaultValueConfig<T>; // Value if condition is true (for interpolation, use { type: 'interpolate', value: '{{variable}}' })
  ifFalse: T | DefaultValueConfig<T>; // Value if condition is false (for interpolation, use { type: 'interpolate', value: '{{variable}}' })
}

/**
 * Default value configuration for prompts
 */
export interface DefaultValueConfig<T = string | number | boolean> {
  type: DefaultValueType;
  value: T | string; // For 'static' type: the static value; For 'exec' type: the command to execute; For 'interpolate' type: string with {{variable}} placeholders
}

/**
 * Type for default values that can be either static or executable.
 * - For simple static values, pass the value directly (e.g., "default-name", 42, true)
 * - For executable defaults, use { type: 'exec', value: 'command' }
 * - For explicit static values, use { type: 'static', value: yourValue }
 * - For conditional defaults, use { type: 'conditional', condition: 'expression', ifTrue: value, ifFalse: value }
 * - For interpolate strings, use { type: 'interpolate', value: '{{variable}}' } (will be interpolated with previously resolved prompts/variables)
 */
export type DefaultValue<T = string | number | boolean> =
  | T
  | DefaultValueConfig<T>
  | ConditionalDefaultConfig<T>;

/**
 * Conditional enabled/required configuration with new structure
 * Evaluates a JavaScript expression at runtime
 */
export interface ConditionalConfig {
  type: 'condition';
  value: string; // JavaScript expression evaluated at runtime
}

/**
 * Executable enabled/required configuration with new structure
 * Determines state by executing a shell command
 */
export interface ExecutableConfig {
  type: 'exec';
  value: string; // Shell command to execute
}

/**
 * @deprecated Old conditional enabled configuration. For backwards compatibility.
 */
export interface ConditionalEnabled {
  condition: ConditionExpression;
}

/**
 * @deprecated Old executable enabled configuration. For backwards compatibility.
 */
export interface ExecutableEnabled {
  type: 'exec';
  value: string;
}

/**
 * Type for enabled/required field with consistent object structure
 * Supports both new and old formats for backwards compatibility
 *
 * New format (recommended):
 * - boolean: Simple true/false
 * - ConditionalConfig: Object with type='condition' and value=expression
 * - ExecutableConfig: Object with type='exec' and value=command
 *
 * Old format (deprecated but supported):
 * - string: JavaScript expression (shorthand)
 * - ConditionalEnabled: Object with condition property
 */
export type DynamicBooleanValue =
  | boolean
  | string
  | ConditionalConfig
  | ExecutableConfig
  | ConditionalEnabled;

/**
 * @deprecated Use DynamicBooleanValue instead. Kept for backwards compatibility.
 */
export type EnabledValue = DynamicBooleanValue;

export interface BasePrompt {
  id: string; // Unique identifier for the prompt value
  type: PromptType;
  message: string;
  required?: DynamicBooleanValue; // Whether value must be provided (supports boolean or dynamic evaluation)
  enabled?: DynamicBooleanValue; // Whether prompt should be shown (supports boolean or dynamic evaluation)
  override?: MergeStrategy; // Strategy for merging with base prompt: 'merge' (default, intelligent) or 'replace' (complete override)
  $templateEnabled?: DynamicBooleanValue; // Internal: Enabled condition of the template this prompt came from (for lazy evaluation)
  transformers?: string[]; // Array of transformer(s) to apply to the prompt value after input
}

export interface InputPrompt extends BasePrompt {
  type: 'input' | 'password';
  default?: DefaultValue<string>;
}

export interface NumberPrompt extends BasePrompt {
  type: 'number';
  default?: DefaultValue<number>;
  min?: number;
  max?: number;
}

export interface SelectPrompt extends BasePrompt {
  type: 'select';
  choices: Array<{ name: string; value: string | number | boolean }>;
  default?: DefaultValue<string | number | boolean>;
}

export interface ConfirmPrompt extends BasePrompt {
  type: 'confirm';
  default?: DefaultValue<boolean>;
}

export type PromptDefinition = InputPrompt | NumberPrompt | SelectPrompt | ConfirmPrompt;

/**
 * Variable value configuration for defining optional global or task-scoped variables
 * Variables are similar to prompts but don't require user input - they can have static
 * values or values resolved from executable commands
 *
 * Note: Top-level variables are always global. Task-level variables are task-scoped.
 */
export interface VariableDefinition {
  id: string; // Unique identifier for the variable
  value: DefaultValue; // The value of the variable (static or executable)
  enabled?: DynamicBooleanValue; // Whether variable should be evaluated (supports boolean or dynamic evaluation)
  required?: DynamicBooleanValue; // Whether variable value is required (supports boolean or dynamic evaluation)
  override?: MergeStrategy; // Strategy for merging with base variable: 'merge' (default, intelligent) or 'replace' (complete override)
  $templateEnabled?: DynamicBooleanValue; // Internal: Enabled condition of the template this variable came from (for lazy evaluation)
  transformers?: string[]; // Array of transformer(s) to apply to the variable value after resolution
}

/**
 * JavaScript expression evaluated at runtime to determine if a task or operation should execute.
 * Has access to all prompt values, variables, and config variables.
 * @example "useTypeScript === true"
 * @example "nodeVersion >= 16 && includeTests === true"
 * @example "packageManager === 'pnpm'"
 */
export type ConditionExpression = string;

export type TaskType =
  | 'update-json'
  | 'write'
  | 'create'
  | 'regex-replace'
  | 'replace-in-file'
  | 'delete'
  | 'rename'
  | 'git-init'
  | 'exec'
  | 'move'
  | 'copy'
  | 'append'
  | 'mkdir';

export interface RollbackConfig {
  type: TaskType;
  config: unknown;
}

/**
 * Merge strategy when extending templates
 * - 'merge': Intelligently merge with base task (default) - smart field-level merging
 * - 'replace': Completely replace base task - no merging at all
 */
export type MergeStrategy = 'merge' | 'replace';

export interface TaskDefinition {
  id: string;
  name: string;
  description?: string; // Optional description of what the task does (defaults to empty)
  required?: DynamicBooleanValue; // Whether failure of this task should stop the process (supports boolean or dynamic evaluation, defaults to true)
  enabled?: DynamicBooleanValue; // Whether task should be executed (supports boolean or dynamic evaluation, defaults to true)
  type: TaskType;
  // Task-specific configuration object, validated at runtime
  config:
    | UpdateJsonConfig
    | WriteConfig
    | CreateConfig
    | RegexReplaceConfig
    | ReplaceInFileConfig
    | DeleteConfig
    | RenameConfig
    | GitInitConfig
    | ExecConfig
    | MoveConfig
    | CopyConfig
    | AppendConfig
    | MkdirConfig
    | Record<string, unknown>;
  dependencies?: string[]; // IDs of tasks that must run before this one
  rollback?: RollbackConfig; // How to rollback if something fails
  override?: MergeStrategy; // Strategy for merging with base task: 'merge' (default, intelligent) or 'replace' (complete override)
  $sourceUrl?: string; // Internal: URL or path of the template file this task came from (for resolving relative paths)
  $templateEnabled?: DynamicBooleanValue; // Internal: Enabled condition of the template this task came from (for lazy evaluation)
}

/**
 * Configuration file structure for template tasks
 */
export interface TasksConfiguration {
  name: string; // Human-readable name for this template
  description?: string; // Optional detailed description of what this template does
  enabled?: DynamicBooleanValue; // Whether this entire template should be executed (supports boolean or dynamic evaluation, defaults to true)
  dependencies?: string[]; // Optional: Names or identifiers of other templates this template depends on
  extends?: string | string[]; // Path(s) or URL(s) to base template file(s) to inherit from
  transformers?: import('./transformers/types.js').Transformer[]; // Optional: Array of transformer definitions
  variables?: VariableDefinition[]; // Optional top-level global variables available to all tasks
  prompts?: PromptDefinition[]; // Optional top-level global prompts collected once upfront
  tasks?: TaskDefinition[]; // Optional tasks array - can be omitted when extending templates that only provide prompts/variables
}

/**
 * Plugin interface for custom task types
 */
export interface TaskPlugin {
  name: string; // Unique name for the plugin
  version?: string; // Plugin version
  taskTypes: string[]; // Task types this plugin handles
  execute: (
    task: TaskDefinition,
    config: InitConfig,
    options: { dryRun: boolean },
  ) => Promise<void>;
  getDiff?: (task: TaskDefinition, config: InitConfig) => Promise<string>;
  validate?: (task: TaskDefinition) => string[];
}

/**
 * Plugin lifecycle hooks
 */
export interface PluginHooks {
  beforeAll?: (config: InitConfig) => Promise<void>;
  afterAll?: (config: InitConfig) => Promise<void>;
  beforeTask?: (task: TaskDefinition, config: InitConfig) => Promise<void>;
  afterTask?: (task: TaskDefinition, config: InitConfig) => Promise<void>;
  onError?: (error: Error, task?: TaskDefinition) => Promise<void>;
}
