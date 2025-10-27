/**
 * Tests for utils conditions
 */

import { describe, expect, it, vi } from 'vitest';
import { evaluateCondition } from '../../src/utils/conditions';

describe('utils conditions', () => {
  it('should export evaluateCondition function', () => {
    expect(evaluateCondition).toBeDefined();
    expect(typeof evaluateCondition).toBe('function');
  });

  describe('evaluateCondition', () => {
    it('should evaluate simple boolean expressions', () => {
      const config = { enabled: true, count: 5 };

      expect(evaluateCondition('enabled === true', config)).toBe(true);
      expect(evaluateCondition('enabled === false', config)).toBe(false);
      expect(evaluateCondition('count > 3', config)).toBe(true);
      expect(evaluateCondition('count < 3', config)).toBe(false);
    });

    it('should evaluate complex expressions with multiple variables', () => {
      const config = {
        featureA: true,
        featureB: false,
        version: 2,
        name: 'test',
      };

      expect(evaluateCondition('featureA && version >= 2', config)).toBe(true);
      expect(evaluateCondition('featureA || featureB', config)).toBe(true);
      expect(evaluateCondition('name === "test" && version === 2', config)).toBe(true);
    });

    it('should handle string operations', () => {
      const config = {
        env: 'production',
        type: 'web',
      };

      expect(evaluateCondition('env === "production"', config)).toBe(true);
      expect(evaluateCondition('env.includes("prod")', config)).toBe(true);
      expect(evaluateCondition('type.length > 2', config)).toBe(true);
    });

    it('should handle array operations', () => {
      const config = {
        tags: ['web', 'api'],
        features: [],
      };

      expect(evaluateCondition('tags.includes("web")', config)).toBe(true);
      expect(evaluateCondition('tags.length > 1', config)).toBe(true);
      expect(evaluateCondition('features.length === 0', config)).toBe(true);
    });

    it('should return false for invalid syntax', () => {
      const config = { valid: true };

      expect(evaluateCondition('invalid syntax {{', config)).toBe(false);
    });

    it('should return false for undefined variables', () => {
      const config = { defined: true };

      expect(evaluateCondition('undefinedVar === true', config)).toBe(false);
    });

    it('should handle lazy mode with undefined variables', () => {
      const config = { defined: true };

      expect(evaluateCondition('undefinedVar === true', config, { lazy: true })).toBe(
        true,
      );
    });

    it('should handle lazy mode with syntax errors', () => {
      const config = { defined: true };

      expect(evaluateCondition('invalid syntax {{', config, { lazy: true })).toBe(false);
    });

    it('should suppress warnings in silent mode', () => {
      const config = { defined: true };
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      evaluateCondition('undefinedVar === true', config, { silent: true });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle empty config', () => {
      const config = {};

      expect(evaluateCondition('true', config)).toBe(true);
      expect(evaluateCondition('false', config)).toBe(false);
    });

    it('should handle null and undefined values in config', () => {
      const config = {
        nullValue: null,
        undefinedValue: undefined,
        valid: true,
      };

      expect(evaluateCondition('nullValue === null', config)).toBe(true);
      expect(evaluateCondition('undefinedValue === undefined', config)).toBe(true);
      expect(evaluateCondition('valid === true', config)).toBe(true);
    });
  });
});
