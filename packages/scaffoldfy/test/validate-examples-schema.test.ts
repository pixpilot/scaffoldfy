import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';
import { validateScaffoldfyJsonFile } from '../src';

describe('validate-schema', () => {
  it('should be defined', () => {
    expect('').toBeDefined();
  });

  it('should validate all .json files in examples', () => {
    const examplesDir = path.join(__dirname, '..', 'examples');
    const files = fs.readdirSync(examplesDir).filter((file) => file.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(examplesDir, file);
      const result = validateScaffoldfyJsonFile(filePath);
      if (!result.valid) {
        console.error(`Validation failed for ${filePath}:`, result.errors);
      }
      expect(result.valid).toBe(true);
    }
  });
});
