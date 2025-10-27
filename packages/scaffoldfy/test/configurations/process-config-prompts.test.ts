/**
 * Tests for process config prompts
 */

import { describe, expect, it, vi } from 'vitest';
import { processConfigPrompts } from '../../src/configurations/process-config-prompts';
import {
  collectPrompts,
  resolveAllDefaultValues,
  validatePrompts,
} from '../../src/prompts';

// Mock dependencies
vi.mock('../../src/prompts', () => ({
  collectPrompts: vi.fn(),
  resolveAllDefaultValues: vi.fn(),
  validatePrompts: vi.fn(),
}));

// Mock process.exit
const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

describe('process config prompts', () => {
  const mockContext = { existing: 'value' };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console mocks
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should export processConfigPrompts function', () => {
    expect(processConfigPrompts).toBeDefined();
    expect(typeof processConfigPrompts).toBe('function');
  });

  it('should handle config without prompts', async () => {
    const config = { name: 'test' };

    await processConfigPrompts(config, mockContext);

    expect(validatePrompts).not.toHaveBeenCalled();
    expect(resolveAllDefaultValues).not.toHaveBeenCalled();
    expect(collectPrompts).not.toHaveBeenCalled();
  });

  it('should handle config with empty prompts array', async () => {
    const config = { name: 'test', prompts: [] };

    await processConfigPrompts(config, mockContext);

    expect(validatePrompts).not.toHaveBeenCalled();
    expect(resolveAllDefaultValues).not.toHaveBeenCalled();
    expect(collectPrompts).not.toHaveBeenCalled();
  });

  it('should process prompts successfully', async () => {
    const config = {
      name: 'test',
      prompts: [
        { id: 'name', type: 'input' as const, message: 'Enter name' },
        { id: 'age', type: 'number' as const, message: 'Enter age' },
      ],
    };
    const resolvedDefaults = new Map<string, unknown>([
      ['name', 'default'],
      ['age', 25],
    ]);
    const promptAnswers = { name: 'John', age: 30 };

    vi.mocked(validatePrompts).mockReturnValue([]);
    vi.mocked(resolveAllDefaultValues).mockResolvedValue(resolvedDefaults);
    vi.mocked(collectPrompts).mockResolvedValue(promptAnswers);

    await processConfigPrompts(config, mockContext);

    expect(validatePrompts).toHaveBeenCalledWith(config.prompts);
    expect(resolveAllDefaultValues).toHaveBeenCalledWith(config.prompts, mockContext);
    expect(collectPrompts).toHaveBeenCalledWith(
      config.prompts,
      resolvedDefaults,
      mockContext,
    );
    expect(mockContext).toEqual({
      existing: 'value',
      name: 'John',
      age: 30,
    });
  });

  it('should exit on prompt validation errors', async () => {
    const config = {
      name: 'test',
      prompts: [{ id: 'invalid', type: 'input' as const, message: 'Invalid prompt' }],
    };
    const validationErrors = ['Invalid prompt configuration'];

    vi.mocked(validatePrompts).mockReturnValue(validationErrors);

    await expect(processConfigPrompts(config, mockContext)).rejects.toThrow(
      'process.exit called',
    );

    expect(validatePrompts).toHaveBeenCalledWith(config.prompts);
    expect(console.error).toHaveBeenCalledWith('❌ Prompt validation errors:');
    expect(console.error).toHaveBeenCalledWith('  - Invalid prompt configuration');
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(resolveAllDefaultValues).not.toHaveBeenCalled();
    expect(collectPrompts).not.toHaveBeenCalled();
  });

  it('should handle multiple validation errors', async () => {
    const config = {
      name: 'test',
      prompts: [{ id: 'invalid1', type: 'input' as const, message: 'Invalid 1' }],
    };
    const validationErrors = ['Error 1', 'Error 2', 'Error 3'];

    vi.mocked(validatePrompts).mockReturnValue(validationErrors);

    await expect(processConfigPrompts(config, mockContext)).rejects.toThrow(
      'process.exit called',
    );

    expect(console.error).toHaveBeenCalledWith('❌ Prompt validation errors:');
    expect(console.error).toHaveBeenCalledWith('  - Error 1');
    expect(console.error).toHaveBeenCalledWith('  - Error 2');
    expect(console.error).toHaveBeenCalledWith('  - Error 3');
  });

  it('should merge prompt answers with existing context', async () => {
    const config = {
      name: 'test',
      prompts: [{ id: 'newValue', type: 'input' as const, message: 'Enter value' }],
    };
    const resolvedDefaults = new Map([['newValue', 'default']]);
    const promptAnswers = { newValue: 'user input' };

    vi.mocked(validatePrompts).mockReturnValue([]);
    vi.mocked(resolveAllDefaultValues).mockResolvedValue(resolvedDefaults);
    vi.mocked(collectPrompts).mockResolvedValue(promptAnswers);

    const contextWithExisting = { existing: 'value', another: 42 };

    await processConfigPrompts(config, contextWithExisting);

    expect(contextWithExisting).toEqual({
      existing: 'value',
      another: 42,
      newValue: 'user input',
    });
  });
});
