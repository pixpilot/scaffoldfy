/**
 * Configuration initialization
 *
 * Note: Previously, scaffoldfy had built-in configuration properties
 * (repoName, repoOwner, repoUrl, author, baseRepoUrl, orgName).
 * These have been removed. Users should now define custom prompts with
 * "global": true to create configuration variables available across all tasks.
 *
 * Example:
 * {
 *   "prompts": [{
 *     "id": "repoUrl",
 *     "type": "input",
 *     "message": "Repository URL",
 *     "global": true,
 *     "default": {
 *       "type": "execute",
 *       "value": "git config --get remote.origin.url"
 *     }
 *   }]
 * }
 */

import type { InitConfig } from './types.js';

/**
 * Create an empty initial configuration object.
 * Configuration will be populated by prompts.
 */
export function createInitialConfig(): InitConfig {
  return {};
}
