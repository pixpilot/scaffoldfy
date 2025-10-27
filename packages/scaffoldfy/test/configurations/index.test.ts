/**
 * Tests for configurations index
 */

import { describe, expect, it } from 'vitest';
import * as configurations from '../../src/configurations';

describe('configurations index', () => {
  it('should export functions', () => {
    expect(configurations.loadConfiguration).toBeDefined();
    expect(typeof configurations.loadConfiguration).toBe('function');
  });
});
