/**
 * Tests for scaffoldfy config validator
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  displayValidationErrors,
  validateScaffoldfyJsonFile,
  validateTasksSchema,
} from '../../src/scaffoldfy-config-validator';
import { log } from '../../src/utils';

// Mock the logger
vi.mock('../../src/utils', () => ({
  log: vi.fn(),
}));

describe('scaffoldfy config validator', () => {
  describe('displayValidationErrors', () => {
    it('should display validation errors with proper formatting', () => {
      displayValidationErrors(['Error 1', 'Error 2']);

      expect(log).toHaveBeenCalledWith('❌ Schema validation failed:', 'error');
      expect(log).toHaveBeenCalledWith('', 'error');
      expect(log).toHaveBeenCalledWith(
        'The following validation errors were found:',
        'error',
      );
      expect(log).toHaveBeenCalledWith('', 'error');
      expect(log).toHaveBeenCalledWith('  • Error 1', 'error');
      expect(log).toHaveBeenCalledWith('  • Error 2', 'error');
      expect(log).toHaveBeenCalledWith('', 'error');
      expect(log).toHaveBeenCalledWith(
        'Please fix these errors in your template configuration file.',
        'error',
      );
      expect(log).toHaveBeenCalledWith('', 'error');
      expect(log).toHaveBeenCalledWith(
        'For schema documentation, see: https://github.com/pixpilot/scaffoldfy/tree/main/packages/scaffoldfy/schema',
        'info',
      );
    });

    it('should handle empty error array', () => {
      displayValidationErrors([]);

      expect(log).toHaveBeenCalledWith('❌ Schema validation failed:', 'error');
      expect(log).toHaveBeenCalledWith('', 'error');
      expect(log).toHaveBeenCalledWith(
        'The following validation errors were found:',
        'error',
      );
      expect(log).toHaveBeenCalledWith('', 'error');
      expect(log).toHaveBeenCalledWith('', 'error');
      expect(log).toHaveBeenCalledWith(
        'Please fix these errors in your template configuration file.',
        'error',
      );
      expect(log).toHaveBeenCalledWith('', 'error');
      expect(log).toHaveBeenCalledWith(
        'For schema documentation, see: https://github.com/pixpilot/scaffoldfy/tree/main/packages/scaffoldfy/schema',
        'info',
      );
    });
  });

  describe('validateScaffoldfyJsonFile', () => {
    it('should return valid true for file without schema', () => {
      const testFile = path.join(__dirname, 'test-file-no-schema.json');
      fs.writeFileSync(testFile, '{"tasks": []}');

      try {
        const result = validateScaffoldfyJsonFile(testFile);
        expect(result.valid).toBe(true);
        expect(result.errors).toBeUndefined();
      } finally {
        fs.unlinkSync(testFile);
      }
    });

    it('should return valid true for non-existent schema', () => {
      const testFile = path.join(__dirname, 'test-file-bad-schema.json');
      fs.writeFileSync(testFile, '{"$schema": "non-existent-schema.json", "tasks": []}');

      try {
        const result = validateScaffoldfyJsonFile(testFile);
        expect(result.valid).toBe(true);
        expect(result.errors).toBeUndefined();
      } finally {
        fs.unlinkSync(testFile);
      }
    });

    it('should return valid false for invalid JSON', () => {
      const testFile = path.join(__dirname, 'test-file-invalid.json');
      fs.writeFileSync(testFile, 'invalid json');

      try {
        const result = validateScaffoldfyJsonFile(testFile);
        expect(result.valid).toBe(false);
        expect(result.errors).toEqual([
          expect.stringContaining('Failed to parse JSON file'),
        ]);
      } finally {
        fs.unlinkSync(testFile);
      }
    });

    it('should return valid true for non-string schema', () => {
      const testFile = path.join(__dirname, 'test-file-non-string-schema.json');
      fs.writeFileSync(testFile, '{"$schema": 123, "tasks": []}');

      try {
        const result = validateScaffoldfyJsonFile(testFile);
        expect(result.valid).toBe(true);
        expect(result.errors).toBeUndefined();
      } finally {
        fs.unlinkSync(testFile);
      }
    });
  });

  describe('validateTasksSchema', () => {
    it('should validate valid tasks configuration', () => {
      const validConfig = {
        $schema: '../schema/scaffoldfy.schema.json',
        name: 'test-template',
        description: 'Test template',
        tasks: [
          {
            id: 'test-task',
            name: 'Test Task',
            type: 'write',
            config: {
              file: 'test.txt',
              template: 'test content',
            },
          },
        ],
      };

      const result = validateTasksSchema(validConfig, { silent: true });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return errors for invalid tasks configuration', () => {
      const invalidConfig = {
        $schema: '../schema/scaffoldfy.schema.json',
        name: 'test-template',
        description: 'Test template',
        tasks: [
          {
            id: 'test-task',
            name: 'Test Task',
            type: 'invalid-type',
            config: {
              content: 'test',
              to: 'test.txt',
            },
          },
        ],
      };

      const result = validateTasksSchema(invalidConfig, { silent: true });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
