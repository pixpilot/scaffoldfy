/**
 * Tests for exec plugin command building
 */

import process from 'node:process';
import { describe, expect, it } from 'vitest';
import { buildCommand, quoteArg } from '../../../src/plugins/exec/build-command';

const isWindows = process.platform === 'win32';

describe('quoteArg', () => {
  it('should leave simple values unquoted', () => {
    expect(quoteArg('--full-access')).toBe('--full-access');
    expect(quoteArg('true')).toBe('true');
    expect(quoteArg('@pixpilot/coding-agent-sandbox@latest')).toBe(
      '@pixpilot/coding-agent-sandbox@latest',
    );
  });

  it('should quote values containing spaces', () => {
    expect(quoteArg('my task')).toBe(isWindows ? '"my task"' : `'my task'`);
  });

  it('should quote Windows style paths', () => {
    const raw = String.raw`Z:\github\ccpu\skills`;
    const quoted = quoteArg(raw);
    expect(quoted.startsWith(isWindows ? '"' : `'`)).toBe(true);
    expect(quoted).toContain('github');
  });
});

describe('buildCommand', () => {
  it('should return the command unchanged without args', () => {
    expect(buildCommand('npx prune')).toBe('npx prune');
    expect(buildCommand('npx prune', [])).toBe('npx prune');
  });

  it('should append quoted args', () => {
    expect(buildCommand('npx', ['-y', 'pkg', '--task', 'my task'])).toBe(
      isWindows ? 'npx -y pkg --task "my task"' : `npx -y pkg --task 'my task'`,
    );
  });

  it('should drop empty args', () => {
    expect(buildCommand('npx', ['--agent', 'claude', ''])).toBe('npx --agent claude');
  });
});
