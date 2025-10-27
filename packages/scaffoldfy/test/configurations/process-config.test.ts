/**
 * Tests for process config
 */

import { describe, expect, it, vi } from 'vitest';
import { processConfig } from '../../src/configurations/process-config';
import { processConfigPrompts } from '../../src/configurations/process-config-prompts';
import { processConfigVariables } from '../../src/configurations/process-config-variables';
import { evaluateEnabledAsync, info } from '../../src/utils';

// Mock dependencies
vi.mock('../../src/utils', () => ({
  evaluateEnabledAsync: vi.fn(),
  info: vi.fn(),
}));

vi.mock('../../src/configurations/process-config-prompts', () => ({
  processConfigPrompts: vi.fn(),
}));

vi.mock('../../src/configurations/process-config-variables', () => ({
  processConfigVariables: vi.fn(),
}));

describe('process config', () => {
  const mockConfig = { name: 'test-config' };
  const mockContext = { existing: 'value' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export processConfig function', () => {
    expect(processConfig).toBeDefined();
    expect(typeof processConfig).toBe('function');
  });

  it('should return false when config is initially disabled', async () => {
    vi.mocked(evaluateEnabledAsync).mockResolvedValue(false);

    const result = await processConfig(mockConfig, mockContext);

    expect(result).toBe(false);
    expect(evaluateEnabledAsync).toHaveBeenCalledWith(
      (mockConfig as any).enabled,
      mockContext,
    );
    expect(info).toHaveBeenCalledWith('⊘ Config "test-config" is disabled - skipping');
    expect(processConfigVariables).not.toHaveBeenCalled();
    expect(processConfigPrompts).not.toHaveBeenCalled();
  });

  it('should process config successfully when enabled', async () => {
    vi.mocked(evaluateEnabledAsync).mockResolvedValue(true);

    const result = await processConfig(mockConfig, mockContext);

    expect(result).toBe(true);
    expect(evaluateEnabledAsync).toHaveBeenCalledTimes(2);
    expect(evaluateEnabledAsync).toHaveBeenCalledWith(
      (mockConfig as any).enabled,
      mockContext,
    );
    expect(processConfigVariables).toHaveBeenCalledWith(mockConfig, mockContext);
    expect(processConfigPrompts).toHaveBeenCalledWith(mockConfig, mockContext);
    expect(info).not.toHaveBeenCalled();
  });

  it('should return false when config becomes disabled after processing', async () => {
    vi.mocked(evaluateEnabledAsync)
      .mockResolvedValueOnce(true) // Initial check
      .mockResolvedValueOnce(false); // After variables/prompts

    const result = await processConfig(mockConfig, mockContext);

    expect(result).toBe(false);
    expect(evaluateEnabledAsync).toHaveBeenCalledTimes(2);
    expect(processConfigVariables).toHaveBeenCalledWith(mockConfig, mockContext);
    expect(processConfigPrompts).toHaveBeenCalledWith(mockConfig, mockContext);
    expect(info).toHaveBeenCalledWith(
      '⊘ Config "test-config" became disabled after variable/prompt resolution - skipping tasks',
    );
  });

  it('should handle config with undefined enabled property', async () => {
    const configWithoutEnabled = { name: 'test-config' };
    vi.mocked(evaluateEnabledAsync).mockResolvedValue(true);

    const result = await processConfig(configWithoutEnabled, mockContext);

    expect(result).toBe(true);
    expect(evaluateEnabledAsync).toHaveBeenCalledWith(undefined, mockContext);
  });

  it('should handle config with explicit enabled true', async () => {
    const configWithEnabled = { name: 'test-config', enabled: true };
    vi.mocked(evaluateEnabledAsync).mockResolvedValue(true);

    const result = await processConfig(configWithEnabled, mockContext);

    expect(result).toBe(true);
    expect(evaluateEnabledAsync).toHaveBeenCalledWith(true, mockContext);
  });

  it('should handle config with conditional enabled', async () => {
    const configWithConditional = {
      name: 'test-config',
      enabled: { type: 'condition' as const, value: 'someVar === true' },
    };
    vi.mocked(evaluateEnabledAsync).mockResolvedValue(true);

    const result = await processConfig(configWithConditional, mockContext);

    expect(result).toBe(true);
    expect(evaluateEnabledAsync).toHaveBeenCalledWith(
      { type: 'condition', value: 'someVar === true' },
      mockContext,
    );
  });

  it('should call processConfigVariables and processConfigPrompts in correct order', async () => {
    vi.mocked(evaluateEnabledAsync).mockResolvedValue(true);

    const result = await processConfig(mockConfig, mockContext);

    expect(result).toBe(true);
    expect(processConfigVariables).toHaveBeenCalledWith(mockConfig, mockContext);
    expect(processConfigPrompts).toHaveBeenCalledWith(mockConfig, mockContext);

    // Verify order by checking call order
    const variablesCallOrder =
      vi.mocked(processConfigVariables).mock.invocationCallOrder[0];
    const promptsCallOrder = vi.mocked(processConfigPrompts).mock.invocationCallOrder[0];
    expect(variablesCallOrder! < promptsCallOrder!).toBe(true);
  });
});
