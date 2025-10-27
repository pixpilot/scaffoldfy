/**
 * Tests for prompts index
 */

import { describe, expect, it } from 'vitest';
import * as prompts from '../../src/prompts';

describe('prompts index', () => {
  it('should export functions', () => {
    expect(prompts.collectPrompts).toBeDefined();
    expect(typeof prompts.collectPrompts).toBe('function');
  });
});
