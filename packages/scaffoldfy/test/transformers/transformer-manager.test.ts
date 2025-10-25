/**
 * Tests for Transformer Manager
 */

import type {
  ChainTransformer,
  ComputedTransformer,
  RegexTransformer,
  Transformer,
} from '../../src/transformers/index.js';

import { beforeEach, describe, expect, it } from 'vitest';

import { TransformerError } from '../../src/errors/other.js';
import { TransformerManager } from '../../src/transformers/index.js';

describe('transformerManager', () => {
  let manager: TransformerManager;

  beforeEach(() => {
    manager = new TransformerManager();
  });

  describe('register', () => {
    it('should register a transformer', () => {
      const transformer: Transformer = {
        id: 'test',
        type: 'lowercase',
      };

      manager.register(transformer);
      expect(manager.has('test')).toBe(true);
    });

    it('should overwrite existing transformer with warning', () => {
      const transformer1: Transformer = {
        id: 'test',
        type: 'lowercase',
      };
      const transformer2: Transformer = {
        id: 'test',
        type: 'uppercase',
      };

      manager.register(transformer1);
      manager.register(transformer2);

      expect(manager.get('test')).toEqual(transformer2);
    });
  });

  describe('lowercase transformer', () => {
    it('should convert string to lowercase', async () => {
      const transformer: Transformer = {
        id: 'lowercase',
        type: 'lowercase',
      };

      manager.register(transformer);
      const result = await manager.execute('lowercase', 'HELLO WORLD');
      expect(result).toBe('hello world');
    });
  });

  describe('uppercase transformer', () => {
    it('should convert string to uppercase', async () => {
      const transformer: Transformer = {
        id: 'uppercase',
        type: 'uppercase',
      };

      manager.register(transformer);
      const result = await manager.execute('uppercase', 'hello world');
      expect(result).toBe('HELLO WORLD');
    });
  });

  describe('trim transformer', () => {
    it('should trim whitespace', async () => {
      const transformer: Transformer = {
        id: 'trim',
        type: 'trim',
      };

      manager.register(transformer);
      const result = await manager.execute('trim', '  hello world  ');
      expect(result).toBe('hello world');
    });
  });

  describe('slugify transformer', () => {
    it('should convert string to slug', async () => {
      const transformer: Transformer = {
        id: 'slugify',
        type: 'slugify',
      };

      manager.register(transformer);
      const result = await manager.execute('slugify', 'Hello World Project');
      expect(result).toBe('hello-world-project');
    });

    it('should handle special characters', async () => {
      const transformer: Transformer = {
        id: 'slugify',
        type: 'slugify',
      };

      manager.register(transformer);
      const result = await manager.execute('slugify', 'My Project: (2025)!');
      expect(result).toBe('my-project-2025');
    });

    it('should replace spaces and underscores with hyphens', async () => {
      const transformer: Transformer = {
        id: 'slugify',
        type: 'slugify',
      };

      manager.register(transformer);
      const result = await manager.execute('slugify', 'hello_world test');
      expect(result).toBe('hello-world-test');
    });

    it('should collapse multiple hyphens', async () => {
      const transformer: Transformer = {
        id: 'slugify',
        type: 'slugify',
      };

      manager.register(transformer);
      const result = await manager.execute('slugify', 'hello---world');
      expect(result).toBe('hello-world');
    });
  });

  describe('regex transformer', () => {
    it('should replace using regex pattern', async () => {
      const transformer: RegexTransformer = {
        id: 'remove-spaces',
        type: 'regex',
        config: {
          pattern: '\\s+',
          flags: 'g',
          replacement: '-',
        },
      };

      manager.register(transformer);
      const result = await manager.execute('remove-spaces', 'hello world test');
      expect(result).toBe('hello-world-test');
    });

    it('should handle regex flags', async () => {
      const transformer: RegexTransformer = {
        id: 'remove-vowels',
        type: 'regex',
        config: {
          pattern: '[aeiou]',
          flags: 'gi',
          replacement: '',
        },
      };

      manager.register(transformer);
      const result = await manager.execute('remove-vowels', 'Hello World');
      expect(result).toBe('Hll Wrld');
    });
  });

  describe('computed transformer', () => {
    it('should evaluate expression', async () => {
      const transformer: ComputedTransformer = {
        id: 'double',
        type: 'computed',
        config: {
          expression: 'value * 2',
        },
      };

      manager.register(transformer);
      const result = await manager.execute('double', 5);
      expect(result).toBe(10);
    });

    it('should have access to context', async () => {
      const transformer: ComputedTransformer = {
        id: 'add-prefix',
        type: 'computed',
        config: {
          expression: 'prefix + value',
        },
      };

      manager.register(transformer);
      const result = await manager.execute('add-prefix', 'world', { prefix: 'hello-' });
      expect(result).toBe('hello-world');
    });

    it('should handle string operations', async () => {
      const transformer: ComputedTransformer = {
        id: 'capitalize',
        type: 'computed',
        config: {
          expression: 'value.charAt(0).toUpperCase() + value.slice(1)',
        },
      };

      manager.register(transformer);
      const result = await manager.execute('capitalize', 'hello');
      expect(result).toBe('Hello');
    });
  });

  describe('chain transformer', () => {
    it('should execute transformers in sequence', async () => {
      manager.registerAll([
        { id: 'lowercase', type: 'lowercase' },
        { id: 'trim', type: 'trim' },
        {
          id: 'remove-spaces',
          type: 'regex',
          config: { pattern: '\\s+', flags: 'g', replacement: '-' },
        } as RegexTransformer,
      ]);

      const chain: ChainTransformer = {
        id: 'normalize',
        type: 'chain',
        config: {
          transformers: ['trim', 'lowercase', 'remove-spaces'],
        },
      };

      manager.register(chain);
      const result = await manager.execute('normalize', '  HELLO WORLD  ');
      expect(result).toBe('hello-world');
    });

    it('should throw error for empty chain', async () => {
      const chain: ChainTransformer = {
        id: 'empty',
        type: 'chain',
        config: {
          transformers: [],
        },
      };

      manager.register(chain);
      await expect(manager.execute('empty', 'test')).rejects.toThrow(TransformerError);
    });
  });

  describe('apply', () => {
    it('should apply single transformer by string ID', async () => {
      manager.register({ id: 'lowercase', type: 'lowercase' });
      const result = await manager.apply(['lowercase'], 'HELLO');
      expect(result).toBe('hello');
    });

    it('should apply multiple transformers by array of IDs', async () => {
      manager.registerAll([
        { id: 'lowercase', type: 'lowercase' },
        { id: 'trim', type: 'trim' },
      ]);

      const result = await manager.apply(['trim', 'lowercase'], '  HELLO  ');
      expect(result).toBe('hello');
    });

    it('should return value unchanged when transformers is undefined', async () => {
      // Call directly without using apply as a method
      const applyFn = manager.apply.bind(manager);
      const result = await applyFn(undefined, 'test');
      expect(result).toBe('test');
    });
  });

  describe('validate', () => {
    it('should return empty array for valid transformer IDs', () => {
      manager.registerAll([
        { id: 'lowercase', type: 'lowercase' },
        { id: 'trim', type: 'trim' },
      ]);

      const errors = manager.validate(['lowercase', 'trim']);
      expect(errors).toEqual([]);
    });

    it('should return errors for missing transformer IDs', () => {
      manager.register({ id: 'lowercase', type: 'lowercase' });

      const errors = manager.validate(['lowercase', 'missing']);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('missing');
    });

    it('should handle array input with multiple missing transformers', () => {
      const errors = manager.validate(['missing', 'another-missing']);
      expect(errors).toHaveLength(2);
    });

    it('should return empty array for undefined', () => {
      const errors = manager.validate(undefined);
      expect(errors).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should throw error for non-existent transformer', async () => {
      await expect(manager.execute('nonexistent', 'test')).rejects.toThrow(
        TransformerError,
      );
    });

    it('should throw error for invalid regex pattern', async () => {
      const transformer: RegexTransformer = {
        id: 'invalid',
        type: 'regex',
        config: {
          pattern: '[',
          replacement: '',
        },
      };

      manager.register(transformer);
      await expect(manager.execute('invalid', 'test')).rejects.toThrow(TransformerError);
    });

    it('should throw error for invalid expression', async () => {
      const transformer: ComputedTransformer = {
        id: 'invalid',
        type: 'computed',
        config: {
          expression: 'invalid syntax {',
        },
      };

      manager.register(transformer);
      await expect(manager.execute('invalid', 'test')).rejects.toThrow(TransformerError);
    });
  });

  describe('utility methods', () => {
    it('should clear all transformers', () => {
      // Initially has 17 built-in transformers
      expect(manager.getIds().length).toBeGreaterThan(0);

      manager.registerAll([
        { id: 'lowercase', type: 'lowercase' },
        { id: 'uppercase', type: 'uppercase' },
      ]);

      manager.clear();
      // Clear removes all transformers including built-ins
      expect(manager.getIds()).toEqual([]);
    });

    it('should get all transformer IDs', () => {
      // Built-in transformers are auto-registered, so we expect 17 by default
      const initialIds = manager.getIds();
      expect(initialIds).toHaveLength(17);

      manager.registerAll([
        { id: 'lowercase', type: 'lowercase' },
        { id: 'uppercase', type: 'uppercase' },
      ]);

      const ids = manager.getIds();
      expect(ids).toContain('lowercase');
      expect(ids).toContain('uppercase');
      // Should still have 17 since lowercase and uppercase are already registered
      expect(ids).toHaveLength(17);
    });
  });
});
