/**
 * Tests for process config variables
 */

import { describe, expect, it } from 'vitest';
import { processConfigVariables } from '../../src/configurations/process-config-variables';

describe('process config variables', () => {
  it('should export processConfigVariables function', () => {
    expect(processConfigVariables).toBeDefined();
    expect(typeof processConfigVariables).toBe('function');
  });

  it('should process empty variables array', async () => {
    const config = { name: 'test', variables: [] };
    const context = {};
    await expect(processConfigVariables(config, context)).resolves.toBeUndefined();
  });

  it('should process config without variables', async () => {
    const config = { name: 'test' };
    const context = {};
    await expect(processConfigVariables(config, context)).resolves.toBeUndefined();
  });

  it('should process variables successfully', async () => {
    const config = {
      name: 'test',
      variables: [
        {
          id: 'testVar',
          value: 'testValue',
        },
      ],
    };
    const context = {};
    await expect(processConfigVariables(config, context)).resolves.toBeUndefined();
    expect(context).toHaveProperty('testVar', 'testValue');
  });

  it('should handle conditional variables', async () => {
    const config = {
      name: 'test',
      variables: [
        {
          id: 'conditionalVar',
          value: {
            type: 'conditional' as const,
            condition: 'true',
            ifTrue: 'conditionalValue',
            ifFalse: 'defaultValue',
          },
        },
      ],
    };
    const context = {};
    await expect(processConfigVariables(config, context)).resolves.toBeUndefined();
    expect(context).toHaveProperty('conditionalVar', 'conditionalValue');
  });
});
