/**
 * Task Types and Interfaces for Template Initialization
 */

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
 */
export type DefaultValueType = 'static' | 'exec';

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
 */
export type DefaultValue<T = string | number | boolean> = T | DefaultValueConfig<T>;

export interface BasePrompt {
  id: string; // Unique identifier for the prompt value
  type: PromptType;
  message: string;
  required?: boolean; // If true, value must be provided (not empty)
  global?: boolean; // If true, this prompt value is available to all tasks (not just the current task)
}

export interface InputPrompt extends BasePrompt {
  type: 'input' | 'password';
  default?: DefaultValue<string>;
  placeholder?: string;
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
 */
export interface VariableDefinition {
  id: string; // Unique identifier for the variable
  value: DefaultValue; // The value of the variable (static or executable)
  global?: boolean; // If true, this variable is available to all tasks (not just the current task)
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
  | 'template'
  | 'regex-replace'
  | 'replace-in-file'
  | 'delete'
  | 'rename'
  | 'git-init'
  | 'exec';

export interface RollbackConfig {
  type: TaskType;
  config: unknown;
}

export interface TaskDefinition {
  id: string;
  name: string;
  description: string;
  required: boolean;
  enabled: boolean;
  type: TaskType;
  // Task-specific configuration object, validated at runtime
  config:
    | UpdateJsonConfig
    | TemplateConfig
    | RegexReplaceConfig
    | ReplaceInFileConfig
    | DeleteConfig
    | RenameConfig
    | GitInitConfig
    | ExecConfig
    | Record<string, unknown>;
  dependencies?: string[]; // IDs of tasks that must run before this one
  rollback?: RollbackConfig; // How to rollback if something fails
  prompts?: PromptDefinition[]; // Optional prompts to collect before running task
  variables?: VariableDefinition[]; // Optional variables to define for the task (no user interaction required)
}

export interface UpdateJsonConfig {
  file: string;
  updates: Record<string, unknown>;
  condition?: ConditionExpression;
}

export interface TemplateConfig {
  file: string;
  template?: string; // Inline template string (supports simple {{variable}} syntax)
  templateFile?: string; // Path to external template file (relative to project root). .hbs files use Handlebars automatically
  condition?: ConditionExpression;
}

export interface RegexReplaceConfig {
  file: string;
  pattern: string;
  flags?: string;
  replacement: string;
  condition?: ConditionExpression;
}

export interface ReplaceInFileConfig {
  file: string;
  replacements: Array<{
    find: string;
    replace: string;
  }>;
  condition?: ConditionExpression;
}

export interface DeleteConfig {
  paths: string[];
  condition?: ConditionExpression;
}

export interface RenameConfig {
  from: string;
  to: string;
  condition?: ConditionExpression;
}

export interface GitInitConfig {
  removeExisting: boolean;
  initialCommit: boolean;
  message?: string;
  condition?: ConditionExpression;
}

export interface ExecConfig {
  command: string;
  cwd?: string;
  condition?: ConditionExpression;
}

export interface InitializationMetadata {
  initializedAt: string;
  config: InitConfig;
  completedTasks: string[];
  version: string;
}

/**
 * Configuration file structure for template tasks
 */
export interface TasksConfiguration {
  extends?: string | string[]; // Path(s) or URL(s) to base template file(s) to inherit from
  variables?: VariableDefinition[]; // Optional global variables available to all tasks
  tasks: TaskDefinition[];
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
