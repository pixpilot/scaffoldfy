/**
 * Tests for default value resolution
 */

import type { DefaultValue } from '../../src/types.js';
import { execSync } from 'node:child_process';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveDefaultValue } from '../../src/prompts/index.js';

// Mock execSync for testing command execution
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

// Clear mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

describe('executable default values', () => {
  it('should resolve static default values', async () => {
    const defaultValue: DefaultValue<string> = 'static-value';
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe('static-value');
  });

  it('should resolve explicit value type defaults', async () => {
    const defaultValue: DefaultValue<string> = {
      type: 'value',
      value: 'explicit-value',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe('explicit-value');
  });

  it('should execute command for execute type defaults', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('command-output\n');

    const defaultValue: DefaultValue<string> = {
      type: 'execute',
      value: 'echo "test"',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe('command-output');
    expect(mockExec).toHaveBeenCalledWith('echo "test"', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000,
    });
  });

  it('should parse numeric command output', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('42\n');

    const defaultValue: DefaultValue<number> = {
      type: 'execute',
      value: 'echo "42"',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe(42);
  });

  it('should parse boolean command output', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('true\n');

    const defaultValue: DefaultValue<boolean> = {
      type: 'execute',
      value: 'echo "true"',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe(true);
  });

  it('should parse JSON command output', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('{"key":"value"}\n');

    const defaultValue: DefaultValue<object> = {
      type: 'execute',
      value: 'echo \'{"key":"value"}\'',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toEqual({ key: 'value' });
  });

  it('should handle command execution errors gracefully', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockImplementation(() => {
      throw new Error('Command failed');
    });

    const defaultValue: DefaultValue<string> = {
      type: 'execute',
      value: 'failing-command',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBeUndefined();
  });

  it('should return undefined for execute type with non-string command', async () => {
    const defaultValue = {
      type: 'execute',
      value: 123,
    } as unknown as DefaultValue<string>;
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBeUndefined();
  });

  it('should handle undefined default values', async () => {
    const result = await resolveDefaultValue(undefined, 'test-prompt');
    expect(result).toBeUndefined();
  });

  it('should support git commands', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('main\n');

    const defaultValue: DefaultValue<string> = {
      type: 'execute',
      value: 'git branch --show-current',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe('main');
  });

  it('should support npm commands', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('9.6.0\n');

    const defaultValue: DefaultValue<string> = {
      type: 'execute',
      value: 'npm --version',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe('9.6.0');
  });

  it('should support node commands', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('v20.10.0\n');

    const defaultValue: DefaultValue<string> = {
      type: 'execute',
      value: 'node --version',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe('v20.10.0');
  });
});
