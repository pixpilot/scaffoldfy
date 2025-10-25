/**
 * Tests for resolving all default values
 */

import type { PromptDefinition } from '../../src/types.js';
import { execSync } from 'node:child_process';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveAllDefaultValues } from '../../src/prompts/index.js';

// Mock execSync for testing command execution
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

// Clear mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

describe('resolveAllDefaultValues', () => {
  it('should resolve all default values in parallel', async () => {
    const mockExec = vi.mocked(execSync);
    let callCount = 0;
    mockExec.mockImplementation(() => {
      callCount++;
      return `output-${callCount}\n`;
    });

    const prompts: PromptDefinition[] = [
      {
        id: 'static',
        type: 'input',
        message: 'Static',
        default: 'static-value',
      },
      {
        id: 'exec1',
        type: 'input',
        message: 'Exec 1',
        default: { type: 'exec', value: 'echo "1"' },
      },
      {
        id: 'exec2',
        type: 'input',
        message: 'Exec 2',
        default: { type: 'exec', value: 'echo "2"' },
      },
      {
        id: 'no-default',
        type: 'input',
        message: 'No default',
      },
    ];

    const resolved = await resolveAllDefaultValues(prompts);

    expect(resolved.get('static')).toBe('static-value');
    expect(resolved.get('exec1')).toBe('output-1');
    expect(resolved.get('exec2')).toBe('output-2');
    expect(resolved.has('no-default')).toBe(false);
    expect(mockExec).toHaveBeenCalledTimes(2);
  });

  it('should handle number prompts with executable defaults', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('3000\n');

    const prompts: PromptDefinition[] = [
      {
        id: 'port',
        type: 'number',
        message: 'Port',
        default: { type: 'exec', value: 'echo "3000"' },
      },
    ];

    const resolved = await resolveAllDefaultValues(prompts);
    expect(resolved.get('port')).toBe(3000);
  });

  it('should handle select prompts with executable defaults', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('pnpm\n');

    const prompts: PromptDefinition[] = [
      {
        id: 'packageManager',
        type: 'select',
        message: 'Package manager',
        choices: [
          { name: 'npm', value: 'npm' },
          { name: 'pnpm', value: 'pnpm' },
        ],
        default: {
          type: 'exec',
          value: 'which pnpm > /dev/null && echo "pnpm" || echo "npm"',
        },
      },
    ];

    const resolved = await resolveAllDefaultValues(prompts);
    expect(resolved.get('packageManager')).toBe('pnpm');
  });

  it('should handle confirm prompts with executable defaults', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('true\n');

    const prompts: PromptDefinition[] = [
      {
        id: 'hasTests',
        type: 'confirm',
        message: 'Has tests',
        default: {
          type: 'exec',
          value: 'test -d tests && echo "true" || echo "false"',
        },
      },
    ];

    const resolved = await resolveAllDefaultValues(prompts);
    expect(resolved.get('hasTests')).toBe(true);
  });

  it('should interpolate variables from context in default values', async () => {
    const context = {
      userName: 'johndoe',
      projectName: 'my-project',
      year: 2025,
    };

    const prompts: PromptDefinition[] = [
      {
        id: 'author',
        type: 'input',
        message: 'Author',
        default: {
          type: 'interpolate',
          value: '{{userName}}',
        },
      },
      {
        id: 'description',
        type: 'input',
        message: 'Description',
        default: {
          type: 'interpolate',
          value: '{{projectName}} - created by {{userName}} in {{year}}',
        },
      },
    ];

    const resolved = await resolveAllDefaultValues(prompts, context);

    expect(resolved.get('author')).toBe('johndoe');
    expect(resolved.get('description')).toBe('my-project - created by johndoe in 2025');
  });

  it('should handle interpolate defaults without context (should not throw)', async () => {
    const prompts: PromptDefinition[] = [
      {
        id: 'owner',
        type: 'input',
        message: 'Repository owner',
        default: {
          type: 'interpolate',
          value: '{{repoOwnerVar}}',
        },
      },
    ];

    // Should not throw, but may warn - just return the template as-is
    const resolved = await resolveAllDefaultValues(prompts);

    // When context is missing, it should return the template string
    expect(resolved.get('owner')).toBe('{{repoOwnerVar}}');
  });

  it('should resolve variables first then use them in prompt defaults', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('pixpilot\n');

    // Simulate variables being resolved and added to config
    const config = {
      repoOwnerVar: 'pixpilot',
      orgNameVar: 'pixpilot',
    };

    const prompts: PromptDefinition[] = [
      {
        id: 'repoOwner',
        type: 'input',
        message: 'Repository owner',
        default: {
          type: 'interpolate',
          value: '{{repoOwnerVar}}',
        },
      },
      {
        id: 'orgName',
        type: 'input',
        message: 'Organization name',
        default: {
          type: 'interpolate',
          value: '{{orgNameVar}}',
        },
      },
    ];

    const resolved = await resolveAllDefaultValues(prompts, config);

    expect(resolved.get('repoOwner')).toBe('pixpilot');
    expect(resolved.get('orgName')).toBe('pixpilot');
  });

  it('should combine exec and interpolate defaults with context', async () => {
    const mockExec = vi.mocked(execSync);
    mockExec.mockReturnValue('2025\n');

    const config = {
      projectName: 'my-app',
      author: 'Jane Doe',
    };

    const prompts: PromptDefinition[] = [
      {
        id: 'year',
        type: 'number',
        message: 'Year',
        default: {
          type: 'exec',
          value: 'date +%Y',
        },
      },
      {
        id: 'copyright',
        type: 'input',
        message: 'Copyright',
        default: {
          type: 'interpolate',
          value: 'Copyright {{year}} {{author}}',
        },
      },
    ];

    // First resolve without context to get exec results
    const resolved1 = await resolveAllDefaultValues(prompts, config);

    // Now resolve again with year added to context
    const contextWithYear = { ...config, year: resolved1.get('year') };
    const resolved2 = await resolveAllDefaultValues(prompts, contextWithYear);

    expect(resolved2.get('year')).toBe(2025);
    expect(resolved2.get('copyright')).toBe('Copyright 2025 Jane Doe');
  });
});
