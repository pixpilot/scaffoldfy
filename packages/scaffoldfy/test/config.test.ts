/**
 * Tests for configuration collection and validation
 */

import type { InitConfig } from '../src/types.js';
import { describe, expect, it } from 'vitest';
import { validateConfig } from '../src/config.js';

describe('configuration Validation', () => {
  it('should validate valid config', () => {
    const config: InitConfig = {
      repoName: 'test-repo',
      repoOwner: 'test-owner',
      repoUrl: 'https://github.com/test-owner/test-repo.git',
      author: 'Test Author',
      baseRepoUrl: 'https://github.com/test-owner/test-repo',
      orgName: '@test-org',
    };

    const errors = validateConfig(config);
    expect(errors).toHaveLength(0);
  });

  it('should validate config with tsdown bundler', () => {
    const config: InitConfig = {
      repoName: 'test-repo',
      repoOwner: 'test-owner',
      repoUrl: 'https://github.com/test-owner/test-repo.git',
      author: 'Test Author',
      baseRepoUrl: 'https://github.com/test-owner/test-repo',
      orgName: '@test-org',
    };

    const errors = validateConfig(config);
    expect(errors).toHaveLength(0);
  });

  it('should catch missing repository name', () => {
    const config = {
      repoName: '',
      repoOwner: 'test-owner',
      repoUrl: 'https://github.com/test/test.git',
      author: 'Test',
      baseRepoUrl: 'https://github.com/test/test',
      orgName: '@test',
    } as InitConfig;

    const errors = validateConfig(config);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('Repository name'))).toBe(true);
  });

  it('should catch missing repository owner', () => {
    const config = {
      repoName: 'test-repo',
      repoOwner: '',
      repoUrl: 'https://github.com/test/test.git',
      author: 'Test',
      baseRepoUrl: 'https://github.com/test/test',
      orgName: '@test',
    } as InitConfig;

    const errors = validateConfig(config);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('Repository owner'))).toBe(true);
  });

  it('should catch missing repository URL', () => {
    const config = {
      repoName: 'test',
      repoOwner: 'test',
      repoUrl: '',
      author: 'Test',
      baseRepoUrl: 'https://github.com/test/test',
      orgName: '@test',
    } as InitConfig;

    const errors = validateConfig(config);
    expect(errors.some((e) => e.includes('Repository URL'))).toBe(true);
  });

  it('should catch missing base repository URL', () => {
    const config = {
      repoName: 'test',
      repoOwner: 'test',
      repoUrl: 'https://github.com/test/test.git',
      author: 'Test',
      baseRepoUrl: '',
      orgName: '@test',
    } as InitConfig;

    const errors = validateConfig(config);
    expect(errors.some((e) => e.includes('Base repository URL'))).toBe(true);
  });

  it('should catch multiple validation errors', () => {
    const config = {
      repoName: '',
      repoOwner: '',
      repoUrl: '',
      author: 'Test',
      baseRepoUrl: '',
      orgName: 'no-at-sign',
    } as InitConfig;

    const errors = validateConfig(config);
    expect(errors.length).toBeGreaterThan(3);
  });

  it('should accept whitespace-padded but valid values', () => {
    const config: InitConfig = {
      repoName: ' test-repo ',
      repoOwner: ' test-owner ',
      repoUrl: 'https://github.com/test-owner/test-repo.git',
      author: 'Test Author',
      baseRepoUrl: 'https://github.com/test-owner/test-repo',
      orgName: '@test-org',
    };

    const errors = validateConfig(config);
    // Should pass because trim() is called during validation
    expect(errors).toHaveLength(0);
  });
});
