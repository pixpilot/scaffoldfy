/**
 * Tests for utils evaluate enabled
 */

import { describe, expect, it, vi } from 'vitest';
import { evaluateEnabled, evaluateEnabledAsync } from '../../src/utils/evaluate-enabled';

// Mock node:child_process
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

describe('utils evaluate enabled', () => {
  it('should export evaluateEnabled function', () => {
    expect(evaluateEnabled).toBeDefined();
    expect(typeof evaluateEnabled).toBe('function');
  });

  describe('evaluateEnabled', () => {
    it('should return true for undefined enabled value', () => {
      const config = {};
      expect(evaluateEnabled(undefined, config)).toBe(true);
    });

    it('should return the boolean value directly', () => {
      const config = {};
      expect(evaluateEnabled(true, config)).toBe(true);
      expect(evaluateEnabled(false, config)).toBe(false);
    });

    it('should evaluate condition type', () => {
      const config = { feature: true, count: 5 };

      expect(
        evaluateEnabled({ type: 'condition', value: 'feature === true' }, config),
      ).toBe(true);
      expect(evaluateEnabled({ type: 'condition', value: 'count > 3' }, config)).toBe(
        true,
      );
      expect(evaluateEnabled({ type: 'condition', value: 'count < 3' }, config)).toBe(
        false,
      );
    });

    it('should handle exec type in lazy mode', () => {
      const config = {};

      expect(
        evaluateEnabled({ type: 'exec', value: 'echo true' }, config, { lazy: true }),
      ).toBe(true);
      expect(
        evaluateEnabled({ type: 'exec', value: 'echo true' }, config, { lazy: false }),
      ).toBe(false);
      expect(evaluateEnabled({ type: 'exec', value: 'echo true' }, config)).toBe(false);
    });

    it('should return false for invalid object types', () => {
      const config = {};

      expect(evaluateEnabled({ type: 'invalid' as any, value: 'test' }, config)).toBe(
        false,
      );
      expect(evaluateEnabled({} as any, config)).toBe(false);
    });

    it('should handle lazy evaluation for conditions', () => {
      const config = { defined: true };

      expect(
        evaluateEnabled({ type: 'condition', value: 'undefinedVar === true' }, config, {
          lazy: true,
        }),
      ).toBe(true);
      expect(
        evaluateEnabled({ type: 'condition', value: 'undefinedVar === true' }, config, {
          lazy: false,
        }),
      ).toBe(false);
    });
  });

  describe('evaluateEnabledAsync', () => {
    it('should return true for undefined enabled value', async () => {
      const config = {};
      expect(await evaluateEnabledAsync(undefined, config)).toBe(true);
    });

    it('should return the boolean value directly', async () => {
      const config = {};
      expect(await evaluateEnabledAsync(true, config)).toBe(true);
      expect(await evaluateEnabledAsync(false, config)).toBe(false);
    });

    it('should evaluate condition type', async () => {
      const config = { feature: true, count: 5 };

      expect(
        await evaluateEnabledAsync(
          { type: 'condition', value: 'feature === true' },
          config,
        ),
      ).toBe(true);
      expect(
        await evaluateEnabledAsync({ type: 'condition', value: 'count > 3' }, config),
      ).toBe(true);
      expect(
        await evaluateEnabledAsync({ type: 'condition', value: 'count < 3' }, config),
      ).toBe(false);
    });

    it('should execute exec type commands', async () => {
      const config = {};

      // Mock execSync to return 'true'
      const { execSync } = await import('node:child_process');
      vi.mocked(execSync).mockReturnValue('true');

      expect(
        await evaluateEnabledAsync({ type: 'exec', value: 'echo true' }, config),
      ).toBe(true);
      expect(execSync).toHaveBeenCalledWith('echo true', { encoding: 'utf-8' });
    });

    it('should handle exec command failures', async () => {
      const config = {};
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Mock execSync to throw error
      const { execSync } = await import('node:child_process');
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Command failed');
      });

      expect(
        await evaluateEnabledAsync({ type: 'exec', value: 'failing-command' }, config),
      ).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should parse exec output as boolean', async () => {
      const config = {};

      // Test various outputs that should be false
      const execSyncSpy = vi.fn();
      vi.doMock('node:child_process', () => ({
        execSync: execSyncSpy,
      }));

      execSyncSpy.mockReturnValue('');
      expect(await evaluateEnabledAsync({ type: 'exec', value: 'cmd' }, config)).toBe(
        false,
      );

      execSyncSpy.mockReturnValue('0');
      expect(await evaluateEnabledAsync({ type: 'exec', value: 'cmd' }, config)).toBe(
        false,
      );

      execSyncSpy.mockReturnValue('false');
      expect(await evaluateEnabledAsync({ type: 'exec', value: 'cmd' }, config)).toBe(
        false,
      );

      execSyncSpy.mockReturnValue('no');
      expect(await evaluateEnabledAsync({ type: 'exec', value: 'cmd' }, config)).toBe(
        false,
      );

      execSyncSpy.mockReturnValue('FALSE');
      expect(await evaluateEnabledAsync({ type: 'exec', value: 'cmd' }, config)).toBe(
        false,
      );

      // Test outputs that should be true
      execSyncSpy.mockReturnValue('true');
      expect(await evaluateEnabledAsync({ type: 'exec', value: 'cmd' }, config)).toBe(
        true,
      );

      execSyncSpy.mockReturnValue('1');
      expect(await evaluateEnabledAsync({ type: 'exec', value: 'cmd' }, config)).toBe(
        true,
      );

      execSyncSpy.mockReturnValue('yes');
      expect(await evaluateEnabledAsync({ type: 'exec', value: 'cmd' }, config)).toBe(
        true,
      );

      execSyncSpy.mockReturnValue('some output');
      expect(await evaluateEnabledAsync({ type: 'exec', value: 'cmd' }, config)).toBe(
        true,
      );
    });

    it('should interpolate templates in exec commands', async () => {
      const config = { env: 'production' };

      const execSyncSpy = vi.fn().mockReturnValue('true');
      vi.doMock('node:child_process', () => ({
        execSync: execSyncSpy,
      }));

      await evaluateEnabledAsync({ type: 'exec', value: 'check-{{env}}' }, config);

      expect(execSyncSpy).toHaveBeenCalledWith('check-production', { encoding: 'utf-8' });
    });

    it('should return false for invalid object types', async () => {
      const config = {};

      expect(
        await evaluateEnabledAsync({ type: 'invalid' as any, value: 'test' }, config),
      ).toBe(false);
      expect(await evaluateEnabledAsync({} as any, config)).toBe(false);
    });

    it('should handle lazy evaluation for conditions', async () => {
      const config = { defined: true };

      expect(
        await evaluateEnabledAsync(
          { type: 'condition', value: 'undefinedVar === true' },
          config,
          { lazy: true },
        ),
      ).toBe(true);
      expect(
        await evaluateEnabledAsync(
          { type: 'condition', value: 'undefinedVar === true' },
          config,
          { lazy: false },
        ),
      ).toBe(false);
    });
  });
});
