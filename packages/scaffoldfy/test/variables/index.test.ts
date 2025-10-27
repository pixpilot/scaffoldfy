/**
 * Tests for variables index
 */

import { describe, expect, it } from 'vitest';
import * as variables from '../../src/variables';

describe('variables index', () => {
  it('should export functions', () => {
    expect(variables.collectVariables).toBeDefined();
    expect(typeof variables.collectVariables).toBe('function');
  });
});
