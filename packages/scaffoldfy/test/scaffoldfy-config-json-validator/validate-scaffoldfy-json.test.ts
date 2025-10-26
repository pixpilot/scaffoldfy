import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateScaffoldfyJsonFile } from '../../src/scaffoldfy-config-json-validator/validate-scaffoldfy-json';

// Helper to create a temp JSON file for testing
function createTempJsonFile(content: object, filename: string) {
  const filePath = path.join(__dirname, filename);
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
  return filePath;
}

describe('validateScaffoldfyJsonFile', () => {
  afterAll(() => {
    // Clean up test files
    const testFiles = [
      'abs-path.json',
      'rel-path.json',
      'no-schema.json',
      'relative-schema.json',
    ];
    testFiles.forEach((filename) => {
      const filePath = path.join(__dirname, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  });

  it('validates a file with absolute path', () => {
    const schemaPath = path.join(__dirname, '../../schema/scaffoldfy.schema.json');
    if (!fs.existsSync(schemaPath)) {
      // Skip test if schema does not exist
      return;
    }
    const filePath = createTempJsonFile(
      { $schema: schemaPath, foo: 'bar' },
      'abs-path.json',
    );
    const result = validateScaffoldfyJsonFile(filePath);
    expect(result).toHaveProperty('valid');
  });

  it('validates a file with relative path (./)', () => {
    const schemaPath = './relative-schema.json';
    const relSchemaPath = path.join(__dirname, schemaPath);
    fs.writeFileSync(relSchemaPath, JSON.stringify({ type: 'object' }), 'utf-8');
    const filePath = createTempJsonFile(
      { $schema: schemaPath, foo: 'bar' },
      'rel-path.json',
    );
    const result = validateScaffoldfyJsonFile(filePath);
    expect(result).toHaveProperty('valid');
  });

  it('returns valid: true for file without $schema', () => {
    const filePath = createTempJsonFile({ foo: 'bar' }, 'no-schema.json');
    const result = validateScaffoldfyJsonFile(filePath);
    expect(result.valid).toBe(true);
  });
});
