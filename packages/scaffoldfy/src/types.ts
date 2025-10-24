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
 */
export type DefaultValueType = 'static' | 'exec' | 'conditional';

/**
 * Conditional default value configuration
 * Evaluates a condition and returns different values based on the result
 */
export interface ConditionalDefaultConfig<T = string | number | boolean> {
  type: 'conditional';
  condition: string; // JavaScript expression to evaluate
  ifTrue: T | string; // Value if condition is true (can be a template string with {{variables}})
  ifFalse: T | string; // Value if condition is false (can be a template string with {{variables}})
}

/**
 * Default value configuration for prompts
 */
export interface DefaultValueConfig<T = string | number | boolean> {
  type: DefaultValueType;
  value: T | string; // For 'static' type: the static value; For 'exec' type: the command to execute
}

/**
 * Type for default values that can be either static or executable.
 * - For simple static values, pass the value directly (e.g., "default-name", 42, true)
 * - For executable defaults, use { type: 'exec', value: 'command' }
 * - For explicit static values, use { type: 'static', value: yourValue }
 * - For conditional defaults, use { type: 'conditional', condition: 'expression', ifTrue: value, ifFalse: value }
 */
export type DefaultValue<T = string | number | boolean> =
  | T
  | DefaultValueConfig<T>
  | ConditionalDefaultConfig<T>;

/**
 * Conditional enabled configuration for prompts and tasks
 * Allows dynamic enabling/disabling based on runtime conditions
 */
export interface ConditionalEnabled {
  condition: ConditionExpression; // JavaScript expression evaluated at runtime
}

/**
 * Executable enabled configuration
 * Determines enabled state by executing a shell command
 */
export interface ExecutableEnabled {
  type: 'exec';
  value: string; // Shell command to execute
}

/**
 * Type for enabled field that can be boolean, string condition, conditional object, or executable
 * - boolean: Simple true/false
 * - string: JavaScript expression to evaluate (shorthand for { condition: "..." })
 * - ConditionalEnabled: Object with condition property
 * - ExecutableEnabled: Object with type='exec' and value=command
 */
export type EnabledValue = boolean | string | ConditionalEnabled | ExecutableEnabled;

export interface BasePrompt {
  id: string; // Unique identifier for the prompt value
  type: PromptType;
  message: string;
  required?: boolean; // If true, value must be provided (not empty)
  enabled?: EnabledValue; // If false or condition evaluates to false, prompt is skipped
  override?: MergeStrategy; // Strategy for merging with base prompt: 'merge' (default, intelligent) or 'replace' (complete override)
  $templateEnabled?: EnabledValue; // Internal: Enabled condition of the template this prompt came from (for lazy evaluation)
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
  override?: MergeStrategy; // Strategy for merging with base variable: 'merge' (default, intelligent) or 'replace' (complete override)
  $templateEnabled?: EnabledValue; // Internal: Enabled condition of the template this variable came from (for lazy evaluation)
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
  required?: boolean; // Optional: Whether failure of this task should stop the process (defaults to true)
  enabled?: EnabledValue; // Optional: Can be boolean or conditional expression (defaults to true)
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
  prompts?: PromptDefinition[]; // Optional task-scoped prompts to collect before running task
  variables?: VariableDefinition[]; // Optional task-scoped variables (not available to other tasks)
  override?: MergeStrategy; // Strategy for merging with base task: 'merge' (default, intelligent) or 'replace' (complete override)
  $sourceUrl?: string; // Internal: URL or path of the template file this task came from (for resolving relative paths)
  $templateEnabled?: EnabledValue; // Internal: Enabled condition of the template this task came from (for lazy evaluation)
}

/**
 * Configuration file structure for template tasks
 */
export interface TasksConfiguration {
  name: string; // Human-readable name for this template
  description?: string; // Optional detailed description of what this template does
  enabled?: EnabledValue; // Optional: whether this entire template should be executed (defaults to true)
  dependencies?: string[]; // Optional: Names or identifiers of other templates this template depends on
  extends?: string | string[]; // Path(s) or URL(s) to base template file(s) to inherit from
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
