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
    // Use a JSON array to avoid complex shell quoting issues with object properties
    // Arrays are simpler and work cross-platform reliably
    const result = await resolveVariableValue(
      { type: 'exec', value: 'node -p "JSON.stringify([1,2,3])"' },
      'testVar',
    );
    expect(result).toEqual([1, 2, 3]);
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

  it('should NOT interpolate template variables in direct string values', async () => {
    const result = await resolveVariableValue('Hello {{name}}!', 'testVar', {
      name: 'World',
    });
    expect(result).toBe('Hello {{name}}!'); // Should NOT be interpolated
  });

  it('should not interpolate when context is missing for simple strings', async () => {
    const result = await resolveVariableValue('Hello {{name}}!', 'testVar');
    expect(result).toBe('Hello {{name}}!');
  });
});

describe('interpolate type variable values', () => {
  it('should resolve interpolate type with single variable', async () => {
    const result = await resolveVariableValue(
      { type: 'interpolate', value: 'Hello {{name}}!' },
      'testVar',
      { name: 'World' },
    );
    expect(result).toBe('Hello World!');
  });

  it('should resolve interpolate type with multiple variables', async () => {
    const result = await resolveVariableValue(
      { type: 'interpolate', value: '{{firstName}} {{lastName}}' },
      'fullName',
      { firstName: 'John', lastName: 'Doe' },
    );
    expect(result).toBe('John Doe');
  });

  it('should resolve interpolate type referencing previously resolved variable', async () => {
    const result = await resolveVariableValue(
      { type: 'interpolate', value: '{{projectName}}-{{env}}' },
      'appName',
      { projectName: 'my-app', env: 'production' },
    );
    expect(result).toBe('my-app-production');
  });

  it('should resolve interpolate type referencing previously resolved prompt', async () => {
    const result = await resolveVariableValue(
      { type: 'interpolate', value: 'https://github.com/{{repoOwner}}/{{repoName}}' },
      'repoUrl',
      { repoOwner: 'pixpilot', repoName: 'scaffoldfy' },
    );
    expect(result).toBe('https://github.com/pixpilot/scaffoldfy');
  });

  it('should resolve interpolate type with complex interpolation', async () => {
    const result = await resolveVariableValue(
      { type: 'interpolate', value: '@{{scope}}/{{packageName}}' },
      'fullPackageName',
      { scope: 'myorg', packageName: 'my-package' },
    );
    expect(result).toBe('@myorg/my-package');
  });

  it('should return original template when context is missing', async () => {
    const result = await resolveVariableValue(
      { type: 'interpolate', value: 'Hello {{name}}!' },
      'testVar',
    );
    expect(result).toBe('Hello {{name}}!');
  });

  it('should return undefined for interpolate type with non-string value', async () => {
    const result = await resolveVariableValue(
      { type: 'interpolate', value: 123 } as never,
      'testVar',
    );
    expect(result).toBeUndefined();
  });

  it('should handle missing variables gracefully', async () => {
    const result = await resolveVariableValue(
      { type: 'interpolate', value: 'Hello {{name}}!' },
      'testVar',
      { otherVar: 'value' },
    );
    // interpolateTemplate should handle missing variables
    expect(result).toBeDefined();
  });

  it('should resolve nested template references', async () => {
    const result = await resolveVariableValue(
      { type: 'interpolate', value: '{{author}}-{{email}}' },
      'authorInfo',
      { author: 'Jane', email: 'jane@example.com' },
    );
    expect(result).toBe('Jane-jane@example.com');
  });

  it('should work with numbers in template context', async () => {
    const result = await resolveVariableValue(
      { type: 'interpolate', value: 'Port: {{port}}' },
      'portInfo',
      { port: 3000 },
    );
    expect(result).toBe('Port: 3000');
  });

  it('should work with boolean values in template context', async () => {
    const result = await resolveVariableValue(
      { type: 'interpolate', value: 'Enabled: {{enabled}}' },
      'status',
      { enabled: true },
    );
    expect(result).toBe('Enabled: true');
  });
});
