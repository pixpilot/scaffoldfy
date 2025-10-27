/**
 * Tests for process template
 */

import { describe, expect, it } from 'vitest';
import { processTemplate } from '../../src/template/process-template';

describe('process template', () => {
  it('should export processTemplate function', () => {
    expect(processTemplate).toBeDefined();
    expect(typeof processTemplate).toBe('function');
  });
});
