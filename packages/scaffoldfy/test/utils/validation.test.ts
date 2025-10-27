/**
 * Tests for validation utilities
 */

import { describe, expect, it, vi } from 'vitest';
import { log } from '../../src/utils/logger';
import { displayValidationErrors } from '../../src/utils/validation';

// Mock the logger
vi.mock('../../src/utils/logger', () => ({
  log: vi.fn(),
}));

describe('validation utils', () => {
  describe('displayValidationErrors', () => {
    it('should display validation errors with proper formatting', () => {
      displayValidationErrors(['Error 1', 'Error 2']);

      expect(log).toHaveBeenCalledWith('❌ Template validation failed:', 'error');
      expect(log).toHaveBeenCalledWith('', 'error');
      expect(log).toHaveBeenCalledWith('  • Error 1', 'error');
      expect(log).toHaveBeenCalledWith('  • Error 2', 'error');
      expect(log).toHaveBeenCalledWith('', 'error');
      expect(log).toHaveBeenCalledWith(
        'Please fix these errors before continuing.',
        'error',
      );
    });

    it('should handle empty error array', () => {
      displayValidationErrors([]);

      expect(log).toHaveBeenCalledWith('❌ Template validation failed:', 'error');
      expect(log).toHaveBeenCalledWith('', 'error');
      expect(log).toHaveBeenCalledWith('', 'error');
      expect(log).toHaveBeenCalledWith(
        'Please fix these errors before continuing.',
        'error',
      );
    });
  });
});
