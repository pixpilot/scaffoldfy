import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  debug,
  error,
  info,
  isDebugEnabled,
  log,
  setDebugMode,
  success,
  warn,
} from '../../src/utils/logger';

describe('logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    setDebugMode(false); // Reset debug mode before each test
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('setDebugMode and isDebugEnabled', () => {
    it('should default to false', () => {
      expect(isDebugEnabled()).toBe(false);
    });

    it('should enable debug mode', () => {
      setDebugMode(true);
      expect(isDebugEnabled()).toBe(true);
    });

    it('should disable debug mode', () => {
      setDebugMode(true);
      setDebugMode(false);
      expect(isDebugEnabled()).toBe(false);
    });
  });

  describe('debug', () => {
    it('should not log when debug mode is disabled', () => {
      setDebugMode(false);
      debug('test message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log when debug mode is enabled', () => {
      setDebugMode(true);
      debug('test message');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('test message'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('🐛'));
    });
  });

  describe('info', () => {
    it('should log info messages', () => {
      info('test message');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('test message'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('ℹ'));
    });
  });

  describe('success', () => {
    it('should log success messages', () => {
      success('test message');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('test message'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✓'));
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      warn('test message');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('test message'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('⚠'));
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      error('test message');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('test message'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✗'));
    });
  });

  describe('log (generic function)', () => {
    it('should call debug when type is debug', () => {
      setDebugMode(true);
      log('test message', 'debug');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('🐛'));
    });

    it('should call info when type is info', () => {
      log('test message', 'info');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('ℹ'));
    });

    it('should call success when type is success', () => {
      log('test message', 'success');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✓'));
    });

    it('should call warn when type is warn', () => {
      log('test message', 'warn');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('⚠'));
    });

    it('should call error when type is error', () => {
      log('test message', 'error');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✗'));
    });

    it('should default to info when no type is provided', () => {
      log('test message');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('ℹ'));
    });
  });

  describe('color codes', () => {
    it('should include color codes in output', () => {
      info('test message');
      const call = consoleLogSpy.mock.calls[0]?.[0] as string;
      // eslint-disable-next-line require-unicode-regexp, no-control-regex
      expect(call).toMatch(/\x1B\[\d+m/); // ANSI color code pattern
    });

    it('should include reset code at the end', () => {
      info('test message');
      const call = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(call).toContain('\x1B[0m'); // Reset code
    });
  });
});
