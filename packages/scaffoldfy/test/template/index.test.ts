/**
 * Tests for template index
 */

import { describe, expect, it } from 'vitest';
import * as template from '../../src/template';

describe('template index', () => {
  it('should export functions', () => {
    expect(template.processTemplate).toBeDefined();
    expect(typeof template.processTemplate).toBe('function');
  });
});
