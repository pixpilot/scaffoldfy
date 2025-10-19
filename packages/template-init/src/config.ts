/**
 * Configuration collection and validation
 */

import type { InitConfig } from './types.js';
import { confirm, input, select } from '@inquirer/prompts';
import { getGitRepoInfo, log } from './utils.js';

/**
 * Validate the initialization configuration
 */
export function validateConfig(config: InitConfig): string[] {
  const errors: string[] = [];

  if (!config.repoName || config.repoName.trim() === '') {
    errors.push('Repository name is required');
  }

  if (!config.repoOwner || config.repoOwner.trim() === '') {
    errors.push('Repository owner is required');
  }

  if (!config.orgName || config.orgName.trim() === '') {
    errors.push('Organization name is required');
  } else if (!config.orgName.startsWith('@')) {
    errors.push('Organization name should start with @ (e.g., @myorg)');
  }

  if (!config.defaultBundler || !['tsc', 'tsdown'].includes(config.defaultBundler)) {
    errors.push('Default bundler must be either "tsc" or "tsdown"');
  }

  if (!config.repoUrl || config.repoUrl.trim() === '') {
    errors.push('Repository URL is required');
  }

  if (!config.baseRepoUrl || config.baseRepoUrl.trim() === '') {
    errors.push('Base repository URL is required');
  }

  return errors;
}

/**
 * Collect configuration from user interactively
 */
export async function collectConfig(dryRun = false): Promise<InitConfig> {
  log('Welcome to the template initialization script!', 'info');
  console.log('');

  if (dryRun) {
    log('🔍 DRY RUN MODE - No changes will be made', 'warn');
    console.log('');
  }

  log('This will clean up the template and prepare it for your new project.', 'info');
  console.log('');

  const gitInfo = getGitRepoInfo();

  // Get repository information
  const repoOwner = await input({
    message: 'Repository owner/organization',
    default: gitInfo?.owner ?? '',
  });

  const repoName = await input({
    message: 'Repository name',
    default: gitInfo?.name ?? '',
  });

  const repoUrl = await input({
    message: 'Repository URL',
    default: gitInfo?.url ?? `https://github.com/${repoOwner}/${repoName}.git`,
  });

  // Get package configuration
  const author = await input({
    message: 'Author name (for package.json)',
    default: '',
  });

  // Detect organization from git URL - only set default if owner starts with @ or is an org
  const detectedOrgName =
    gitInfo?.owner != null && gitInfo.owner !== '' ? `@${gitInfo.owner}` : '';

  const orgName = await input({
    message: 'Organization name for packages (e.g., @myorg)',
    default: detectedOrgName,
  });

  const baseRepoUrl = await input({
    message: 'Base repository URL (for package links)',
    default: `https://github.com/${repoOwner}/${repoName}`,
  });

  const defaultBundler = await select({
    message: 'Default bundler',
    choices: [
      { name: 'TypeScript Compiler (tsc)', value: 'tsc' },
      { name: 'TSDown (faster builds)', value: 'tsdown' },
    ],
    default: 'tsc',
  });

  // Ask about example packages
  const keepExamplePackages = await confirm({
    message: 'Keep example packages? (helpful for reference)',
    default: false,
  });

  console.log('');
  return {
    repoName,
    repoOwner,
    repoUrl,
    author,
    baseRepoUrl,
    defaultBundler,
    orgName,
    keepExamplePackages,
  };
}
