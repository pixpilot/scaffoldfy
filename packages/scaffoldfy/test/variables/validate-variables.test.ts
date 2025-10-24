/**
 * Tests for variable validation
 * Note: Most validation is now handled by JSON Schema (AJV).
 * This only tests duplicate ID detection, which JSON Schema cannot validate.
 */

import type { VariableDefinition } from '../../src/types.js';

import { describe, expect, it } from 'vitest';

import { validateVariables } from '../../src/variables/validate-variables.js';

describe('validateVariables', () => {
  it('should pass validation for valid variables with no duplicates', () => {
    const variables: VariableDefinition[] = [
      { id: 'var1', value: 'test' },
      { id: 'var2', value: 123 },
      { id: 'var3', value: true },
      { id: 'var4', value: { type: 'static', value: 'static value' } },
      { id: 'var5', value: { type: 'exec', value: 'echo hello' } },
    ];

    const errors = validateVariables(variables);
    expect(errors).toEqual([]);
  });

  it('should detect duplicate variable IDs', () => {
    const variables: VariableDefinition[] = [
      { id: 'duplicateId', value: 'value1' },
      { id: 'duplicateId', value: 'value2' },
    ];

    const errors = validateVariables(variables);
    expect(errors).toContain('Duplicate variable ID: "duplicateId"');
  });

  it('should detect multiple duplicate variable IDs', () => {
    const variables: VariableDefinition[] = [
      { id: 'dup1', value: 'value1' },
      { id: 'dup1', value: 'value2' },
      { id: 'unique', value: 'value3' },
      { id: 'dup2', value: 'value4' },
      { id: 'dup2', value: 'value5' },
    ];

    const errors = validateVariables(variables);
    expect(errors.length).toBe(2);
    expect(errors).toContain('Duplicate variable ID: "dup1"');
    expect(errors).toContain('Duplicate variable ID: "dup2"');
  });

  it('should handle empty array', () => {
    const errors = validateVariables([]);
    expect(errors).toEqual([]);
  });
});
