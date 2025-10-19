/**
 * Utility functions for template initialization
 */

import type { InitConfig } from './types.js';
import { execSync } from 'node:child_process';
import process from 'node:process';
import readline from 'node:readline';

/**
 * Get Git repository information from the current directory
 */
export function getGitRepoInfo(): { owner: string; name: string; url: string } | null {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();

    // Parse GitHub URL (https or git format)
    const match = remoteUrl.match(/github\.com[:/](?<owner>[^/]+)\/(?<name>[^/]+)$/u);
    if (match?.groups) {
      const { owner, name: rawName } = match.groups as { owner: string; name: string };
      let name = rawName;
      if (name.endsWith('.git')) {
        name = name.slice(0, -'.git'.length);
      }
      return { owner, name, url: remoteUrl };
    }

    return null;
  } catch {
    return null;
  }
}

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

/**
 * Interpolate template variables in a string
 */
export function interpolateTemplate(template: string, config: InitConfig): string {
  return template.replace(/\{\{(?<key>\w+)\}\}/gu, (match, key: string) => {
    const value = (config as unknown as Record<string, unknown>)[key];
    return value?.toString() ?? '';
  });
}

/**
 * Set a nested property in an object using dot notation
 */
export function setNestedProperty(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (key != null && key !== '') {
      if (
        !(key in current) ||
        typeof current[key] !== 'object' ||
        current[key] === null
      ) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }
  }

  const lastKey = keys[keys.length - 1];
  if (lastKey != null && lastKey !== '') {
    current[lastKey] = value;
  }
}

/**
 * Evaluate a condition expression with the given config
 */
export function evaluateCondition(condition: string, config: InitConfig): boolean {
  try {
    const context = {
      keepExamplePackages: config.keepExamplePackages,
      repoName: config.repoName,
      repoOwner: config.repoOwner,
      author: config.author,
      orgName: config.orgName,
      defaultBundler: config.defaultBundler,
    };

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
    log(`Failed to evaluate condition: ${condition}`, 'warn');
    if (error instanceof Error) {
      log(`  Error: ${error.message}`, 'warn');
    }
    return false;
  }
}
