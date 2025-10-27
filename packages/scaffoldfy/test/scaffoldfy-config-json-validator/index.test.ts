/**
 * Tests for scaffoldfy config json validator index
 */

import { describe, expect, it } from 'vitest';
import * as validator from '../../src/scaffoldfy-config-validator';

describe('scaffoldfy config json validator index', () => {
  it('should export functions', () => {
    expect(validator.validateScaffoldfyJsonFile).toBeDefined();
    expect(typeof validator.validateScaffoldfyJsonFile).toBe('function');
  });
});
