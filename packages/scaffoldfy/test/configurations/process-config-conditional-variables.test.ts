import type { ScaffoldfyConfiguration } from '../../src/types';
import { describe, expect, it, vi } from 'vitest';
import { processConfig } from '../../src/configurations/process-config';

vi.mock('../../src/configurations/process-config-prompts', () => ({
  processConfigPrompts: vi.fn(async (_config, context) => {
    context.packageType = 'react';
  }),
}));

describe('processConfig conditional variable recomputation', () => {
  it('re-resolves conditional variables after prompts are collected', async () => {
    const context: Record<string, unknown> = {};

    const config: ScaffoldfyConfiguration = {
      name: 'conditional-after-prompts',
      tasks: [],
      variables: [
        {
          id: 'isReactPackage',
          value: {
            type: 'conditional',
            condition: "packageType === 'react'",
            ifTrue: true,
            ifFalse: false,
          },
        },
      ],
    };

    const result = await processConfig(config, context);

    expect(result).toBe(true);
    expect(context['packageType']).toBe('react');
    expect(context['isReactPackage']).toBe(true);
  });
});
