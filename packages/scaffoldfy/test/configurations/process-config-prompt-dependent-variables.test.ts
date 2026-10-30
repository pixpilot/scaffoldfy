import type { ScaffoldfyConfiguration } from '../../src/types';
import { describe, expect, it, vi } from 'vitest';
import { processConfig } from '../../src/configurations/process-config';

vi.mock('../../src/configurations/process-config-prompts', () => ({
  processConfigPrompts: vi.fn(async (_config, context) => {
    context.featureName = 'sample-feature';
  }),
}));

describe('processConfig prompt-dependent variables', () => {
  it('resolves variables that interpolate prompt answers after prompts are collected', async () => {
    const context: Record<string, unknown> = {};

    const config: ScaffoldfyConfiguration = {
      name: 'prompt-dependent-variables',
      tasks: [],
      prompts: [{ id: 'featureName', type: 'input', message: 'Feature name' }],
      variables: [
        {
          id: 'featureDirectory',
          value: { type: 'interpolate', value: 'packages/{{featureName}}' },
        },
        {
          id: 'featurePascal',
          value: { type: 'interpolate', value: '{{featureName}}' },
          transformers: ['pascalcase'],
        },
        {
          id: 'featureConstant',
          value: { type: 'interpolate', value: '{{featureName}}' },
          transformers: ['constantcase'],
        },
        {
          id: 'screenFile',
          value: {
            type: 'interpolate',
            value: '{{featureDirectory}}/{{featurePascal}}Screen.tsx',
          },
        },
      ],
    };

    await expect(processConfig(config, context)).resolves.toBe(true);

    expect(context).toMatchObject({
      featureDirectory: 'packages/sample-feature',
      featurePascal: 'SampleFeature',
      featureConstant: 'SAMPLE_FEATURE',
      screenFile: 'packages/sample-feature/SampleFeatureScreen.tsx',
    });
  });
});
