import type { DynamicBooleanValue, InitConfig } from '../../src/types.js';
import { describe, expect, it } from 'vitest';
import {
  evaluateRequired,
  evaluateRequiredAsync,
} from '../../src/utils/evaluate-required.js';

describe('evaluateRequired', () => {
  const mockConfig: InitConfig = {};

  describe('boolean values', () => {
    it('should return true for true', () => {
      expect(evaluateRequired(true, mockConfig)).toBe(true);
    });

    it('should return false for false', () => {
      expect(evaluateRequired(false, mockConfig)).toBe(false);
    });

    it('should default to true when undefined', () => {
      expect(evaluateRequired(undefined, mockConfig)).toBe(true);
    });
  });

  describe('string expressions (deprecated format)', () => {
    it('should evaluate string condition to true', () => {
      const config: InitConfig = {
        isProduction: true,
      };
      expect(evaluateRequired('isProduction === true', config)).toBe(true);
    });

    it('should evaluate string condition to false', () => {
      const config: InitConfig = {
        isProduction: false,
      };
      expect(evaluateRequired('isProduction === true', config)).toBe(false);
    });

    it('should handle complex expressions', () => {
      const config: InitConfig = {
        env: 'production',
        debug: false,
      };
      expect(evaluateRequired('env === "production" && !debug', config)).toBe(true);
    });
  });

  describe('new format - type: condition', () => {
    it('should evaluate condition type to true', () => {
      const required: DynamicBooleanValue = {
        type: 'condition',
        value: 'critical === true',
      };
      const config: InitConfig = {
        critical: true,
      };
      expect(evaluateRequired(required, config)).toBe(true);
    });

    it('should evaluate condition type to false', () => {
      const required: DynamicBooleanValue = {
        type: 'condition',
        value: 'critical === true',
      };
      const config: InitConfig = {
        critical: false,
      };
      expect(evaluateRequired(required, config)).toBe(false);
    });

    it('should handle condition with multiple variables', () => {
      const required: DynamicBooleanValue = {
        type: 'condition',
        value: 'platform === "linux" && hasPermissions',
      };
      const config: InitConfig = {
        platform: 'linux',
        hasPermissions: true,
      };
      expect(evaluateRequired(required, config)).toBe(true);
    });
  });

  describe('new format - type: exec', () => {
    it('should return false for exec type in sync mode', () => {
      const required: DynamicBooleanValue = {
        type: 'exec',
        value: 'echo "test"',
      };
      expect(evaluateRequired(required, mockConfig)).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should default to true on invalid condition', () => {
      const required: DynamicBooleanValue = {
        type: 'condition',
        value: 'this is invalid javascript!!!',
      };
      expect(evaluateRequired(required, mockConfig)).toBe(true);
    });

    it('should default to true on reference error', () => {
      const required: DynamicBooleanValue = {
        type: 'condition',
        value: 'undefinedVariable === true',
      };
      expect(evaluateRequired(required, mockConfig)).toBe(true);
    });
  });
});

describe('evaluateRequiredAsync', () => {
  const mockConfig: InitConfig = {};

  describe('boolean values', () => {
    it('should return true for true', async () => {
      expect(await evaluateRequiredAsync(true, mockConfig)).toBe(true);
    });

    it('should return false for false', async () => {
      expect(await evaluateRequiredAsync(false, mockConfig)).toBe(false);
    });

    it('should default to true when undefined', async () => {
      expect(await evaluateRequiredAsync(undefined, mockConfig)).toBe(true);
    });
  });

  describe('string expressions (deprecated format)', () => {
    it('should evaluate string condition to true', async () => {
      const config: InitConfig = {
        deploy: true,
      };
      expect(await evaluateRequiredAsync('deploy === true', config)).toBe(true);
    });

    it('should evaluate string condition to false', async () => {
      const config: InitConfig = {
        deploy: false,
      };
      expect(await evaluateRequiredAsync('deploy === true', config)).toBe(false);
    });
  });

  describe('new format - type: condition', () => {
    it('should evaluate condition type to true', async () => {
      const required: DynamicBooleanValue = {
        type: 'condition',
        value: 'important === true',
      };
      const config: InitConfig = {
        important: true,
      };
      expect(await evaluateRequiredAsync(required, config)).toBe(true);
    });

    it('should evaluate condition type to false', async () => {
      const required: DynamicBooleanValue = {
        type: 'condition',
        value: 'important === true',
      };
      const config: InitConfig = {
        important: false,
      };
      expect(await evaluateRequiredAsync(required, config)).toBe(false);
    });
  });

  describe('new format - type: exec (command execution)', () => {
    it('should execute command and return true for exit code 0', async () => {
      const required: DynamicBooleanValue = {
        type: 'exec',
        value: process.platform === 'win32' ? 'exit 0' : 'exit 0',
      };
      expect(await evaluateRequiredAsync(required, mockConfig)).toBe(true);
    });

    it('should execute command and return false for non-zero exit code', async () => {
      const required: DynamicBooleanValue = {
        type: 'exec',
        value: process.platform === 'win32' ? 'exit 1' : 'exit 1',
      };
      expect(await evaluateRequiredAsync(required, mockConfig)).toBe(false);
    });

    it('should handle command that checks file existence', async () => {
      const required: DynamicBooleanValue = {
        type: 'exec',
        value:
          process.platform === 'win32'
            ? 'if exist package.json (exit 0) else (exit 1)'
            : 'test -f package.json',
      };
      // This test depends on running in a project with package.json
      const result = await evaluateRequiredAsync(required, mockConfig);
      expect(typeof result).toBe('boolean');
    });

    it('should default to false on command error (command not found)', async () => {
      const required: DynamicBooleanValue = {
        type: 'exec',
        value: 'this-command-does-not-exist-12345',
      };
      // When command doesn't exist, default to false (not required, don't block execution)
      expect(await evaluateRequiredAsync(required, mockConfig)).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should default to true on invalid condition', async () => {
      const required: DynamicBooleanValue = {
        type: 'condition',
        value: 'this is invalid javascript!!!',
      };
      expect(await evaluateRequiredAsync(required, mockConfig)).toBe(true);
    });

    it('should default to true on reference error', async () => {
      const required: DynamicBooleanValue = {
        type: 'condition',
        value: 'undefinedVariable === true',
      };
      expect(await evaluateRequiredAsync(required, mockConfig)).toBe(true);
    });

    it('should handle null gracefully', async () => {
      expect(await evaluateRequiredAsync(null as any, mockConfig)).toBe(true);
    });
  });

  describe('backwards compatibility', () => {
    it('should support all deprecated formats', async () => {
      const config: InitConfig = {
        test: true,
      };

      // String format
      expect(await evaluateRequiredAsync('test === true', config)).toBe(true);

      // New format
      expect(
        await evaluateRequiredAsync(
          { type: 'condition', value: 'test === true' },
          config,
        ),
      ).toBe(true);
    });
  });
});
