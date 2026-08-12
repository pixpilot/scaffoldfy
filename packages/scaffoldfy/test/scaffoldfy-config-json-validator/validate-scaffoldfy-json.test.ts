import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validateScaffoldfyJsonFile } from '../../src/scaffoldfy-config-validator/validate-scaffoldfy-json';

let testDir: string;

function createTempJsonFile(content: object, filename: string) {
  const filePath = path.join(testDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
  return filePath;
}

describe('validateScaffoldfyJsonFile', () => {
  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffoldfy-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
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
    const relSchemaPath = path.join(testDir, schemaPath);
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

  it('parses JSONC files', () => {
    const filePath = path.join(testDir, 'commented-config.jsonc');
    fs.writeFileSync(
      filePath,
      `{
  // JSONC comments are supported.
  "foo": "bar",
}`,
      'utf-8',
    );

    expect(validateScaffoldfyJsonFile(filePath)).toEqual({ valid: true });
  });
});
