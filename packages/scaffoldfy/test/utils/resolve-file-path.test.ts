import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { resolveFilePath } from '../../src/utils/resolve-file-path';

describe('resolveFilePath', () => {
  describe('url handling', () => {
    it('should return URL as-is when file is already a URL', () => {
      const url = 'https://example.com/template.json';
      expect(resolveFilePath(url)).toBe(url);
      expect(resolveFilePath(url, 'https://base.com')).toBe(url);
    });

    it('should resolve relative path to URL when sourceUrl is a URL', () => {
      const result = resolveFilePath('template.json', 'https://example.com/config.json');
      expect(result).toBe('https://example.com/template.json');
    });

    it('should resolve relative path with subdirectories to URL', () => {
      const result = resolveFilePath(
        'subdir/template.json',
        'https://example.com/config.json',
      );
      expect(result).toBe('https://example.com/subdir/template.json');
    });
  });

  describe('local path handling', () => {
    it('should return absolute path as-is', () => {
      const absPath = path.resolve('some/file.json');
      expect(resolveFilePath(absPath)).toBe(absPath);
      expect(resolveFilePath(absPath, '/some/base')).toBe(absPath);
    });

    it('should resolve relative path to CWD when no sourceUrl provided', () => {
      const mockCwd = '/mock/cwd';
      vi.spyOn(process, 'cwd').mockReturnValue(mockCwd);

      const result = resolveFilePath('relative/file.json');
      expect(result).toBe(path.resolve(mockCwd, 'relative/file.json'));

      vi.restoreAllMocks();
    });

    it('should resolve relative path to source directory when sourceUrl is local path', () => {
      const sourcePath = '/base/config.json';
      const result = resolveFilePath('template.json', sourcePath);
      expect(result).toBe(path.resolve('/base', 'template.json'));
    });

    it('should resolve relative path with subdirectories to source directory', () => {
      const sourcePath = '/base/config.json';
      const result = resolveFilePath('subdir/template.json', sourcePath);
      expect(result).toBe(path.resolve('/base', 'subdir/template.json'));
    });

    it('should resolve parent directory path to source directory', () => {
      const sourcePath = '/base/subdir/config.json';
      const result = resolveFilePath('../template.json', sourcePath);
      expect(result).toBe(path.resolve('/base', 'template.json'));
    });
  });

  describe('edge cases', () => {
    it('should handle empty sourceUrl as no sourceUrl', () => {
      const mockCwd = '/mock/cwd';
      vi.spyOn(process, 'cwd').mockReturnValue(mockCwd);

      const result = resolveFilePath('file.json', '');
      expect(result).toBe(path.resolve(mockCwd, 'file.json'));

      vi.restoreAllMocks();
    });

    it('should handle undefined sourceUrl as no sourceUrl', () => {
      const mockCwd = '/mock/cwd';
      vi.spyOn(process, 'cwd').mockReturnValue(mockCwd);

      const result = resolveFilePath('file.json', undefined);
      expect(result).toBe(path.resolve(mockCwd, 'file.json'));

      vi.restoreAllMocks();
    });
  });
});
