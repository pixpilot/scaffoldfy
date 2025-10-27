/**
 * Tests for default value resolution
 */

import type { DefaultValue } from '../../src/types';
import { execSync } from 'node:child_process';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveDefaultValue } from '../../src/prompts/index';

// Mock execSync for testing command execution
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

// Clear mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

describe('executable default values', () => {
  it('should resolve static default values', async () => {
    const defaultValue: DefaultValue<string> = 'static-value';
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe('static-value');
  });

  it('should NOT interpolate template variables in direct string defaults', async () => {
    const defaultValue: DefaultValue<string> = 'Hello {{name}}!';
    const context = { name: 'Pixpilot' };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt', context);
    expect(result).toBe('Hello {{name}}!'); // Should return as-is, not interpolated
  });

  it('should NOT interpolate multiple variables in direct string defaults', async () => {
    const defaultValue: DefaultValue<string> = 'Author: {{author}}, Email: {{email}}';
    const context = { author: 'Jane', email: 'jane@example.com' };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt', context);
    expect(result).toBe('Author: {{author}}, Email: {{email}}'); // Should return as-is
  });

  it('should resolve conditional default (ifTrue)', async () => {
    const defaultValue: DefaultValue<string> = {
      type: 'conditional',
      condition: 'orgName === "pixpilot"',
      ifTrue: 'security@pixpilot.com',
      ifFalse: {
        type: 'interpolate',
        value: '{{authorEmail}}',
      },
    };
    const context = { orgName: 'pixpilot', authorEmail: 'jane@example.com' };
    const result = await resolveDefaultValue(defaultValue, 'securityEmail', context);
    expect(result).toBe('security@pixpilot.com');
  });

  it('should resolve conditional default (ifFalse with interpolation)', async () => {
    const defaultValue: DefaultValue<string> = {
      type: 'conditional',
      condition: 'orgName === "pixpilot"',
      ifTrue: 'security@pixpilot.com',
      ifFalse: {
        type: 'interpolate',
        value: '{{authorEmail}}',
      },
    };
    const context = { orgName: 'otherorg', authorEmail: 'jane@example.com' };
    const result = await resolveDefaultValue(defaultValue, 'securityEmail', context);
    expect(result).toBe('jane@example.com');
  });

  it('should resolve explicit static type defaults', async () => {
    const defaultValue: DefaultValue<string> = {
      type: 'static',
      value: 'explicit-value',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe('explicit-value');
  });

  it('should execute command for exec type defaults', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('command-output\n');

    const defaultValue: DefaultValue<string> = {
      type: 'exec',
      value: 'echo "test"',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe('command-output');
    expect(mockExec).toHaveBeenCalledWith('echo "test"', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000,
    });
  });

  it('should parse numeric command output', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('42\n');

    const defaultValue: DefaultValue<number> = {
      type: 'exec',
      value: 'echo "42"',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe(42);
  });

  it('should parse boolean command output', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('true\n');

    const defaultValue: DefaultValue<boolean> = {
      type: 'exec',
      value: 'echo "true"',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe(true);
  });

  it('should parse JSON command output', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('{"key":"value"}\n');

    const defaultValue: DefaultValue<object> = {
      type: 'exec',
      value: 'echo \'{"key":"value"}\'',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toEqual({ key: 'value' });
  });

  it('should handle command execution errors gracefully', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockImplementation(() => {
      throw new Error('Command failed');
    });

    const defaultValue: DefaultValue<string> = {
      type: 'exec',
      value: 'failing-command',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBeUndefined();
  });

  it('should return undefined for exec type with non-string command', async () => {
    const defaultValue = {
      type: 'exec',
      value: 123,
    } as unknown as DefaultValue<string>;
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBeUndefined();
  });

  it('should handle undefined default values', async () => {
    const result = await resolveDefaultValue(undefined, 'test-prompt');
    expect(result).toBeUndefined();
  });

  it('should support git commands', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('main\n');

    const defaultValue: DefaultValue<string> = {
      type: 'exec',
      value: 'git branch --show-current',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe('main');
  });

  it('should support npm commands', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('9.6.0\n');

    const defaultValue: DefaultValue<string> = {
      type: 'exec',
      value: 'npm --version',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe('9.6.0');
  });

  it('should support node commands', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('v20.10.0\n');

    const defaultValue: DefaultValue<string> = {
      type: 'exec',
      value: 'node --version',
    };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt');
    expect(result).toBe('v20.10.0');
  });
});

describe('interpolate type default values', () => {
  it('should resolve interpolate type with single variable', async () => {
    const defaultValue: DefaultValue<string> = {
      type: 'interpolate',
      value: 'Hello {{name}}!',
    };
    const context = { name: 'World' };
    const result = await resolveDefaultValue(defaultValue, 'test-prompt', context);
    expect(result).toBe('Hello World!');
  });

  it('should resolve interpolate type with multiple variables', async () => {
    const defaultValue: DefaultValue<string> = {
      type: 'interpolate',
      value: '{{firstName}} {{lastName}}',
    };
    const context = { firstName: 'John', lastName: 'Doe' };
    const result = await resolveDefaultValue(defaultValue, 'fullName', context);
    expect(result).toBe('John Doe');
  });

  it('should resolve interpolate type referencing previously resolved prompt', async () => {
    const defaultValue: DefaultValue<string> = {
      type: 'interpolate',
      value: 'https://github.com/{{repoOwner}}/{{repoName}}',
    };
    const context = { repoOwner: 'pixpilot', repoName: 'scaffoldfy' };
    const result = await resolveDefaultValue(defaultValue, 'repoUrl', context);
    expect(result).toBe('https://github.com/pixpilot/scaffoldfy');
  });

  it('should resolve interpolate type referencing previously resolved variable', async () => {
    const defaultValue: DefaultValue<string> = {
      type: 'interpolate',
      value: '{{projectName}}-{{env}}',
    };
    const context = { projectName: 'my-app', env: 'production' };
    const result = await resolveDefaultValue(defaultValue, 'appName', context);
    expect(result).toBe('my-app-production');
  });

  it('should resolve interpolate type with complex interpolation', async () => {
    const defaultValue: DefaultValue<string> = {
      type: 'interpolate',
      value: '@{{scope}}/{{packageName}}',
    };
    const context = { scope: 'myorg', packageName: 'my-package' };
    const result = await resolveDefaultValue(defaultValue, 'fullPackageName', context);
    expect(result).toBe('@myorg/my-package');
  });

  it('should return original template when context is missing', async () => {
    const defaultValue: DefaultValue<string> = {
      type: 'interpolate',
      value: 'Hello {{name}}!',
    };
    const result = await resolveDefaultValue(defaultValue, 'testVar');
    expect(result).toBe('Hello {{name}}!');
  });

  it('should return undefined for interpolate type with non-string value', async () => {
    const defaultValue: DefaultValue<string> = {
      type: 'interpolate',
      value: 123,
    } as never;
    const result = await resolveDefaultValue(defaultValue, 'testVar');
    expect(result).toBeUndefined();
  });

  it('should handle missing variables gracefully', async () => {
    const defaultValue: DefaultValue<string> = {
      type: 'interpolate',
      value: 'Hello {{name}}!',
    };
    const context = { otherVar: 'value' };
    const result = await resolveDefaultValue(defaultValue, 'testVar', context);
    // interpolateTemplate should handle missing variables
    expect(result).toBeDefined();
  });

  it('should resolve template with nested object access', async () => {
    const defaultValue: DefaultValue<string> = {
      type: 'interpolate',
      value: '{{user.name}}-{{user.email}}',
    };
    const context = { user: { name: 'John', email: 'john@example.com' } };
    const result = await resolveDefaultValue(defaultValue, 'userInfo', context);
    expect(result).toBe('John-john@example.com');
  });
});

describe('exec-file default values', () => {
  it('should resolve exec-file default values with relative paths', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');

    // Create a temporary directory structure
    const tempDir = os.tmpdir();
    const testDir = path.join(tempDir, `test-prompt-exec-file-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    // Create a script in a subdirectory
    const scriptsDir = path.join(testDir, 'scripts');
    fs.mkdirSync(scriptsDir, { recursive: true });
    const scriptPath = path.join(scriptsDir, 'get-default.cjs');
    fs.writeFileSync(scriptPath, 'console.log("default-value-from-script");', 'utf-8');

    try {
      // Simulate a config file at testDir/config.json
      const configPath = path.join(testDir, 'config.json');

      const defaultValue: DefaultValue<string> = {
        type: 'exec-file',
        file: './scripts/get-default.cjs', // Relative path
      };

      vi.mocked(execSync).mockImplementation((command: any) => {
        // Only mock if it's our script
        if (typeof command === 'string' && command.includes('get-default.cjs')) {
          return 'default-value-from-script\n' as any;
        }
        // Shouldn't reach here in this test
        throw new Error('Unexpected command executed');
      });

      const result = await resolveDefaultValue(
        defaultValue,
        'test-prompt',
        { someVar: 'test' },
        {
          id: 'test-prompt',
          type: 'input',
          message: 'Test',
          $sourceUrl: configPath,
        } as any,
      );

      expect(result).toBe('default-value-from-script');
    } finally {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should support exec-file with args and context interpolation', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');

    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `test-prompt-exec-args-${Date.now()}.cjs`);
    fs.writeFileSync(
      scriptPath,
      'console.log(process.argv.slice(2).join(" "));',
      'utf-8',
    );

    try {
      const defaultValue: DefaultValue<string> = {
        type: 'exec-file',
        file: scriptPath,
        args: ['--name={{userName}}', '--id={{userId}}'],
      };

      vi.mocked(execSync).mockImplementation((command: any) => {
        // Only mock if it's our script with args
        if (typeof command === 'string' && command.includes('test-prompt-exec-args')) {
          return '--name=Alice --id=42\n' as any;
        }
        throw new Error('Unexpected command executed');
      });

      const result = await resolveDefaultValue(defaultValue, 'test-prompt', {
        userName: 'Alice',
        userId: 42,
      });

      expect(result).toBe('--name=Alice --id=42');
    } finally {
      fs.unlinkSync(scriptPath);
    }
  });

  it('should handle exec-file errors gracefully', async () => {
    const defaultValue: DefaultValue<string> = {
      type: 'exec-file',
      file: '/non/existent/script',
    };

    const result = await resolveDefaultValue(defaultValue, 'test-prompt', {
      someVar: 'test',
    });

    expect(result).toBeUndefined();
  });

  it('should parse JSON output from exec-file', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');

    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `test-prompt-json-${Date.now()}.cjs`);
    fs.writeFileSync(
      scriptPath,
      'console.log(JSON.stringify({ value: "test", count: 42 }));',
      'utf-8',
    );

    try {
      const defaultValue: DefaultValue<any> = {
        type: 'exec-file',
        file: scriptPath,
      };

      vi.mocked(execSync).mockImplementation((command: any) => {
        // Only mock if it's our script
        if (typeof command === 'string' && command.includes('test-prompt-json')) {
          return '{"value":"test","count":42}\n' as any;
        }
        throw new Error('Unexpected command executed');
      });

      const result = await resolveDefaultValue(defaultValue, 'test-prompt', {
        someVar: 'test',
      });

      expect(result).toEqual({ value: 'test', count: 42 });
    } finally {
      fs.unlinkSync(scriptPath);
    }
  });
});
