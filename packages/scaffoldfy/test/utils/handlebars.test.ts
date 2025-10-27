/**
 * Tests for utils handlebars
 */

import { describe, expect, it } from 'vitest';
import { compileHandlebarsTemplate } from '../../src/utils/handlebars';

describe('utils handlebars', () => {
  it('should export compileHandlebarsTemplate function', () => {
    expect(compileHandlebarsTemplate).toBeDefined();
    expect(typeof compileHandlebarsTemplate).toBe('function');
  });

  it('should compile a simple template with variables', () => {
    const template = 'Hello {{name}}!';
    const config = { name: 'World' };

    const result = compileHandlebarsTemplate(template, config);

    expect(result).toBe('Hello World!');
  });

  it('should handle templates with no variables', () => {
    const template = 'Hello World!';
    const config = {};

    const result = compileHandlebarsTemplate(template, config);

    expect(result).toBe('Hello World!');
  });

  it('should handle complex templates with multiple variables', () => {
    const template = '{{greeting}} {{name}} from {{location}}!';
    const config = { greeting: 'Hello', name: 'Alice', location: 'Wonderland' };

    const result = compileHandlebarsTemplate(template, config);

    expect(result).toBe('Hello Alice from Wonderland!');
  });

  it('should handle missing variables gracefully', () => {
    const template = 'Hello {{name}}!';
    const config = {}; // name is missing

    const result = compileHandlebarsTemplate(template, config);

    expect(result).toBe('Hello !');
  });
});
