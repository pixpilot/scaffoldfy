/**
 * Tests for Transformer Manager
 */

import type {
  ChainTransformer,
  ComputedTransformer,
  RegexTransformer,
  Transformer,
} from '../../src/transformers/index';

import { beforeEach, describe, expect, it } from 'vitest';

import { TransformerError } from '../../src/errors/other';
import { TransformerManager } from '../../src/transformers/index';

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

  describe('titlecase transformer', () => {
    it('should convert camelCase to Title Case', async () => {
      const transformer: Transformer = {
        id: 'titlecase',
        type: 'titlecase',
      };

      manager.register(transformer);
      const result = await manager.execute('titlecase', 'fooBar');
      expect(result).toBe('Foo Bar');
    });

    it('should convert kebab-case to Title Case', async () => {
      const transformer: Transformer = {
        id: 'titlecase',
        type: 'titlecase',
      };

      manager.register(transformer);
      const result = await manager.execute('titlecase', 'foo-bar');
      expect(result).toBe('Foo Bar');
    });

    it('should convert snake_case to Title Case', async () => {
      const transformer: Transformer = {
        id: 'titlecase',
        type: 'titlecase',
      };

      manager.register(transformer);
      const result = await manager.execute('titlecase', 'foo_bar');
      expect(result).toBe('Foo Bar');
    });

    it('should convert PascalCase to Title Case', async () => {
      const transformer: Transformer = {
        id: 'titlecase',
        type: 'titlecase',
      };

      manager.register(transformer);
      const result = await manager.execute('titlecase', 'FooBar');
      expect(result).toBe('Foo Bar');
    });

    it('should handle multiple words', async () => {
      const transformer: Transformer = {
        id: 'titlecase',
        type: 'titlecase',
      };

      manager.register(transformer);
      const result = await manager.execute('titlecase', 'helloWorldExample');
      expect(result).toBe('Hello World Example');
    });

    it('should handle already spaced text', async () => {
      const transformer: Transformer = {
        id: 'titlecase',
        type: 'titlecase',
      };

      manager.register(transformer);
      const result = await manager.execute('titlecase', 'hello world');
      expect(result).toBe('Hello World');
    });

    it('should handle mixed formats', async () => {
      const transformer: Transformer = {
        id: 'titlecase',
        type: 'titlecase',
      };

      manager.register(transformer);
      const result = await manager.execute('titlecase', 'foo-bar_bazQux');
      expect(result).toBe('Foo Bar Baz Qux');
    });
  });

  describe('capitalCase transformer', () => {
    it('should convert camelCase to Capital Case', async () => {
      const transformer: Transformer = {
        id: 'capitalCase',
        type: 'capitalCase',
      };

      manager.register(transformer);
      const result = await manager.execute('capitalCase', 'fooBar');
      expect(result).toBe('Foo Bar');
    });

    it('should convert kebab-case to Capital Case', async () => {
      const transformer: Transformer = {
        id: 'capitalCase',
        type: 'capitalCase',
      };

      manager.register(transformer);
      const result = await manager.execute('capitalCase', 'foo-bar');
      expect(result).toBe('Foo-Bar');
    });

    it('should convert snake_case to Capital Case', async () => {
      const transformer: Transformer = {
        id: 'capitalCase',
        type: 'capitalCase',
      };

      manager.register(transformer);
      const result = await manager.execute('capitalCase', 'foo_bar');
      expect(result).toBe('Foo_Bar');
    });

    it('should convert PascalCase to Capital Case', async () => {
      const transformer: Transformer = {
        id: 'capitalCase',
        type: 'capitalCase',
      };

      manager.register(transformer);
      const result = await manager.execute('capitalCase', 'FooBar');
      expect(result).toBe('Foo Bar');
    });

    it('should handle multiple words', async () => {
      const transformer: Transformer = {
        id: 'capitalCase',
        type: 'capitalCase',
      };

      manager.register(transformer);
      const result = await manager.execute('capitalCase', 'helloWorldExample');
      expect(result).toBe('Hello World Example');
    });

    it('should handle already spaced text', async () => {
      const transformer: Transformer = {
        id: 'capitalCase',
        type: 'capitalCase',
      };

      manager.register(transformer);
      const result = await manager.execute('capitalCase', 'hello world');
      expect(result).toBe('Hello World');
    });

    it('should handle mixed formats', async () => {
      const transformer: Transformer = {
        id: 'capitalCase',
        type: 'capitalCase',
      };

      manager.register(transformer);
      const result = await manager.execute('capitalCase', 'foo-bar_bazQux');
      expect(result).toBe('Foo-Bar_Baz Qux');
    });
  });

  describe('adaCase transformer', () => {
    it('should convert camelCase to Ada_Case', async () => {
      const transformer: Transformer = {
        id: 'adaCase',
        type: 'adaCase',
      };

      manager.register(transformer);
      const result = await manager.execute('adaCase', 'fooBar');
      expect(result).toBe('Foo_Bar');
    });

    it('should convert kebab-case to Ada_Case', async () => {
      const transformer: Transformer = {
        id: 'adaCase',
        type: 'adaCase',
      };

      manager.register(transformer);
      const result = await manager.execute('adaCase', 'foo-bar-baz');
      expect(result).toBe('Foo_Bar_Baz');
    });
  });

  describe('cobolCase transformer', () => {
    it('should convert camelCase to COBOL-CASE', async () => {
      const transformer: Transformer = {
        id: 'cobolCase',
        type: 'cobolCase',
      };

      manager.register(transformer);
      const result = await manager.execute('cobolCase', 'fooBar');
      expect(result).toBe('FOO-BAR');
    });

    it('should convert snake_case to COBOL-CASE', async () => {
      const transformer: Transformer = {
        id: 'cobolCase',
        type: 'cobolCase',
      };

      manager.register(transformer);
      const result = await manager.execute('cobolCase', 'foo_bar_baz');
      expect(result).toBe('FOO-BAR-BAZ');
    });
  });

  describe('dotNotation transformer', () => {
    it('should convert camelCase to dot.notation', async () => {
      const transformer: Transformer = {
        id: 'dotNotation',
        type: 'dotNotation',
      };

      manager.register(transformer);
      const result = await manager.execute('dotNotation', 'fooBar');
      expect(result).toBe('foo.Bar');
    });

    it('should convert kebab-case to dot.notation', async () => {
      const transformer: Transformer = {
        id: 'dotNotation',
        type: 'dotNotation',
      };

      manager.register(transformer);
      const result = await manager.execute('dotNotation', 'foo-bar-baz');
      expect(result).toBe('foo.bar.baz');
    });
  });

  describe('pathCase transformer', () => {
    it('should convert camelCase to path/case', async () => {
      const transformer: Transformer = {
        id: 'pathCase',
        type: 'pathCase',
      };

      manager.register(transformer);
      const result = await manager.execute('pathCase', 'fooBar');
      expect(result).toBe('foo/Bar');
    });

    it('should convert PascalCase to path/case', async () => {
      const transformer: Transformer = {
        id: 'pathCase',
        type: 'pathCase',
      };

      manager.register(transformer);
      const result = await manager.execute('pathCase', 'FooBarBaz');
      expect(result).toBe('Foo/Bar/Baz');
    });
  });

  describe('spaceCase transformer', () => {
    it('should convert camelCase to space case', async () => {
      const transformer: Transformer = {
        id: 'spaceCase',
        type: 'spaceCase',
      };

      manager.register(transformer);
      const result = await manager.execute('spaceCase', 'fooBar');
      expect(result).toBe('foo Bar');
    });

    it('should convert kebab-case to space case', async () => {
      const transformer: Transformer = {
        id: 'spaceCase',
        type: 'spaceCase',
      };

      manager.register(transformer);
      const result = await manager.execute('spaceCase', 'foo-bar-baz');
      expect(result).toBe('foo-bar-baz');
    });

    it('should convert snake_case to space case', async () => {
      const transformer: Transformer = {
        id: 'spaceCase',
        type: 'spaceCase',
      };

      manager.register(transformer);
      const result = await manager.execute('spaceCase', 'foo_bar_baz');
      expect(result).toBe('foo_bar_baz');
    });
  });

  describe('trainCase transformer', () => {
    it('should convert camelCase to Train-Case', async () => {
      const transformer: Transformer = {
        id: 'trainCase',
        type: 'trainCase',
      };

      manager.register(transformer);
      const result = await manager.execute('trainCase', 'fooBar');
      expect(result).toBe('Foo-Bar');
    });

    it('should convert snake_case to Train-Case', async () => {
      const transformer: Transformer = {
        id: 'trainCase',
        type: 'trainCase',
      };

      manager.register(transformer);
      const result = await manager.execute('trainCase', 'foo_bar_baz');
      expect(result).toBe('Foo-Bar-Baz');
    });

    it('should handle spaces', async () => {
      const transformer: Transformer = {
        id: 'trainCase',
        type: 'trainCase',
      };

      manager.register(transformer);
      const result = await manager.execute('trainCase', 'hello world');
      expect(result).toBe('Hello-World');
    });
  });

  describe('upperCamelCase transformer', () => {
    it('should convert kebab-case to UpperCamelCase', async () => {
      const transformer: Transformer = {
        id: 'upperCamelCase',
        type: 'upperCamelCase',
      };

      manager.register(transformer);
      const result = await manager.execute('upperCamelCase', 'foo-bar');
      expect(result).toBe('FooBar');
    });

    it('should convert snake_case to UpperCamelCase', async () => {
      const transformer: Transformer = {
        id: 'upperCamelCase',
        type: 'upperCamelCase',
      };

      manager.register(transformer);
      const result = await manager.execute('upperCamelCase', 'foo_bar_baz');
      expect(result).toBe('FooBarBaz');
    });

    it('should convert camelCase to UpperCamelCase', async () => {
      const transformer: Transformer = {
        id: 'upperCamelCase',
        type: 'upperCamelCase',
      };

      manager.register(transformer);
      const result = await manager.execute('upperCamelCase', 'fooBar');
      expect(result).toBe('FooBar');
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
      // Initially has 25 built-in transformers
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
      // Built-in transformers are auto-registered, so we expect 25 by default
      const initialIds = manager.getIds();
      expect(initialIds).toHaveLength(25);

      manager.registerAll([
        { id: 'lowercase', type: 'lowercase' },
        { id: 'uppercase', type: 'uppercase' },
      ]);

      const ids = manager.getIds();
      expect(ids).toContain('lowercase');
      expect(ids).toContain('uppercase');
      // Should still have 25 since lowercase and uppercase are already registered
      expect(ids).toHaveLength(25);
    });
  });
});
