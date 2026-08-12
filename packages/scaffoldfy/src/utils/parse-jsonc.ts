import type { ParseError } from 'jsonc-parser';
import { parse, printParseErrorCode } from 'jsonc-parser';

/**
 * Parse JSON or JSONC content and report syntax errors with their location.
 */
export function parseJsonc<T>(content: string): T {
  const errors: ParseError[] = [];
  const value = parse(content, errors, { allowTrailingComma: true }) as T;

  if (errors.length > 0) {
    const details = errors
      .map((error) => `${printParseErrorCode(error.error)} at offset ${error.offset}`)
      .join(', ');
    throw new Error(`Invalid JSON or JSONC: ${details}`);
  }

  return value;
}
