/**
 * Configuration collection and validation
 */

import type { InitConfig } from './types.js';
import { getGitRepoInfo, log, prompt, promptYesNo } from './utils.js';

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
  const repoOwner = await prompt('Repository owner/organization', gitInfo?.owner ?? '');
  const repoName = await prompt('Repository name', gitInfo?.name ?? '');
  const repoUrl = await prompt(
    'Repository URL',
    gitInfo?.url ?? `https://github.com/${repoOwner}/${repoName}.git`,
  );

  // Get package configuration
  const author = await prompt('Author name (for package.json)', '');
  const orgName = await prompt(
    'Organization name for packages (e.g., @myorg)',
    repoOwner ? `@${repoOwner}` : '',
  );
  const baseRepoUrl = await prompt(
    'Base repository URL (for package links)',
    `https://github.com/${repoOwner}/${repoName}`,
  );
  const defaultBundler = await prompt('Default bundler (tsc/tsdown)', 'tsc');

  // Ask about example packages
  const keepExamplePackages = await promptYesNo(
    'Keep example packages? (helpful for reference)',
    false,
  );

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
