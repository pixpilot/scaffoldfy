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
 * - 'value': Static value
 * - 'execute': Execute a command to get the value
 */
export type DefaultValueType = 'value' | 'execute';

/**
 * Default value configuration for prompts
 */
export interface DefaultValueConfig<T = string | number | boolean> {
  type: DefaultValueType;
  value: T | string; // For 'value' type: the static value; For 'execute' type: the command to execute
}

/**
 * Type for default values that can be either static or executable
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
  config: unknown; // Allow any config, checked at runtime
  dependencies?: string[]; // IDs of tasks that must run before this one
  rollback?: RollbackConfig; // How to rollback if something fails
  prompts?: PromptDefinition[]; // Optional prompts to collect before running task
}

export interface UpdateJsonConfig {
  file: string;
  updates: Record<string, unknown>;
  condition?: string;
}

export interface TemplateConfig {
  file: string;
  template?: string; // Inline template string (supports simple {{variable}} syntax)
  templateFile?: string; // Path to external template file (relative to project root). .hbs files use Handlebars automatically
  condition?: string;
}

export interface RegexReplaceConfig {
  file: string;
  pattern: string;
  flags?: string;
  replacement: string;
  condition?: string;
}

export interface ReplaceInFileConfig {
  file: string;
  replacements: Array<{
    find: string;
    replace: string;
  }>;
  condition?: string;
}

export interface DeleteConfig {
  paths: string[];
  condition?: string;
}

export interface RenameConfig {
  from: string;
  to: string;
  condition?: string;
}

export interface GitInitConfig {
  removeExisting: boolean;
  initialCommit: boolean;
  message?: string;
  condition?: string;
}

export interface ExecConfig {
  command: string;
  cwd?: string;
  condition?: string;
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
