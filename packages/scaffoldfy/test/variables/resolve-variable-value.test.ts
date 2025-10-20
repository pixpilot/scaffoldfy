/**
 * Tests for variable value resolution
 */

import { describe, expect, it } from 'vitest';

import { resolveVariableValue } from '../../src/variables/resolve-variable-value.js';

describe('resolveVariableValue', () => {
  it('should resolve static string values', async () => {
    const result = await resolveVariableValue('test value', 'testVar');
    expect(result).toBe('test value');
  });

  it('should resolve static number values', async () => {
    const result = await resolveVariableValue(42, 'testVar');
    expect(result).toBe(42);
  });

  it('should resolve static boolean values', async () => {
    const result = await resolveVariableValue(true, 'testVar');
    expect(result).toBe(true);
  });

  it('should resolve explicit static values', async () => {
    const result = await resolveVariableValue(
      { type: 'static', value: 'explicit static' },
      'testVar',
    );
    expect(result).toBe('explicit static');
  });

  it('should resolve exec values from commands', async () => {
    const result = await resolveVariableValue(
      { type: 'exec', value: 'echo hello' },
      'testVar',
    );
    expect(result).toBe('hello');
  });

  it('should parse JSON output from exec commands', async () => {
    const result = await resolveVariableValue(
      { type: 'exec', value: 'echo {"key": "value"}' },
      'testVar',
    );
    expect(result).toEqual({ key: 'value' });
  });

  it('should parse number output from exec commands', async () => {
    const result = await resolveVariableValue(
      { type: 'exec', value: 'echo 123' },
      'testVar',
    );
    expect(result).toBe(123);
  });

  it('should parse boolean output from exec commands', async () => {
    const result = await resolveVariableValue(
      { type: 'exec', value: 'echo true' },
      'testVar',
    );
    expect(result).toBe(true);
  });

  it('should return undefined for failed exec commands', async () => {
    const result = await resolveVariableValue(
      { type: 'exec', value: 'nonexistent-command' },
      'testVar',
    );
    expect(result).toBeUndefined();
  });

  it('should return undefined for null values', async () => {
    const result = await resolveVariableValue(null as never, 'testVar');
    expect(result).toBeUndefined();
  });

  it('should return undefined for undefined values', async () => {
    const result = await resolveVariableValue(undefined, 'testVar');
    expect(result).toBeUndefined();
  });

  it('should handle arrays as static values', async () => {
    const result = await resolveVariableValue([1, 2, 3], 'testVar');
    expect(result).toEqual([1, 2, 3]);
  });

  it('should handle objects without type as static values', async () => {
    const result = await resolveVariableValue({ key: 'value' }, 'testVar');
    expect(result).toEqual({ key: 'value' });
  });
});
