/**
 * Configuration initialization
 *
 * Note: Previously, scaffoldfy had built-in configuration properties
 * (repoName, repoOwner, repoUrl, author, baseRepoUrl, orgName).
 * These have been removed. Users should now define custom prompts with
 *
 * Example:
 * {
 *   "prompts": [{
 *     "id": "repoUrl",
 *     "type": "input",
 *     "message": "Repository URL",
 *     "default": {
 *       "type": "execute",
 *       "value": "git config --get remote.origin.url"
 *     }
 *   }]
 * }
 */

import type { InitConfig } from '../types';

/**
 * Create an empty initial configuration object.
 * Configuration will be populated by prompts.
 */
export function createInitialConfig(): InitConfig {
  return {};
}
