import { randomUUID } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';

export function getTestTempFilesDir(...dirs: string[]): string {
  const randomDir = randomUUID();
  const TEST_DIR = path.join(
    process.cwd(),
    '.temp',
    'test-generated-files',
    randomDir,
    ...dirs,
  );
  return TEST_DIR;
}
