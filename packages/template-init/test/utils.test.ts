/**
 * Tests for utility functions
 */

import type { InitConfig } from '../src/types.js';
import { describe, expect, it } from 'vitest';
import {
  evaluateCondition,
  interpolateTemplate,
  setNestedProperty,
} from '../src/utils.js';

describe('template Interpolation', () => {
  const config: InitConfig = {
    repoName: 'my-repo',
    repoOwner: 'my-owner',
    repoUrl: 'https://github.com/my-owner/my-repo.git',
    author: 'John Doe',
    baseRepoUrl: 'https://github.com/my-owner/my-repo',
    defaultBundler: 'tsc',
    orgName: '@my-org',
    keepExamplePackages: true,
  };

  it('should interpolate single variable', () => {
    const result = interpolateTemplate('Hello {{author}}', config);
    expect(result).toBe('Hello John Doe');
  });

  it('should interpolate multiple variables', () => {
    const result = interpolateTemplate('{{repoOwner}}/{{repoName}}', config);
    expect(result).toBe('my-owner/my-repo');
  });

  it('should handle missing variables', () => {
    const result = interpolateTemplate('Hello {{missing}}', config);
    expect(result).toBe('Hello ');
  });

  it('should work with complex templates', () => {
    const template = `# {{repoName}}
Repository: {{baseRepoUrl}}
Author: {{author}}
Organization: {{orgName}}`;

    const result = interpolateTemplate(template, config);

    expect(result).toContain('# my-repo');
    expect(result).toContain('Author: John Doe');
    expect(result).toContain('Organization: @my-org');
  });

  it('should not interpolate incomplete templates', () => {
    const result = interpolateTemplate('Hello {author}', config);
    expect(result).toBe('Hello {author}');
  });

  it('should handle empty template', () => {
    const result = interpolateTemplate('', config);
    expect(result).toBe('');
  });
});

describe('condition Evaluation', () => {
  const config: InitConfig = {
    repoName: 'test',
    repoOwner: 'test',
    repoUrl: 'https://github.com/test/test.git',
    author: 'Test',
    baseRepoUrl: 'https://github.com/test/test',
    defaultBundler: 'tsc',
    orgName: '@test',
    keepExamplePackages: false,
  };

  it('should evaluate simple boolean conditions', () => {
    expect(evaluateCondition('keepExamplePackages', config)).toBe(false);
    expect(evaluateCondition('!keepExamplePackages', config)).toBe(true);
  });

  it('should evaluate string comparisons', () => {
    expect(evaluateCondition('defaultBundler === "tsc"', config)).toBe(true);
    expect(evaluateCondition('defaultBundler === "tsdown"', config)).toBe(false);
  });

  it('should evaluate complex conditions', () => {
    expect(
      evaluateCondition('!keepExamplePackages && defaultBundler === "tsc"', config),
    ).toBe(true);

    expect(
      evaluateCondition('keepExamplePackages || defaultBundler === "tsc"', config),
    ).toBe(true);
  });

  it('should handle invalid conditions gracefully', () => {
    // Should return false for invalid conditions rather than throwing
    expect(evaluateCondition('invalid syntax {{', config)).toBe(false);
  });

  it('should evaluate conditions with keepExamplePackages true', () => {
    const configWithExamples = { ...config, keepExamplePackages: true };
    expect(evaluateCondition('keepExamplePackages', configWithExamples)).toBe(true);
    expect(evaluateCondition('!keepExamplePackages', configWithExamples)).toBe(false);
  });

  it('should evaluate numeric comparisons', () => {
    expect(evaluateCondition('repoName.length > 0', config)).toBe(true);
  });
});

describe('set Nested Property', () => {
  it('should set a simple property', () => {
    const obj: Record<string, unknown> = {};
    setNestedProperty(obj, 'name', 'test');
    expect(obj['name']).toBe('test');
  });

  it('should set a nested property', () => {
    const obj: Record<string, unknown> = {};
    setNestedProperty(obj, 'user.name', 'John');
    expect(obj).toEqual({
      user: {
        name: 'John',
      },
    });
  });

  it('should set a deeply nested property', () => {
    const obj: Record<string, unknown> = {};
    setNestedProperty(obj, 'user.profile.name', 'Jane');
    expect(obj).toEqual({
      user: {
        profile: {
          name: 'Jane',
        },
      },
    });
  });

  it('should override existing values', () => {
    const obj: Record<string, unknown> = {
      user: { name: 'Old' },
    };
    setNestedProperty(obj, 'user.name', 'New');
    expect(obj['user']).toEqual({ name: 'New' });
  });

  it('should handle mixed existing and new paths', () => {
    const obj: Record<string, unknown> = {
      user: { name: 'John' },
    };
    setNestedProperty(obj, 'user.age', 30);
    expect(obj['user']).toEqual({ name: 'John', age: 30 });
  });

  it('should create intermediate objects if needed', () => {
    const obj: Record<string, unknown> = {};
    setNestedProperty(obj, 'a.b.c.d', 'value');
    expect(obj).toEqual({
      a: {
        b: {
          c: {
            d: 'value',
          },
        },
      },
    });
  });

  it('should handle setting values of different types', () => {
    const obj: Record<string, unknown> = {};
    setNestedProperty(obj, 'string', 'test');
    setNestedProperty(obj, 'number', 42);
    setNestedProperty(obj, 'boolean', true);
    setNestedProperty(obj, 'array', [1, 2, 3]);

    expect(obj).toEqual({
      string: 'test',
      number: 42,
      boolean: true,
      array: [1, 2, 3],
    });
  });

  it('should handle empty key gracefully', () => {
    const obj: Record<string, unknown> = {};
    setNestedProperty(obj, 'a..b', 'value');
    // Should skip empty keys
    expect(obj).toHaveProperty('a');
  });
});
