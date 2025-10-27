import type { ResolvedFileInfo } from '../../src/utils/resolve-and-fetch-file';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as configInheritance from '../../src/configurations/index';
import {
  cleanupTempFile,
  resolveAndFetchFile,
} from '../../src/utils/resolve-and-fetch-file';

// Mock the modules
vi.mock('node:fs');
vi.mock('node:os');
vi.mock('../../src/configurations/index', () => ({
  fetchConfigurationFile: vi.fn(),
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
      const url = 'https://example.com/script';
      const content = 'console.log("hello");';
      vi.mocked(configInheritance.fetchConfigurationFile).mockResolvedValue(content);

      const result = await resolveAndFetchFile({
        file: url,
        tempFileExtension: '',
        tempFilePrefix: 'test',
      });

      expect(result.isRemote).toBe(true);
      expect(result.originalPath).toBe(url);
      expect(result.resolvedPath).toBe(url);
      expect(result.localFilePath).toContain('test-');
      expect(result.localFilePath).toContain('');
      expect(configInheritance.fetchConfigurationFile).toHaveBeenCalledWith(url);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        result.localFilePath,
        content,
        'utf-8',
      );
    });
  });

  describe('local absolute path', () => {
    it('should return local path as-is for absolute path', async () => {
      const filePath = '/absolute/path/to/script';
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
      const filePath = '/nonexistent/file';
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
      const relPath = './script';
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
      const relPath = './script';
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
      const relPath = './script';
      const sourceUrl = 'https://example.com/configs/config.json';
      const expectedUrl = 'https://example.com/configs/script';
      const content = 'console.log("remote");';

      vi.mocked(configInheritance.fetchConfigurationFile).mockResolvedValue(content);

      const result = await resolveAndFetchFile({
        file: relPath,
        sourceUrl,
        tempFileExtension: '',
        tempFilePrefix: 'test',
      });

      expect(result.isRemote).toBe(true);
      expect(result.originalPath).toBe(relPath);
      expect(result.resolvedPath).toBe(expectedUrl);
      expect(result.localFilePath).toContain('test-');
      expect(result.localFilePath).toContain('');
      expect(configInheritance.fetchConfigurationFile).toHaveBeenCalledWith(expectedUrl);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        result.localFilePath,
        content,
        'utf-8',
      );
    });

    it('should handle parent directory navigation in relative URL', async () => {
      const relPath = '../shared/script';
      const sourceUrl = 'https://example.com/configs/app/config.json';
      const expectedUrl = 'https://example.com/configs/shared/script';
      const content = 'console.log("shared");';

      vi.mocked(configInheritance.fetchConfigurationFile).mockResolvedValue(content);

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
      vi.mocked(configInheritance.fetchConfigurationFile).mockResolvedValue('content');

      const result = await resolveAndFetchFile({
        file: url,
      });

      expect(result.localFilePath).toMatch(/\.tmp$/u);
    });

    it('should use default temp file prefix if not provided', async () => {
      const url = 'https://example.com/script';
      vi.mocked(configInheritance.fetchConfigurationFile).mockResolvedValue('content');

      const result = await resolveAndFetchFile({
        file: url,
      });

      expect(result.localFilePath).toMatch(/scaffoldfy-\d+\.tmp$/u);
    });

    it('should handle empty string sourceUrl as undefined', async () => {
      const relPath = './script';
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
        localFilePath: '/temp/file',
        isRemote: true,
        originalPath: 'https://example.com/file',
        resolvedPath: 'https://example.com/file',
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.unlinkSync).mockImplementation(() => undefined);

      cleanupTempFile(fileInfo);

      expect(fs.unlinkSync).toHaveBeenCalledWith('/temp/file');
    });

    it('should not delete file for local files', () => {
      const fileInfo: ResolvedFileInfo = {
        localFilePath: '/local/file',
        isRemote: false,
        originalPath: './file',
        resolvedPath: '/local/file',
      };

      cleanupTempFile(fileInfo);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should not throw if temp file does not exist', () => {
      const fileInfo: ResolvedFileInfo = {
        localFilePath: '/temp/file',
        isRemote: true,
        originalPath: 'https://example.com/file',
        resolvedPath: 'https://example.com/file',
      };

      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => cleanupTempFile(fileInfo)).not.toThrow();
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should not throw if unlink fails', () => {
      const fileInfo: ResolvedFileInfo = {
        localFilePath: '/temp/file',
        isRemote: true,
        originalPath: 'https://example.com/file',
        resolvedPath: 'https://example.com/file',
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.unlinkSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => cleanupTempFile(fileInfo)).not.toThrow();
    });
  });
});
