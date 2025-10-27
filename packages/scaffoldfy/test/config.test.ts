/**
 * Tests for configuration initialization
 */

import { describe, expect, it } from 'vitest';
import { createInitialConfig } from '../src/config';

describe('configuration Initialization', () => {
  it('should create empty initial config', () => {
    const config = createInitialConfig();
    expect(config).toEqual({});
    expect(typeof config).toBe('object');
  });

  it('should allow adding properties dynamically', () => {
    const config = createInitialConfig();
    config['customProp'] = 'test-value';
    config['anotherProp'] = 123;

    expect(config['customProp']).toBe('test-value');
    expect(config['anotherProp']).toBe(123);
  });
});
