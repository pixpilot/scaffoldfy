/**
 * Task Types and Interfaces for Template Initialization
 */

export interface InitConfig {
  repoName: string;
  repoOwner: string;
  repoUrl: string;
  author: string;
  baseRepoUrl: string;
  defaultBundler: string;
  orgName: string;
  keepExamplePackages: boolean;
  // Dynamic properties from prompts
  [key: string]: unknown;
}

/**
 * Prompt type definitions for task-embedded prompts
 */
export type PromptType = 'input' | 'select' | 'confirm' | 'password' | 'number';

export interface BasePrompt {
  id: string; // Unique identifier for the prompt value
  type: PromptType;
  message: string;
  required?: boolean; // If true, value must be provided (not empty)
}

export interface InputPrompt extends BasePrompt {
  type: 'input' | 'password';
  default?: string;
  placeholder?: string;
}

export interface NumberPrompt extends BasePrompt {
  type: 'number';
  default?: number;
  min?: number;
  max?: number;
}

export interface SelectPrompt extends BasePrompt {
  type: 'select';
  choices: Array<{ name: string; value: string | number | boolean }>;
  default?: string | number | boolean;
}

export interface ConfirmPrompt extends BasePrompt {
  type: 'confirm';
  default?: boolean;
}

export type PromptDefinition = InputPrompt | NumberPrompt | SelectPrompt | ConfirmPrompt;

export type TaskType =
  | 'update-json'
  | 'template'
  | 'regex-replace'
  | 'replace-in-file'
  | 'delete'
  | 'conditional-delete'
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
}

export interface TemplateConfig {
  file: string;
  template: string;
}

export interface RegexReplaceConfig {
  file: string;
  pattern: string;
  flags?: string;
  replacement: string;
}

export interface ReplaceInFileConfig {
  file: string;
  replacements: Array<{
    find: string;
    replace: string;
  }>;
}

export interface DeleteConfig {
  paths: string[];
}

export interface ConditionalDeleteConfig {
  condition: string;
  paths: string[];
}

export interface RenameConfig {
  from: string;
  to: string;
}

export interface GitInitConfig {
  removeExisting: boolean;
  initialCommit: boolean;
  message?: string;
}

export interface ExecConfig {
  command: string;
  cwd?: string;
}

export interface InitializationMetadata {
  initializedAt: string;
  config: InitConfig;
  completedTasks: string[];
  version: string;
}
