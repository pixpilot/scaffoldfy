import path from 'node:path';
import process from 'node:process';

export function getTestTempFilesDir(...dirs: string[]): string {
  const TEST_DIR = path.join(process.cwd(), '.temp', ...dirs);
  return TEST_DIR;
}
