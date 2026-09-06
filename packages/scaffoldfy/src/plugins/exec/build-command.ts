/**
 * Command building helpers for the exec plugin
 */

import process from 'node:process';

/** Characters that never need quoting on any supported shell */
const SAFE_ARG = /^[\w+,./:=@-]+$/u;

/**
 * Quote a single argument so the current platform's shell passes it through verbatim
 * @param arg - Argument value
 * @returns Shell-safe representation of the argument
 */
export function quoteArg(arg: string): string {
  if (SAFE_ARG.test(arg)) {
    return arg;
  }

  if (process.platform === 'win32') {
    // Escape embedded quotes (and the backslashes preceding them), then wrap
    const escaped = arg
      .replace(/(?<slashes>\\*)"/gu, '$<slashes>$<slashes>\\"')
      .replace(/(?<slashes>\\+)$/u, '$<slashes>$<slashes>');
    return `"${escaped}"`;
  }

  // POSIX: end the quoted run, add an escaped quote, then reopen
  return `'${arg.replace(/'/gu, String.raw`'\''`)}'`;
}

/**
 * Build the full shell command from an already interpolated command and args
 * @param command - Interpolated command string
 * @param args - Interpolated arguments; empty entries are dropped
 * @returns The command line to execute
 */
export function buildCommand(command: string, args?: string[]): string {
  const parts = (args ?? []).filter((arg) => arg !== '').map(quoteArg);

  return parts.length > 0 ? `${command} ${parts.join(' ')}` : command;
}
