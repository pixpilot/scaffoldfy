/**
 * Tests for utils resolve value
 */

import type { CurrentConfigurationContext } from '../../src/types';
import { describe, expect, it, vi } from 'vitest';
import { resolveValue } from '../../src/utils/resolve-value';

// Mock node:child_process
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

// Mock executeScriptFile
vi.mock('../../src/plugins/exec-file/execute-script-file', () => ({
  executeScriptFile: vi.fn(),
}));

describe('utils resolve value', () => {
  it('should export resolveValue function', () => {
    expect(resolveValue).toBeDefined();
    expect(typeof resolveValue).toBe('function');
  });

  describe('resolveValue', () => {
    const mockOptions = {
      id: 'testValue',
      contextType: 'Variable' as const,
    };

    it('should return undefined for null or undefined values', async () => {
      expect(await resolveValue(null, mockOptions)).toBeUndefined();
      expect(await resolveValue(undefined, mockOptions)).toBeUndefined();
    });

    it('should return primitive values as-is', async () => {
      expect(await resolveValue('string', mockOptions)).toBe('string');
      expect(await resolveValue(42, mockOptions)).toBe(42);
      expect(await resolveValue(true, mockOptions)).toBe(true);
      expect(await resolveValue([1, 2, 3], mockOptions)).toEqual([1, 2, 3]);
    });

    it('should handle static type', async () => {
      expect(await resolveValue({ type: 'static', value: 'test' }, mockOptions)).toBe(
        'test',
      );
      expect(await resolveValue({ type: 'static', value: 123 }, mockOptions)).toBe(123);
      expect(await resolveValue({ type: 'static', value: true }, mockOptions)).toBe(true);
    });

    it('should handle interpolate type', async () => {
      const context: CurrentConfigurationContext = { name: 'world', count: 5 };

      expect(
        await resolveValue(
          { type: 'interpolate', value: 'Hello {{name}}!' },
          { ...mockOptions, context },
        ),
      ).toBe('Hello world!');

      expect(
        await resolveValue(
          { type: 'interpolate', value: 'Count: {{count}}' },
          { ...mockOptions, context },
        ),
      ).toBe('Count: 5');
    });

    it('should return template string when context is missing for interpolate', async () => {
      expect(
        await resolveValue(
          { type: 'interpolate', value: 'Hello {{name}}!' },
          mockOptions,
        ),
      ).toBe('Hello {{name}}!');
    });

    it('should return undefined for interpolate with non-string value', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      expect(
        await resolveValue(
          { type: 'interpolate', value: 123 },
          { ...mockOptions, context: {} },
        ),
      ).toBeUndefined();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle conditional type', async () => {
      const context: CurrentConfigurationContext = { enabled: true, value: 'yes' };

      expect(
        await resolveValue(
          {
            type: 'conditional',
            condition: 'enabled === true',
            ifTrue: 'success',
            ifFalse: 'failure',
          },
          { ...mockOptions, context },
        ),
      ).toBe('success');

      expect(
        await resolveValue(
          {
            type: 'conditional',
            condition: 'enabled === false',
            ifTrue: 'success',
            ifFalse: 'failure',
          },
          { ...mockOptions, context },
        ),
      ).toBe('failure');
    });

    it('should recursively resolve conditional values', async () => {
      const context: CurrentConfigurationContext = { enabled: true, name: 'test' };

      expect(
        await resolveValue(
          {
            type: 'conditional',
            condition: 'enabled === true',
            ifTrue: { type: 'interpolate', value: 'Hello {{name}}!' },
            ifFalse: 'failure',
          },
          { ...mockOptions, context },
        ),
      ).toBe('Hello test!');
    });

    it('should return undefined for conditional without context', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      expect(
        await resolveValue(
          {
            type: 'conditional',
            condition: 'true',
            ifTrue: 'success',
            ifFalse: 'failure',
          },
          mockOptions,
        ),
      ).toBeUndefined();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return undefined for conditional with invalid condition', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      expect(
        await resolveValue(
          {
            type: 'conditional',
            condition: 123 as any,
            ifTrue: 'success',
            ifFalse: 'failure',
          },
          { ...mockOptions, context: {} },
        ),
      ).toBeUndefined();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle exec type', async () => {
      // Mock execSync
      const { execSync } = await import('node:child_process');
      vi.mocked(execSync).mockReturnValue('command output');

      expect(await resolveValue({ type: 'exec', value: 'echo test' }, mockOptions)).toBe(
        'command output',
      );

      expect(execSync).toHaveBeenCalledWith('echo test', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 10000,
      });
    });

    it('should return undefined for exec with non-string command', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      expect(
        await resolveValue({ type: 'exec', value: 123 }, mockOptions),
      ).toBeUndefined();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle exec command failures', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Mock execSync to throw
      const { execSync } = await import('node:child_process');
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Command failed');
      });

      expect(
        await resolveValue({ type: 'exec', value: 'failing-command' }, mockOptions),
      ).toBeUndefined();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle exec-file type', async () => {
      const { executeScriptFile } = await import(
        '../../src/plugins/exec-file/execute-script-file'
      );
      vi.mocked(executeScriptFile).mockResolvedValue('script output');

      expect(
        await resolveValue({ type: 'exec-file', file: 'test.js' }, mockOptions),
      ).toBe('script output');

      expect(executeScriptFile).toHaveBeenCalledWith(
        {
          file: 'test.js',
          captureOutput: true,
        },
        {},
      );
    });

    it('should handle exec-file with full config', async () => {
      const { executeScriptFile } = await import(
        '../../src/plugins/exec-file/execute-script-file'
      );
      vi.mocked(executeScriptFile).mockResolvedValue('script output');

      expect(
        await resolveValue(
          {
            type: 'exec-file',
            file: 'test.js',
            runtime: 'node',
            args: ['arg1', 'arg2'],
            parameters: { key: 'value' },
            cwd: '/tmp',
          },
          { ...mockOptions, sourceUrl: 'http://example.com' },
        ),
      ).toBe('script output');

      expect(executeScriptFile).toHaveBeenCalledWith(
        {
          file: 'test.js',
          runtime: 'node',
          args: ['arg1', 'arg2'],
          parameters: { key: 'value' },
          cwd: '/tmp',
          sourceUrl: 'http://example.com',
          captureOutput: true,
        },
        {},
      );
    });

    it('should return undefined for exec-file with non-string file', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      expect(
        await resolveValue({ type: 'exec-file', file: 123 }, mockOptions),
      ).toBeUndefined();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return undefined for unknown types', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      expect(
        await resolveValue({ type: 'unknown', value: 'test' }, mockOptions),
      ).toBeUndefined();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return object as static value when no type specified', async () => {
      const obj = { custom: 'value' };
      expect(await resolveValue(obj, mockOptions)).toEqual(obj);
    });
  });
});
