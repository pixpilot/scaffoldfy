/**
 * Tests for exec-enabled in tasks and prompts
 */

import type { EnabledValue } from '../src/types';
import { describe, expect, it } from 'vitest';

describe('exec-enabled for tasks and prompts', () => {
  describe('evaluateEnabledAsync with exec type', () => {
    it('should support exec-enabled returning true', async () => {
      const { evaluateEnabledAsync } = await import('../src/utils/evaluate-enabled');

      const execEnabled: EnabledValue = {
        type: 'exec',
        value: 'echo true',
      };

      const result = await evaluateEnabledAsync(execEnabled, {});
      expect(result).toBe(true);
    });

    it('should support exec-enabled returning false', async () => {
      const { evaluateEnabledAsync } = await import('../src/utils/evaluate-enabled');

      const execEnabled: EnabledValue = {
        type: 'exec',
        value: 'echo false',
      };

      const result = await evaluateEnabledAsync(execEnabled, {});
      expect(result).toBe(false);
    });

    it('should support exec-enabled with "no" returning false', async () => {
      const { evaluateEnabledAsync } = await import('../src/utils/evaluate-enabled');

      const execEnabled: EnabledValue = {
        type: 'exec',
        value: 'echo no',
      };

      const result = await evaluateEnabledAsync(execEnabled, {});
      expect(result).toBe(false);
    });

    it('should support exec-enabled with "0" returning false', async () => {
      const { evaluateEnabledAsync } = await import('../src/utils/evaluate-enabled');

      const execEnabled: EnabledValue = {
        type: 'exec',
        value: 'echo 0',
      };

      const result = await evaluateEnabledAsync(execEnabled, {});
      expect(result).toBe(false);
    });

    it('should support exec-enabled with non-empty output returning true', async () => {
      const { evaluateEnabledAsync } = await import('../src/utils/evaluate-enabled');

      const execEnabled: EnabledValue = {
        type: 'exec',
        value: 'echo yes',
      };

      const result = await evaluateEnabledAsync(execEnabled, {});
      expect(result).toBe(true);
    });

    it('should return false when exec command fails', async () => {
      const { evaluateEnabledAsync } = await import('../src/utils/evaluate-enabled');

      const execEnabled: EnabledValue = {
        type: 'exec',
        value: 'nonexistent-command-will-fail',
      };

      const result = await evaluateEnabledAsync(execEnabled, {});
      expect(result).toBe(false);
    });

    it('should support template interpolation in exec commands', async () => {
      const { evaluateEnabledAsync } = await import('../src/utils/evaluate-enabled');

      const execEnabled: EnabledValue = {
        type: 'exec',
        value: 'echo {{value}}',
      };

      const config = { value: 'true' };
      const result = await evaluateEnabledAsync(execEnabled, config);
      expect(result).toBe(true);
    });
  });

  describe('evaluateEnabled with exec type (synchronous)', () => {
    it('should return true in lazy mode for exec-enabled', async () => {
      const { evaluateEnabled } = await import('../src/utils/evaluate-enabled');

      const execEnabled: EnabledValue = {
        type: 'exec',
        value: 'echo true',
      };

      // In lazy mode, exec should return true (to be evaluated later)
      const result = evaluateEnabled(execEnabled, {}, { lazy: true });
      expect(result).toBe(true);
    });

    it('should return false in non-lazy mode for exec-enabled', async () => {
      const { evaluateEnabled } = await import('../src/utils/evaluate-enabled');

      const execEnabled: EnabledValue = {
        type: 'exec',
        value: 'echo true',
      };

      // In non-lazy mode, exec cannot be evaluated synchronously
      const result = evaluateEnabled(execEnabled, {}, { lazy: false });
      expect(result).toBe(false);
    });
  });
});
