/**
 * Tests for exec-file value resolution in variables
 */

import type { CurrentConfigurationContext } from '../../src/types';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveVariableValue } from '../../src/variables/resolve-variable-value';

describe('resolveVariableValue with exec-file', () => {
  it('should execute a local Node.js script and return its output', async () => {
    // Create a temporary script
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `test-script-${Date.now()}.cjs`);
    fs.writeFileSync(scriptPath, 'console.log("hello from script");', 'utf-8');

    try {
      const result = await resolveVariableValue(
        {
          type: 'exec-file',
          file: scriptPath,
        },
        'testVar',
        {},
      );

      expect(result).toBe('hello from script');
    } finally {
      fs.unlinkSync(scriptPath);
    }
  });

  it('should execute script with auto-detected runtime based on extension', async () => {
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `test-script-${Date.now()}.cjs`);
    fs.writeFileSync(scriptPath, 'console.log("auto-detected");', 'utf-8');

    try {
      const result = await resolveVariableValue(
        {
          type: 'exec-file',
          file: scriptPath,
          // No runtime specified - should auto-detect as 'node' from .cjs extension
        },
        'testVar',
        {},
      );

      expect(result).toBe('auto-detected');
    } finally {
      fs.unlinkSync(scriptPath);
    }
  });

  it('should parse JSON output from script', async () => {
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `test-script-${Date.now()}.cjs`);
    fs.writeFileSync(
      scriptPath,
      'console.log(JSON.stringify({ name: "test", value: 42 }));',
      'utf-8',
    );

    try {
      const result = await resolveVariableValue(
        {
          type: 'exec-file',
          file: scriptPath,
        },
        'testVar',
        {},
      );

      expect(result).toEqual({ name: 'test', value: 42 });
    } finally {
      fs.unlinkSync(scriptPath);
    }
  });

  it('should parse number output from script', async () => {
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `test-script-${Date.now()}.cjs`);
    fs.writeFileSync(scriptPath, 'console.log(42);', 'utf-8');

    try {
      const result = await resolveVariableValue(
        {
          type: 'exec-file',
          file: scriptPath,
        },
        'testVar',
        {},
      );

      expect(result).toBe(42);
    } finally {
      fs.unlinkSync(scriptPath);
    }
  });

  it('should parse boolean output from script', async () => {
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `test-script-${Date.now()}.cjs`);
    fs.writeFileSync(scriptPath, 'console.log(true);', 'utf-8');

    try {
      const result = await resolveVariableValue(
        {
          type: 'exec-file',
          file: scriptPath,
        },
        'testVar',
        {},
      );

      expect(result).toBe(true);
    } finally {
      fs.unlinkSync(scriptPath);
    }
  });

  it('should pass args to script', async () => {
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `test-script-${Date.now()}.cjs`);
    fs.writeFileSync(
      scriptPath,
      'console.log(process.argv.slice(2).join(" "));',
      'utf-8',
    );

    try {
      const result = await resolveVariableValue(
        {
          type: 'exec-file',
          file: scriptPath,
          args: ['hello', 'world'],
        },
        'testVar',
        {},
      );

      expect(result).toBe('hello world');
    } finally {
      fs.unlinkSync(scriptPath);
    }
  });

  it('should interpolate variables in args', async () => {
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `test-script-${Date.now()}.cjs`);
    fs.writeFileSync(
      scriptPath,
      'console.log(process.argv.slice(2).join(" "));',
      'utf-8',
    );

    const context: CurrentConfigurationContext = {
      name: 'Alice',
      age: 30,
    };

    try {
      const result = await resolveVariableValue(
        {
          type: 'exec-file',
          file: scriptPath,
          args: ['Hello', '{{name}}', 'age:{{age}}'],
        },
        'testVar',
        context,
      );

      expect(result).toBe('Hello Alice age:30');
    } finally {
      fs.unlinkSync(scriptPath);
    }
  });

  it('should pass environment variables through parameters', async () => {
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `test-script-${Date.now()}.cjs`);
    fs.writeFileSync(
      scriptPath,
      'console.log(process.env.MY_VAR + " " + process.env.ANOTHER_VAR);',
      'utf-8',
    );

    try {
      const result = await resolveVariableValue(
        {
          type: 'exec-file',
          file: scriptPath,
          parameters: {
            MY_VAR: 'hello',
            ANOTHER_VAR: 'world',
          },
        },
        'testVar',
        {},
      );

      expect(result).toBe('hello world');
    } finally {
      fs.unlinkSync(scriptPath);
    }
  });

  it('should interpolate variables in parameters', async () => {
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `test-script-${Date.now()}.cjs`);
    fs.writeFileSync(scriptPath, 'console.log(process.env.USER_NAME);', 'utf-8');

    const context: CurrentConfigurationContext = {
      userName: 'Bob',
    };

    try {
      const result = await resolveVariableValue(
        {
          type: 'exec-file',
          file: scriptPath,
          parameters: {
            USER_NAME: '{{userName}}',
          },
        },
        'testVar',
        context,
      );

      expect(result).toBe('Bob');
    } finally {
      fs.unlinkSync(scriptPath);
    }
  });

  it('should interpolate variables in file path', async () => {
    const tempDir = os.tmpdir();
    const scriptName = `test-script-${Date.now()}.cjs`;
    const scriptPath = path.join(tempDir, scriptName);
    fs.writeFileSync(scriptPath, 'console.log("interpolated path");', 'utf-8');

    const context: CurrentConfigurationContext = {
      tempDir,
      scriptName,
    };

    try {
      const result = await resolveVariableValue(
        {
          type: 'exec-file',
          file: '{{tempDir}}/{{scriptName}}',
        },
        'testVar',
        context,
      );

      expect(result).toBe('interpolated path');
    } finally {
      fs.unlinkSync(scriptPath);
    }
  });

  it('should return undefined on script error', async () => {
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `test-script-${Date.now()}.cjs`);
    fs.writeFileSync(scriptPath, 'throw new Error("Script error");', 'utf-8');

    try {
      const result = await resolveVariableValue(
        {
          type: 'exec-file',
          file: scriptPath,
        },
        'testVar',
        {},
      );

      expect(result).toBeUndefined();
    } finally {
      fs.unlinkSync(scriptPath);
    }
  });

  it('should return undefined for non-existent file', async () => {
    const result = await resolveVariableValue(
      {
        type: 'exec-file',
        file: '/non/existent/file',
      },
      'testVar',
      {},
    );

    expect(result).toBeUndefined();
  });

  it('should require context for variable interpolation', async () => {
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `test-script-${Date.now()}.cjs`);
    fs.writeFileSync(scriptPath, 'console.log("test");', 'utf-8');

    try {
      const result = await resolveVariableValue(
        {
          type: 'exec-file',
          file: scriptPath,
        },
        'testVar',
        // No context provided
      );

      expect(result).toBeUndefined();
    } finally {
      fs.unlinkSync(scriptPath);
    }
  });

  it('should resolve relative file paths using sourceUrl', async () => {
    // Create a temporary directory structure
    const tempDir = os.tmpdir();
    const testDir = path.join(tempDir, `test-source-url-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    // Create a script in a subdirectory
    const scriptsDir = path.join(testDir, 'scripts');
    fs.mkdirSync(scriptsDir, { recursive: true });
    const scriptPath = path.join(scriptsDir, 'test-script.cjs');
    fs.writeFileSync(scriptPath, 'console.log("resolved from relative path");', 'utf-8');

    try {
      // Simulate a config file at testDir/config.json referencing ./scripts/test-script.cjs
      const configPath = path.join(testDir, 'config.json');

      const result = await resolveVariableValue(
        {
          type: 'exec-file',
          file: './scripts/test-script.cjs', // Relative path
        },
        'testVar',
        {},
        configPath, // sourceUrl - should resolve relative to this file's directory
      );

      expect(result).toBe('resolved from relative path');
    } finally {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should resolve absolute file paths regardless of sourceUrl', async () => {
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `test-script-${Date.now()}.cjs`);
    fs.writeFileSync(scriptPath, 'console.log("absolute path works");', 'utf-8');

    try {
      const result = await resolveVariableValue(
        {
          type: 'exec-file',
          file: scriptPath, // Absolute path
        },
        'testVar',
        {},
        '/some/other/path/config.json', // sourceUrl should be ignored for absolute paths
      );

      expect(result).toBe('absolute path works');
    } finally {
      fs.unlinkSync(scriptPath);
    }
  });
});
