/**
 * exec-file plugin types
 */

import type { ConditionExpression } from '../../types';

/**
 * Runtime environment for executing the file
 */
export type ExecFileRuntime = 'node' | 'bash' | 'sh' | 'pwsh' | 'powershell';

/**
 * Configuration for exec-file task
 */
export interface ExecFileConfig {
  /**
   * Path to the file to execute (local or remote URL)
   * Supports template variable interpolation: {{variable}}
   * - Local: 'scripts/setup' or './scripts/setup.sh'
   * - Remote: 'https://example.com/scripts/setup'
   */
  file: string;

  /**
   * Runtime environment to execute the file with
   * If not specified, will be auto-detected from file extension:
   * - .js, .cjs, .mjs -> node
   * - .sh, .bash -> bash
   * - .ps1 -> pwsh
   * @default Auto-detected from file extension, falls back to 'node'
   */
  runtime?: ExecFileRuntime;

  /**
   * Arguments to pass to the script
   * Each argument supports template variable interpolation: {{variable}}
   * @example ["--name={{projectName}}", "--author={{author}}"]
   */
  args?: string[];

  /**
   * Environment variables or parameters to pass to the script
   * Values support template variable interpolation: {{variable}}
   * These will be available as environment variables to the script
   * @example { "PROJECT_NAME": "{{projectName}}", "AUTHOR": "{{author}}" }
   */
  parameters?: Record<string, string>;

  /**
   * Working directory for script execution
   * Supports template variable interpolation: {{variable}}
   * @default process.cwd()
   */
  cwd?: string;

  /**
   * Optional condition to determine if task should execute
   * JavaScript expression evaluated with config variables
   */
  condition?: ConditionExpression;
}
