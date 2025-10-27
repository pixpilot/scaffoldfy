/**
 * Tests for template utils
 */

import { describe, expect, it } from 'vitest';
import { hasInlineTemplate } from '../../src/template/template-utils';

describe('template utils', () => {
  it('should export hasInlineTemplate function', () => {
    expect(hasInlineTemplate).toBeDefined();
    expect(typeof hasInlineTemplate).toBe('function');
  });
});
