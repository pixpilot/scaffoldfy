/**
 * Tests for collecting variables
 */

import type { VariableDefinition } from '../../src/types.js';

import { describe, expect, it } from 'vitest';

import { collectVariables } from '../../src/variables/collect-variables.js';

describe('collectVariables', () => {
  it('should collect variables from resolved values', () => {
    const variables: VariableDefinition[] = [
      { id: 'var1', value: 'test' },
      { id: 'var2', value: 42 },
    ];

    const resolvedValues = new Map<string, unknown>();
    resolvedValues.set('var1', 'test');
    resolvedValues.set('var2', 42);

    const collected = collectVariables(variables, resolvedValues);

    expect(collected).toEqual({
      var1: 'test',
      var2: 42,
    });
  });

  it('should handle empty variables array', () => {
    const collected = collectVariables([], new Map());
    expect(collected).toEqual({});
  });

  it('should skip variables without resolved values', () => {
    const variables: VariableDefinition[] = [
      { id: 'present', value: 'test' },
      { id: 'missing', value: 'test' },
    ];

    const resolvedValues = new Map<string, unknown>();
    resolvedValues.set('present', 'test value');

    const collected = collectVariables(variables, resolvedValues);

    expect(collected).toEqual({
      present: 'test value',
    });
    expect(collected).not.toHaveProperty('missing');
  });

  it('should handle empty resolved values map', () => {
    const variables: VariableDefinition[] = [{ id: 'var1', value: 'test' }];

    const collected = collectVariables(variables, new Map());

    expect(collected).toEqual({});
  });

  it('should handle various data types', () => {
    const variables: VariableDefinition[] = [
      { id: 'string', value: 'test' },
      { id: 'number', value: 42 },
      { id: 'boolean', value: true },
      {
        id: 'object',
        value: { type: 'static', value: { key: 'value' } } as never,
      },
      { id: 'array', value: [1, 2, 3] as never },
    ];

    const resolvedValues = new Map<string, unknown>();
    resolvedValues.set('string', 'test');
    resolvedValues.set('number', 42);
    resolvedValues.set('boolean', true);
    resolvedValues.set('object', { key: 'value' });
    resolvedValues.set('array', [1, 2, 3]);

    const collected = collectVariables(variables, resolvedValues);

    expect(collected['string']).toBe('test');
    expect(collected['number']).toBe(42);
    expect(collected['boolean']).toBe(true);
    expect(collected['object']).toEqual({ key: 'value' });
    expect(collected['array']).toEqual([1, 2, 3]);
  });
});
