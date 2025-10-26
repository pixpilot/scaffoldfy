/**
 * Utility functions for template initialization
 */

import type { InitConfig } from './types.js';

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline';
import Handlebars from 'handlebars';
import { TemplateFileNotFoundError } from './errors/template.js';
import { getNestedProperty } from './utils/object.js';

/**
 * Prompt user for input with optional default value
 */
export async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    let displayQuestion: string;
    if (defaultValue != null) {
      displayQuestion = `${question} (${defaultValue}): `;
    } else {
      displayQuestion = `${question}: `;
    }

    rl.question(displayQuestion, (answer) => {
      rl.close();
      resolve(answer.trim() || (defaultValue ?? ''));
    });
  });
}

/**
 * Prompt user for yes/no answer
 */
export async function promptYesNo(
  question: string,
  defaultValue = false,
): Promise<boolean> {
  const defaultStr = defaultValue ? 'Y/n' : 'y/N';
  return prompt(`${question} (${defaultStr})`, defaultValue ? 'y' : 'n').then(
    (answer) => answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes',
  );
}

/**
 * Log message with colored output
 * @deprecated Use logger functions from logger.ts instead
 */
export function log(
  message: string,
  type: 'info' | 'success' | 'error' | 'warn' = 'info',
): void {
  const symbols = {
    info: 'ℹ',
    success: '✓',
    error: '✗',
    warn: '⚠',
  };

  const colors = {
    info: '\x1B[36m', // Cyan
    success: '\x1B[32m', // Green
    error: '\x1B[31m', // Red
    warn: '\x1B[33m', // Yellow
  };

  const reset = '\x1B[0m';
  console.log(`${colors[type]}${symbols[type]} ${message}${reset}`);
}

// Re-export logger functions for convenience
export {
  debug,
  error as logError,
  info as logInfo,
  success as logSuccess,
  warn as logWarn,
} from './logger.js';

/**
 * Interpolate template variables in a string
 */
export function interpolateTemplate(template: string, config: InitConfig): string {
  return template.replace(/\{\{(?<key>[\w.]+)\}\}/gu, (match, key: string) => {
    const value = getNestedProperty(config as unknown as Record<string, unknown>, key);
    return value?.toString() ?? '';
  });
}

/**
 * Evaluate a condition expression with the given config
 * @param condition - JavaScript expression to evaluate
 * @param config - Configuration context for evaluation
 * @param options - Optional evaluation options
 * @param options.lazy - If true, return true (assume enabled) when condition fails due to missing variables
 * @param options.silent - If true, suppress warning messages
 * @returns The result of condition evaluation
 */
export function evaluateCondition(
  condition: string,
  config: InitConfig,
  options?: { lazy?: boolean; silent?: boolean },
): boolean {
  try {
    // Use all config properties (including dynamic prompt values) as context
    const context = { ...config };

    // Simple safe eval using Function constructor
    // Only allow access to the context variables
    // This is intentional for dynamic condition evaluation with controlled context
    // eslint-disable-next-line no-new-func, ts/no-implied-eval
    const func = new Function(
      ...Object.keys(context),
      `'use strict'; return (${condition})`,
    ) as (...args: unknown[]) => boolean;

    return func(...Object.values(context));
  } catch (error) {
    // In lazy mode, if the error is about an undefined variable,
    // assume the task should be included and will be filtered later
    if (options?.lazy === true && error instanceof ReferenceError) {
      // Don't log warnings in lazy mode - this is expected
      return true;
    }

    // Log warning unless silent mode is enabled
    if (options?.silent !== true) {
      log(`Failed to evaluate condition: ${condition}`, 'warn');
      if (error instanceof Error) {
        log(`  Error: ${error.message}`, 'warn');
      }
    }

    return false;
  }
}

/**
 * Compile a template file using Handlebars
 */
export function compileHandlebarsTemplateFile(
  templatePath: string,
  config: InitConfig,
): string {
  try {
    const absolutePath = path.isAbsolute(templatePath)
      ? templatePath
      : path.join(process.cwd(), templatePath);

    if (!fs.existsSync(absolutePath)) {
      throw TemplateFileNotFoundError.forPath(templatePath);
    }

    const templateContent = fs.readFileSync(absolutePath, 'utf-8');
    return compileHandlebarsTemplate(templateContent, config);
  } catch (error) {
    log(`Failed to read template file: ${templatePath}`, 'error');
    if (error instanceof Error) {
      log(`  Error: ${error.message}`, 'error');
    }
    throw error;
  }
}

/**
 * Compile a template string using Handlebars
 */
export function compileHandlebarsTemplate(template: string, config: InitConfig): string {
  try {
    const compiledTemplate = Handlebars.compile(template);
    return compiledTemplate(config);
  } catch (error) {
    log('Failed to compile Handlebars template', 'error');
    if (error instanceof Error) {
      log(`  Error: ${error.message}`, 'error');
    }
    throw error;
  }
}

// Re-export utilities
export { evaluateEnabled, evaluateEnabledAsync } from './utils/evaluate-enabled.js';
export { resolveValue } from './utils/resolve-value.js';
export type { ResolveValueContext, ResolveValueOptions } from './utils/resolve-value.js';
