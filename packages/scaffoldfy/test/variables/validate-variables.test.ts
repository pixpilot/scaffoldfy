/**
 * Tests for variable validation
 */

import type { VariableDefinition } from '../../src/types.js';

import { describe, expect, it } from 'vitest';

import { validateVariables } from '../../src/variables/validate-variables.js';

describe('validateVariables', () => {
  it('should pass validation for valid variables', () => {
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

  it('should reject invalid variable ID formats', () => {
    const variables: VariableDefinition[] = [
      { id: 'invalid-id-with-dash', value: 'test' },
      { id: 'invalid.id.with.dots', value: 'test' },
      { id: 'invalid id with spaces', value: 'test' },
      { id: '123startsWithDigit', value: 'test' },
    ];

    const errors = validateVariables(variables);
    expect(errors.length).toBe(4); // All 4 should be invalid
    expect(errors.some((e: string) => e.includes('invalid-id-with-dash'))).toBe(true);
    expect(errors.some((e: string) => e.includes('invalid.id.with.dots'))).toBe(true);
    expect(errors.some((e: string) => e.includes('invalid id with spaces'))).toBe(true);
    expect(errors.some((e: string) => e.includes('123startsWithDigit'))).toBe(true);
  });

  it('should accept valid variable ID formats', () => {
    const variables: VariableDefinition[] = [
      { id: 'validId', value: 'test' },
      { id: 'valid_id_123', value: 'test' },
      { id: '$dollarSign', value: 'test' },
      { id: '_underscore', value: 'test' },
      { id: 'camelCaseId', value: 'test' },
      { id: 'PascalCaseId', value: 'test' },
      { id: 'snake_case_id', value: 'test' },
      { id: 'id123', value: 'test' }, // digits allowed after first char
    ];

    const errors = validateVariables(variables);
    expect(errors).toEqual([]);
  });

  it('should reject variables without values', () => {
    const variables = [{ id: 'noValue' }] as unknown as VariableDefinition[];

    const errors = validateVariables(variables);
    expect(errors).toContain('Variable "noValue" must have a value');
  });

  it('should validate exec type requires string command', () => {
    const variables: VariableDefinition[] = [
      { id: 'invalidExec', value: { type: 'exec', value: 123 } as never },
    ];

    const errors = validateVariables(variables);
    expect(
      errors.some((e: string) => e.includes('exec type must have a string command')),
    ).toBe(true);
  });

  it('should validate value objects must have type field', () => {
    const variables = [
      { id: 'noType', value: { value: 'test' } },
    ] as unknown as VariableDefinition[];

    const errors = validateVariables(variables);
    expect(errors.some((e: string) => e.includes('must have a "type" field'))).toBe(true);
  });

  it('should validate type must be static or exec', () => {
    const variables = [
      { id: 'invalidType', value: { type: 'invalid', value: 'test' } },
    ] as unknown as VariableDefinition[];

    const errors = validateVariables(variables);
    expect(
      errors.some((e: string) => e.includes('type must be "static" or "exec"')),
    ).toBe(true);
  });

  it('should validate value config must have value field', () => {
    const variables = [
      { id: 'noValue', value: { type: 'static' } },
    ] as unknown as VariableDefinition[];

    const errors = validateVariables(variables);
    expect(errors.some((e: string) => e.includes('must have a "value" field'))).toBe(
      true,
    );
  });

  it('should handle global variables', () => {
    const variables: VariableDefinition[] = [
      { id: 'globalVar', value: 'test' },
      { id: 'localVar', value: 'test' },
      { id: 'defaultVar', value: 'test' },
    ];

    const errors = validateVariables(variables);
    expect(errors).toEqual([]);
  });

  it('should handle empty array', () => {
    const errors = validateVariables([]);
    expect(errors).toEqual([]);
  });
});
