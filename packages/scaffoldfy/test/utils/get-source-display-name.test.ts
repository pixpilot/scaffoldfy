/**
 * Tests for utils get source display name
 */

import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { getSourceDisplayName } from '../../src/utils/get-source-display-name';

describe('utils get source display name', () => {
  it('should export getSourceDisplayName function', () => {
    expect(getSourceDisplayName).toBeDefined();
    expect(typeof getSourceDisplayName).toBe('function');
  });

  it('should return "current configuration" for null or empty sourceUrl', () => {
    expect(getSourceDisplayName()).toBe('current configuration');
    expect(getSourceDisplayName('')).toBe('current configuration');
  });

  it('should return the URL as-is for URLs', () => {
    expect(getSourceDisplayName('http://example.com')).toBe('http://example.com');
    expect(getSourceDisplayName('https://example.com/path')).toBe(
      'https://example.com/path',
    );
  });

  it('should return relative path for absolute paths within cwd', () => {
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/home/user/project');

    expect(getSourceDisplayName('/home/user/project/config.json')).toBe('config.json');
    expect(getSourceDisplayName('/home/user/project/subdir/config.json')).toBe(
      path.normalize('subdir/config.json'),
    );

    cwdSpy.mockRestore();
  });

  it('should return absolute path for paths outside cwd', () => {
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/home/user/project');

    expect(getSourceDisplayName('/other/path/config.json')).toBe(
      '/other/path/config.json',
    );

    cwdSpy.mockRestore();
  });
});
