/**
 * Tests for config errors
 */

import { describe, expect, it } from 'vitest';
import { ConfigurationFileNotFoundError } from '../../src/errors/config';

describe('config errors', () => {
  it('should create a config error', () => {
    const error = new ConfigurationFileNotFoundError('config not found', '/path/to/file');
    expect(error.message).toBe('config not found');
    expect(error).toBeInstanceOf(Error);
  });
});
