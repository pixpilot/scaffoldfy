import type { ResolvedFileInfo } from '../../src/utils/resolve-and-fetch-file.js';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as templateInheritance from '../../src/template-inheritance.js';
import {
  cleanupTempFile,
  resolveAndFetchFile,
} from '../../src/utils/resolve-and-fetch-file.js';

// Mock the modules
vi.mock('node:fs');
vi.mock('node:os');
vi.mock('../../src/template-inheritance.js', () => ({
  fetchTemplateFile: vi.fn(),
}));
vi.mock('../../src/utils/logger', () => ({
  debug: vi.fn(),
  log: vi.fn(),
}));

describe('resolveAndFetchFile', () => {
  const mockCwd = '/mock/cwd';
  const mockTempDir = '/mock/temp';

  beforeEach(() => {
    vi.spyOn(process, 'cwd').mockReturnValue(mockCwd);
    vi.mocked(os.tmpdir).mockReturnValue(mockTempDir);
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('direct URL', () => {
    it('should fetch and create temp file for direct URL', async () => {
      const url = 'https://example.com/script.js';
      const content = 'console.log("hello");';
      vi.mocked(templateInheritance.fetchTemplateFile).mockResolvedValue(content);

      const result = await resolveAndFetchFile({
        file: url,
        tempFileExtension: '.js',
        tempFilePrefix: 'test',
      });

      expect(result.isRemote).toBe(true);
      expect(result.originalPath).toBe(url);
      expect(result.resolvedPath).toBe(url);
      expect(result.localFilePath).toContain('test-');
      expect(result.localFilePath).toContain('.js');
      expect(templateInheritance.fetchTemplateFile).toHaveBeenCalledWith(url);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        result.localFilePath,
        content,
        'utf-8',
      );
    });
  });

  describe('local absolute path', () => {
    it('should return local path as-is for absolute path', async () => {
      const filePath = '/absolute/path/to/script.js';
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await resolveAndFetchFile({
        file: filePath,
      });

      expect(result.isRemote).toBe(false);
      expect(result.originalPath).toBe(filePath);
      expect(result.resolvedPath).toBe(filePath);
      expect(result.localFilePath).toBe(filePath);
      expect(fs.existsSync).toHaveBeenCalledWith(filePath);
    });

    it('should throw error if local absolute path does not exist', async () => {
      const filePath = '/nonexistent/file.js';
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(
        resolveAndFetchFile({
          file: filePath,
        }),
      ).rejects.toThrow(`File not found: ${filePath}`);
    });
  });

  describe('local relative path without sourceUrl', () => {
    it('should resolve relative to CWD when no sourceUrl provided', async () => {
      const relPath = './script.js';
      const expectedPath = path.resolve(mockCwd, relPath);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await resolveAndFetchFile({
        file: relPath,
      });

      expect(result.isRemote).toBe(false);
      expect(result.originalPath).toBe(relPath);
      expect(result.resolvedPath).toBe(expectedPath);
      expect(result.localFilePath).toBe(expectedPath);
      expect(fs.existsSync).toHaveBeenCalledWith(expectedPath);
    });
  });

  describe('local relative path with local sourceUrl', () => {
    it('should resolve relative to local sourceUrl directory', async () => {
      const relPath = './script.js';
      const sourceUrl = '/source/dir/config.json';
      const expectedPath = path.resolve('/source/dir', relPath);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await resolveAndFetchFile({
        file: relPath,
        sourceUrl,
      });

      expect(result.isRemote).toBe(false);
      expect(result.originalPath).toBe(relPath);
      expect(result.resolvedPath).toBe(expectedPath);
      expect(result.localFilePath).toBe(expectedPath);
    });
  });

  describe('relative path with URL sourceUrl (resolves to URL)', () => {
    it('should fetch remote file when relative path resolves to URL', async () => {
      const relPath = './script.js';
      const sourceUrl = 'https://example.com/configs/config.json';
      const expectedUrl = 'https://example.com/configs/script.js';
      const content = 'console.log("remote");';

      vi.mocked(templateInheritance.fetchTemplateFile).mockResolvedValue(content);

      const result = await resolveAndFetchFile({
        file: relPath,
        sourceUrl,
        tempFileExtension: '.js',
        tempFilePrefix: 'test',
      });

      expect(result.isRemote).toBe(true);
      expect(result.originalPath).toBe(relPath);
      expect(result.resolvedPath).toBe(expectedUrl);
      expect(result.localFilePath).toContain('test-');
      expect(result.localFilePath).toContain('.js');
      expect(templateInheritance.fetchTemplateFile).toHaveBeenCalledWith(expectedUrl);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        result.localFilePath,
        content,
        'utf-8',
      );
    });

    it('should handle parent directory navigation in relative URL', async () => {
      const relPath = '../shared/script.js';
      const sourceUrl = 'https://example.com/configs/app/config.json';
      const expectedUrl = 'https://example.com/configs/shared/script.js';
      const content = 'console.log("shared");';

      vi.mocked(templateInheritance.fetchTemplateFile).mockResolvedValue(content);

      const result = await resolveAndFetchFile({
        file: relPath,
        sourceUrl,
      });

      expect(result.resolvedPath).toBe(expectedUrl);
      expect(result.isRemote).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should use default temp file extension if not provided', async () => {
      const url = 'https://example.com/script';
      vi.mocked(templateInheritance.fetchTemplateFile).mockResolvedValue('content');

      const result = await resolveAndFetchFile({
        file: url,
      });

      expect(result.localFilePath).toMatch(/\.tmp$/u);
    });

    it('should use default temp file prefix if not provided', async () => {
      const url = 'https://example.com/script.js';
      vi.mocked(templateInheritance.fetchTemplateFile).mockResolvedValue('content');

      const result = await resolveAndFetchFile({
        file: url,
      });

      expect(result.localFilePath).toMatch(/scaffoldfy-\d+\.tmp$/u);
    });

    it('should handle empty string sourceUrl as undefined', async () => {
      const relPath = './script.js';
      const expectedPath = path.resolve(mockCwd, relPath);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await resolveAndFetchFile({
        file: relPath,
        sourceUrl: '',
      });

      expect(result.resolvedPath).toBe(expectedPath);
    });
  });

  describe('cleanupTempFile', () => {
    it('should delete temp file for remote files', () => {
      const fileInfo: ResolvedFileInfo = {
        localFilePath: '/temp/file.js',
        isRemote: true,
        originalPath: 'https://example.com/file.js',
        resolvedPath: 'https://example.com/file.js',
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.unlinkSync).mockImplementation(() => undefined);

      cleanupTempFile(fileInfo);

      expect(fs.unlinkSync).toHaveBeenCalledWith('/temp/file.js');
    });

    it('should not delete file for local files', () => {
      const fileInfo: ResolvedFileInfo = {
        localFilePath: '/local/file.js',
        isRemote: false,
        originalPath: './file.js',
        resolvedPath: '/local/file.js',
      };

      cleanupTempFile(fileInfo);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should not throw if temp file does not exist', () => {
      const fileInfo: ResolvedFileInfo = {
        localFilePath: '/temp/file.js',
        isRemote: true,
        originalPath: 'https://example.com/file.js',
        resolvedPath: 'https://example.com/file.js',
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => cleanupTempFile(fileInfo)).not.toThrow();
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should not throw if unlink fails', () => {
      const fileInfo: ResolvedFileInfo = {
        localFilePath: '/temp/file.js',
        isRemote: true,
        originalPath: 'https://example.com/file.js',
        resolvedPath: 'https://example.com/file.js',
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.unlinkSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => cleanupTempFile(fileInfo)).not.toThrow();
    });
  });
});
