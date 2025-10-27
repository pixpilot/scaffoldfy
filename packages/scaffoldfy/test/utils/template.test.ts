/**
 * Tests for utils template
 */

import { describe, expect, it } from 'vitest';
import { interpolateTemplate } from '../../src/utils/template';

describe('utils template', () => {
  it('should export interpolateTemplate function', () => {
    expect(interpolateTemplate).toBeDefined();
    expect(typeof interpolateTemplate).toBe('function');
  });

  it('should interpolate simple variables', () => {
    const template = 'Hello {{name}}!';
    const config = { name: 'World' };

    const result = interpolateTemplate(template, config);

    expect(result).toBe('Hello World!');
  });

  it('should handle nested properties', () => {
    const template = 'User: {{user.name}} from {{user.location}}';
    const config = { user: { name: 'Alice', location: 'Wonderland' } };

    const result = interpolateTemplate(template, config);

    expect(result).toBe('User: Alice from Wonderland');
  });

  it('should handle missing variables', () => {
    const template = 'Hello {{name}}!';
    const config = {};

    const result = interpolateTemplate(template, config);

    expect(result).toBe('Hello !');
  });

  it('should handle multiple variables', () => {
    const template = '{{greeting}} {{name}}!';
    const config = { greeting: 'Hi', name: 'Bob' };

    const result = interpolateTemplate(template, config);

    expect(result).toBe('Hi Bob!');
  });

  it('should convert non-string values to strings', () => {
    const template = 'Count: {{count}}';
    const config = { count: 42 };

    const result = interpolateTemplate(template, config);

    expect(result).toBe('Count: 42');
  });
});
