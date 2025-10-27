/**
 * Tests for exec-file plugin executor
 */

import type { ExecFileConfig } from '../../../src/plugins/exec-file/types';
import type { CurrentConfigurationContext, TaskDefinition } from '../../../src/types';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { executeExecFile } from '../../../src/plugins/exec-file/executor';
import { getTestTempFilesDir } from '../../test-utils';

const TEST_DIR = getTestTempFilesDir('__test_exec_file__');

const mockConfig: CurrentConfigurationContext = {
  projectName: 'test-project',
  owner: 'test-owner',
  repoUrl: 'https://github.com/test-owner/test-project.git',
  author: 'Test Author',
  orgName: '@test-org',
};

describe('executeExecFile', () => {
  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    // Change to test directory
    process.chdir(TEST_DIR);
  });

  afterEach(async () => {
    // Change back to original directory
    process.chdir(path.join(TEST_DIR, '..'));

    // Small delay to ensure file handles are released on Windows
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 100);
    });

    // Clean up test directory with retry logic for Windows
    if (fs.existsSync(TEST_DIR)) {
      let retries = 3;
      while (retries > 0) {
        try {
          fs.rmSync(TEST_DIR, {
            recursive: true,
            force: true,
            maxRetries: 5,
            retryDelay: 100,
          });
          break;
        } catch (error) {
          retries--;
          if (retries === 0) {
            console.warn(
              `Failed to clean up test directory: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          } else {
            await new Promise<void>((resolve) => {
              setTimeout(() => {
                resolve();
              }, 100);
            });
          }
        }
      }
    }
  });

  it('should execute a local Node.cjs script', async () => {
    // Create a simple test script using ES modules
    const scriptPath = 'test-script.cjs';
    fs.writeFileSync(
      scriptPath,
      `
      const fs = require('fs');
      fs.writeFileSync('output.txt', 'Script executed successfully');
    `,
    );

    const config: ExecFileConfig = {
      file: scriptPath,
      runtime: 'node',
    };

    await executeExecFile(config, mockConfig);

    expect(fs.existsSync('output.txt')).toBe(true);
    expect(fs.readFileSync('output.txt', 'utf-8')).toBe('Script executed successfully');
  });

  it('should auto-detect runtime from file extension', async () => {
    // Create a .cjs script without specifying runtime
    const scriptPath = 'auto-detect.cjs';
    fs.writeFileSync(
      scriptPath,
      `
      const fs = require('fs');
      fs.writeFileSync('auto-detect-output.txt', 'Auto-detected as node');
    `,
    );

    const config: ExecFileConfig = {
      file: scriptPath,
      // No runtime specified - should auto-detect as 'node' from .cjs extension
    };

    await executeExecFile(config, mockConfig);

    expect(fs.existsSync('auto-detect-output.txt')).toBe(true);
    expect(fs.readFileSync('auto-detect-output.txt', 'utf-8')).toBe(
      'Auto-detected as node',
    );
  });

  it('should interpolate variables in file path', async () => {
    // Create scripts directory
    fs.mkdirSync('scripts', { recursive: true });

    // Create a script with variable in path
    const scriptPath = 'scripts/test-project-setup.cjs';
    fs.writeFileSync(
      scriptPath,
      `
      const fs = require('fs');
      fs.writeFileSync('var-test.txt', 'Variables interpolated');
    `,
    );

    const config: ExecFileConfig = {
      file: 'scripts/{{projectName}}-setup.cjs',
      runtime: 'node',
    };

    await executeExecFile(config, mockConfig);

    expect(fs.existsSync('var-test.txt')).toBe(true);
  });

  it('should pass arguments to script', async () => {
    // Create a script that uses arguments
    const scriptPath = 'args-script.cjs';
    fs.writeFileSync(
      scriptPath,
      `
      const fs = require('fs');
      const args = process.argv.slice(2);
      fs.writeFileSync('args-output.txt', args.join(' '));
    `,
    );

    const config: ExecFileConfig = {
      file: scriptPath,
      runtime: 'node',
      args: ['--name={{projectName}}', '--author={{author}}'],
    };

    await executeExecFile(config, mockConfig);

    expect(fs.existsSync('args-output.txt')).toBe(true);
    expect(fs.readFileSync('args-output.txt', 'utf-8')).toBe(
      '--name=test-project --author=Test Author',
    );
  });

  it('should pass environment variables through parameters', async () => {
    // Create a script that uses environment variables
    const scriptPath = 'env-script.cjs';
    fs.writeFileSync(
      scriptPath,
      `
      const fs = require('fs');
      const projectName = process.env.PROJECT_NAME || 'unknown';
      const author = process.env.AUTHOR || 'unknown';
      fs.writeFileSync('env-output.txt', projectName + '|' + author);
    `,
    );

    const config: ExecFileConfig = {
      file: scriptPath,
      runtime: 'node',
      parameters: {
        PROJECT_NAME: '{{projectName}}',
        AUTHOR: '{{author}}',
      },
    };

    await executeExecFile(config, mockConfig);

    expect(fs.existsSync('env-output.txt')).toBe(true);
    expect(fs.readFileSync('env-output.txt', 'utf-8')).toBe('test-project|Test Author');
  });

  it('should skip when condition is false', async () => {
    const scriptPath = 'conditional-script.cjs';
    fs.writeFileSync(
      scriptPath,
      `
      const fs = require('fs');
      fs.writeFileSync('should-not-exist.txt', 'Should not run');
    `,
    );

    const config: ExecFileConfig = {
      file: scriptPath,
      runtime: 'node',
      condition: 'false',
    };

    await executeExecFile(config, mockConfig);

    expect(fs.existsSync('should-not-exist.txt')).toBe(false);
  });

  it('should execute when condition is true', async () => {
    const scriptPath = 'conditional-script-true.cjs';
    fs.writeFileSync(
      scriptPath,
      `
      const fs = require('fs');
      fs.writeFileSync('should-exist.txt', 'Should run');
    `,
    );

    const config: ExecFileConfig = {
      file: scriptPath,
      runtime: 'node',
      condition: 'true',
    };

    await executeExecFile(config, mockConfig);

    expect(fs.existsSync('should-exist.txt')).toBe(true);
  });

  it('should evaluate condition with config variables', async () => {
    const scriptPath = 'cond-var-script.cjs';
    fs.writeFileSync(
      scriptPath,
      `
      const fs = require('fs');
      fs.writeFileSync('cond-var-output.txt', 'Condition met');
    `,
    );

    const config: ExecFileConfig = {
      file: scriptPath,
      runtime: 'node',
      condition: 'projectName === "test-project"',
    };

    await executeExecFile(config, mockConfig);

    expect(fs.existsSync('cond-var-output.txt')).toBe(true);
  });

  it('should use custom working directory', async () => {
    // Create subdirectory
    const subDir = 'subdir';
    fs.mkdirSync(subDir, { recursive: true });

    // Create script in root
    const scriptPath = 'cwd-script.cjs';
    fs.writeFileSync(
      scriptPath,
      `
      const fs = require('fs');
      fs.writeFileSync('cwd-output.txt', 'In subdir');
    `,
    );

    const config: ExecFileConfig = {
      file: scriptPath,
      runtime: 'node',
      cwd: subDir,
    };

    await executeExecFile(config, mockConfig);

    // File should be created in subdirectory
    expect(fs.existsSync(path.join(subDir, 'cwd-output.txt'))).toBe(true);
    expect(fs.existsSync('cwd-output.txt')).toBe(false);
  });

  it('should handle remote script files', async () => {
    const originalFetch = globalThis.fetch;

    try {
      // Mock fetch for remote script
      globalThis.fetch = (async (url: string) => {
        if (url === 'https://example.com/scripts/remote-script.cjs') {
          return new Response(
            `
            const fs = require('fs');
            fs.writeFileSync('remote-output.txt', 'Remote script executed');
          `,
            { status: 200, headers: { 'Content-Type': 'text/javascript' } },
          );
        }
        return new Response('Not Found', { status: 404 });
      }) as typeof fetch;

      const config: ExecFileConfig = {
        file: 'https://example.com/scripts/remote-script.cjs',
        runtime: 'node',
      };

      await executeExecFile(config, mockConfig);

      expect(fs.existsSync('remote-output.txt')).toBe(true);
      expect(fs.readFileSync('remote-output.txt', 'utf-8')).toBe(
        'Remote script executed',
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('should resolve relative paths with $sourceUrl', async () => {
    // Create a templates directory structure
    const templatesDir = path.join(TEST_DIR, 'templates');
    fs.mkdirSync(templatesDir, { recursive: true });

    // Create a script in templates directory
    const scriptPath = path.join(templatesDir, 'relative-script.cjs');
    fs.writeFileSync(
      scriptPath,
      `
      const fs = require('fs');
      fs.writeFileSync('relative-output.txt', 'Relative path worked');
    `,
    );

    const task: TaskDefinition = {
      id: 'test-task',
      name: 'Test Task',
      description: 'Test',
      required: true,
      enabled: true,
      type: 'exec-file' as 'write',
      config: {},
      $sourceUrl: path.join(templatesDir, 'config.cjson'),
    };

    const config: ExecFileConfig = {
      file: './relative-script.cjs',
      runtime: 'node',
    };

    await executeExecFile(config, mockConfig, task);

    expect(fs.existsSync('relative-output.txt')).toBe(true);
  });

  it('should throw error for non-existent local file', async () => {
    const config: ExecFileConfig = {
      file: 'non-existent-script.cjs',
      runtime: 'node',
    };

    await expect(executeExecFile(config, mockConfig)).rejects.toThrow('File not found');
  });

  it('should interpolate cwd path', async () => {
    // Create a directory with variable name
    const dirName = 'test-project-scripts';
    fs.mkdirSync(dirName, { recursive: true });

    const scriptPath = 'cwd-interp-script.cjs';
    fs.writeFileSync(
      scriptPath,
      `
      const fs = require('fs');
      fs.writeFileSync('cwd-interp-output.txt', 'CWD interpolated');
    `,
    );

    const config: ExecFileConfig = {
      file: scriptPath,
      runtime: 'node',
      cwd: '{{projectName}}-scripts',
    };

    await executeExecFile(config, mockConfig);

    expect(fs.existsSync(path.join(dirName, 'cwd-interp-output.txt'))).toBe(true);
  });

  it('should combine args and parameters', async () => {
    const scriptPath = 'combined-script.cjs';
    fs.writeFileSync(
      scriptPath,
      `
      const fs = require('fs');
      const args = process.argv.slice(2);
      const envVar = process.env.CUSTOM_VAR || 'not-set';
      fs.writeFileSync('combined-output.txt', args.join(',') + '|' + envVar);
    `,
    );

    const config: ExecFileConfig = {
      file: scriptPath,
      runtime: 'node',
      args: ['arg1', '{{projectName}}'],
      parameters: {
        CUSTOM_VAR: '{{author}}',
      },
    };

    await executeExecFile(config, mockConfig);

    expect(fs.existsSync('combined-output.txt')).toBe(true);
    expect(fs.readFileSync('combined-output.txt', 'utf-8')).toBe(
      'arg1,test-project|Test Author',
    );
  });
});
