/**
 * Tests for utils is url
 */

import { describe, expect, it } from 'vitest';
import { isUrl } from '../../src/utils/is-url';

describe('utils is url', () => {
  it('should export isUrl function', () => {
    expect(isUrl).toBeDefined();
    expect(typeof isUrl).toBe('function');
  });

  it('should return true for valid HTTP URLs', () => {
    expect(isUrl('http://example.com')).toBe(true);
    expect(isUrl('https://example.com')).toBe(true);
    expect(isUrl('http://example.com/path')).toBe(true);
    expect(isUrl('https://example.com/path?query=value')).toBe(true);
  });

  it('should return false for invalid URLs', () => {
    expect(isUrl('not-a-url')).toBe(false);
    expect(isUrl('ftp://example.com')).toBe(false);
    expect(isUrl('file:///path/to/file')).toBe(false);
    expect(isUrl('')).toBe(false);
  });
});
