/**
 * Tests for resolving all variable values
 */

import type { VariableDefinition } from '../../src/types';

import { describe, expect, it } from 'vitest';

import { resolveAllVariableValues } from '../../src/variables/resolve-all-variable-values';

describe('resolveAllVariableValues', () => {
  it('should resolve multiple variables', async () => {
    const variables: VariableDefinition[] = [
      { id: 'var1', value: 'static value' },
      { id: 'var2', value: 42 },
      { id: 'var3', value: true },
    ];

    const resolved = await resolveAllVariableValues(variables);

    expect(resolved.get('var1')).toBe('static value');
    expect(resolved.get('var2')).toBe(42);
    expect(resolved.get('var3')).toBe(true);
  });

  it('should resolve exec variables in parallel', async () => {
    const variables: VariableDefinition[] = [
      { id: 'echo1', value: { type: 'exec', value: 'echo test1' } },
      { id: 'echo2', value: { type: 'exec', value: 'echo test2' } },
    ];

    const resolved = await resolveAllVariableValues(variables);

    expect(resolved.get('echo1')).toBe('test1');
    expect(resolved.get('echo2')).toBe('test2');
  });

  it('should handle empty array', async () => {
    const resolved = await resolveAllVariableValues([]);
    expect(resolved.size).toBe(0);
  });

  it('should skip variables that fail to resolve', async () => {
    const variables: VariableDefinition[] = [
      { id: 'valid', value: 'valid value' },
      { id: 'invalid', value: { type: 'exec', value: 'nonexistent-command' } },
    ];

    const resolved = await resolveAllVariableValues(variables);

    expect(resolved.get('valid')).toBe('valid value');
    expect(resolved.has('invalid')).toBe(false);
  });

  it('should handle mixed static and exec variables', async () => {
    const variables: VariableDefinition[] = [
      { id: 'static', value: 'I am static' },
      { id: 'exec', value: { type: 'exec', value: 'echo I am exec' } },
      { id: 'number', value: 123 },
    ];

    const resolved = await resolveAllVariableValues(variables);

    expect(resolved.size).toBe(3);
    expect(resolved.get('static')).toBe('I am static');
    // Note: On Windows, echo may include quotes in output
    const execValue = resolved.get('exec') as string;
    expect(execValue).toMatch(/I am exec/u);
    expect(resolved.get('number')).toBe(123);
  });
});
