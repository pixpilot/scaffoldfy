/**
 * Dry-run utilities
 *
 * Common utilities for generating diffs and formatting output.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const readFile = promisify(fs.readFile);

/**
 * JSON indentation for formatting
 */
export const JSON_INDENT = 2;

/**
 * Number of preview lines to show
 */
export const PREVIEW_LINES = 10;

/**
 * Length of separator lines
 */
export const SEPARATOR_LENGTH = 55;

/**
 * Color codes for terminal output
 */
export const colors = {
  reset: '\x1B[0m',
  red: '\x1B[31m',
  green: '\x1B[32m',
  yellow: '\x1B[33m',
  blue: '\x1B[34m',
  cyan: '\x1B[36m',
  gray: '\x1B[90m',
};

/**
 * Format a diff line with colors
 */
export function formatDiffLine(line: string, type: 'add' | 'remove' | 'context'): string {
  switch (type) {
    case 'add':
      return `${colors.green}+ ${line}${colors.reset}`;
    case 'remove':
      return `${colors.red}- ${line}${colors.reset}`;
    case 'context':
      return `${colors.gray}  ${line}${colors.reset}`;
    default:
      return line;
  }
}

/**
 * Generate a simple diff between two strings
 */
export function generateDiff(original: string, modified: string): string[] {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  const diff: string[] = [];

  // Simple line-by-line comparison
  const maxLength = Math.max(originalLines.length, modifiedLines.length);

  for (let i = 0; i < maxLength; i++) {
    const origLine = originalLines[i];
    const modLine = modifiedLines[i];

    if (origLine === modLine) {
      // Line unchanged
      if (origLine !== undefined) {
        diff.push(formatDiffLine(origLine, 'context'));
      }
    } else {
      // Line changed
      if (origLine !== undefined) {
        diff.push(formatDiffLine(origLine, 'remove'));
      }
      if (modLine !== undefined) {
        diff.push(formatDiffLine(modLine, 'add'));
      }
    }
  }

  return diff;
}

/**
 * Check if a file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), filePath));
}

/**
 * Read file content asynchronously
 */
export async function readFileContent(filePath: string): Promise<string> {
  return readFile(path.join(process.cwd(), filePath), 'utf-8');
}
