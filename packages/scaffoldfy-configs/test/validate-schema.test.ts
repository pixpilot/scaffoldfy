import fs from 'node:fs';
import path from 'node:path';
import { validateScaffoldfyJsonFile } from '@pixpilot/scaffoldfy';
import { describe, expect, it } from 'vitest';

describe('validate-schema', () => {
  it('should be defined', () => {
    expect('').toBeDefined();
  });

  it('should validate all scaffoldfy.json files in scaffoldfy-configs', () => {
    const configDir = path.join(__dirname, '..');
    const subdirs = fs
      .readdirSync(configDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const subdir of subdirs) {
      const filePath = path.join(configDir, subdir, 'scaffoldfy.json');
      if (fs.existsSync(filePath)) {
        const result = validateScaffoldfyJsonFile(filePath);
        if (!result.valid) {
          console.error(`Validation failed for ${filePath}:`, result.errors);
        }
        expect(result.valid).toBe(true);
      }
    }
  });
});
