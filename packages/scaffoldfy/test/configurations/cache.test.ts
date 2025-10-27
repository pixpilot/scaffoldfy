/**
 * Tests for configuration cache functionality
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  clearConfigurationCache,
  configurationCache,
} from '../../src/configurations/cache.js';

describe('configurationCache', () => {
  afterEach(() => {
    // Clean up after each test
    clearConfigurationCache();
  });

  it('should start empty', () => {
    expect(configurationCache.size).toBe(0);
  });

  it('should allow setting and getting values', () => {
    const testConfig = {
      name: 'test-template',
      description: 'A test configuration',
    };

    configurationCache.set('test-key', testConfig);
    expect(configurationCache.size).toBe(1);
    expect(configurationCache.get('test-key')).toEqual(testConfig);
  });

  it('should clear the cache', () => {
    const testConfig = {
      name: 'test-template',
      description: 'A test configuration',
    };

    configurationCache.set('test-key', testConfig);
    expect(configurationCache.size).toBe(1);

    clearConfigurationCache();
    expect(configurationCache.size).toBe(0);
  });
});
