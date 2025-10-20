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
});
