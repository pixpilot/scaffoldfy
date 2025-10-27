/**
 * Tests for utility functions
 */

import type { CurrentConfigurationContext } from '../src/types';
import { describe, expect, it } from 'vitest';
import { evaluateCondition, evaluateEnabled, interpolateTemplate } from '../src/utils';

describe('template Interpolation', () => {
  const config: CurrentConfigurationContext = {
    projectName: 'my-repo',
    repoUrl: 'https://github.com/my-owner/my-repo.git',
    author: 'John Doe',
  };

  it('should interpolate single variable', () => {
    const result = interpolateTemplate('Hello {{author}}', config);
    expect(result).toBe('Hello John Doe');
  });

  it('should interpolate multiple variables', () => {
    const result = interpolateTemplate('{{projectName}} at {{repoUrl}}', config);
    expect(result).toBe('my-repo at https://github.com/my-owner/my-repo.git');
  });

  it('should handle missing variables', () => {
    const result = interpolateTemplate('Hello {{missing}}', config);
    expect(result).toBe('Hello ');
  });

  it('should work with complex templates', () => {
    const template = `# {{projectName}}
Repository: {{repoUrl}}
Author: {{author}}`;

    const result = interpolateTemplate(template, config);

    expect(result).toContain('# my-repo');
    expect(result).toContain('Author: John Doe');
    expect(result).toContain('Repository: https://github.com/my-owner/my-repo.git');
  });

  it('should not interpolate incomplete templates', () => {
    const result = interpolateTemplate('Hello {author}', config);
    expect(result).toBe('Hello {author}');
  });

  it('should handle empty template', () => {
    const result = interpolateTemplate('', config);
    expect(result).toBe('');
  });
});

describe('condition Evaluation', () => {
  const config: CurrentConfigurationContext = {
    projectType: 'monorepo',
    orgName: '@test',
    keepExamples: true,
  };

  it('should evaluate simple boolean conditions', () => {
    expect(evaluateCondition('orgName.startsWith("@")', config)).toBe(true);
    expect(evaluateCondition('!orgName.startsWith("@")', config)).toBe(false);
  });

  it('should handle invalid conditions gracefully', () => {
    // Should return false for invalid conditions rather than throwing
    expect(evaluateCondition('invalid syntax {{', config)).toBe(false);
  });

  it('should evaluate conditions with different values', () => {
    const configWithoutAt = { ...config, orgName: 'test' };
    expect(evaluateCondition('orgName.startsWith("@")', configWithoutAt)).toBe(false);
    expect(evaluateCondition('!orgName.startsWith("@")', configWithoutAt)).toBe(true);
  });

  it('should evaluate conditions with dynamic prompt values', () => {
    // Test with boolean prompt value
    const configWithPrompt = { ...config, keepExamplePackages: false };
    expect(evaluateCondition('!keepExamplePackages', configWithPrompt)).toBe(true);
    expect(evaluateCondition('keepExamplePackages', configWithPrompt)).toBe(false);

    const configWithPromptTrue = { ...config, keepExamplePackages: true };
    expect(evaluateCondition('!keepExamplePackages', configWithPromptTrue)).toBe(false);
    expect(evaluateCondition('keepExamplePackages', configWithPromptTrue)).toBe(true);
  });

  it('should evaluate conditions with string prompt values', () => {
    const configWithString = { ...config, projectType: 'monorepo' };
    expect(evaluateCondition('projectType === "monorepo"', configWithString)).toBe(true);
    expect(evaluateCondition('projectType === "standalone"', configWithString)).toBe(
      false,
    );
  });

  it('should return false for undefined variables in normal mode', () => {
    const emptyConfig: CurrentConfigurationContext = {};
    expect(evaluateCondition('undefinedVar === true', emptyConfig)).toBe(false);
  });

  it('should return true for undefined variables in lazy mode', () => {
    const emptyConfig: CurrentConfigurationContext = {};
    expect(evaluateCondition('undefinedVar === true', emptyConfig, { lazy: true })).toBe(
      true,
    );
  });

  it('should evaluate correctly in lazy mode when variable exists', () => {
    const configWithVar = { myVar: true };
    expect(evaluateCondition('myVar === true', configWithVar, { lazy: true })).toBe(true);
    expect(evaluateCondition('myVar === false', configWithVar, { lazy: true })).toBe(
      false,
    );
  });

  it('should handle complex conditions with undefined variables in lazy mode', () => {
    const emptyConfig: CurrentConfigurationContext = {};
    // In lazy mode, if any variable is undefined (ReferenceError), return true
    expect(
      evaluateCondition('addSecurityFile === true', emptyConfig, { lazy: true }),
    ).toBe(true);
  });
});

describe('evaluate Enabled', () => {
  const config: CurrentConfigurationContext = {
    useTypeScript: true,
    projectType: 'monorepo',
  };

  it('should return true when enabled is undefined', () => {
    expect(evaluateEnabled(undefined, config)).toBe(true);
  });

  it('should return the boolean value when enabled is boolean', () => {
    expect(evaluateEnabled(true, config)).toBe(true);
    expect(evaluateEnabled(false, config)).toBe(false);
  });

  it('should evaluate condition when enabled is conditional object', () => {
    expect(
      evaluateEnabled({ type: 'condition', value: 'useTypeScript === true' }, config),
    ).toBe(true);
    expect(
      evaluateEnabled({ type: 'condition', value: 'useTypeScript === false' }, config),
    ).toBe(false);
    expect(
      evaluateEnabled({ type: 'condition', value: 'projectType === "monorepo"' }, config),
    ).toBe(true);
  });

  it('should handle complex conditions', () => {
    expect(
      evaluateEnabled(
        {
          type: 'condition',
          value: 'useTypeScript === true && projectType === "monorepo"',
        },
        config,
      ),
    ).toBe(true);
    expect(
      evaluateEnabled(
        { type: 'condition', value: 'useTypeScript === false || projectType === "lib"' },
        config,
      ),
    ).toBe(false);
  });

  it('should return false for undefined variables in normal mode', () => {
    const emptyConfig: CurrentConfigurationContext = {};
    expect(
      evaluateEnabled({ type: 'condition', value: 'missingVar === true' }, emptyConfig),
    ).toBe(false);
  });

  it('should return true for undefined variables in lazy mode', () => {
    const emptyConfig: CurrentConfigurationContext = {};
    expect(
      evaluateEnabled({ type: 'condition', value: 'missingVar === true' }, emptyConfig, {
        lazy: true,
      }),
    ).toBe(true);
  });

  it('should evaluate correctly in lazy mode when variable exists', () => {
    expect(
      evaluateEnabled({ type: 'condition', value: 'useTypeScript === true' }, config, {
        lazy: true,
      }),
    ).toBe(true);
    expect(
      evaluateEnabled({ type: 'condition', value: 'useTypeScript === false' }, config, {
        lazy: true,
      }),
    ).toBe(false);
  });

  it('should handle complex conditions with undefined variables in lazy mode', () => {
    const emptyConfig: CurrentConfigurationContext = {};
    expect(
      evaluateEnabled(
        { type: 'condition', value: 'addSecurityFile === true' },
        emptyConfig,
        {
          lazy: true,
        },
      ),
    ).toBe(true);
  });

  it('should return false for unexpected enabled values', () => {
    // Test edge case where enabled is neither boolean nor conditional object
    expect(evaluateEnabled({} as never, config)).toBe(false);
  });
});
