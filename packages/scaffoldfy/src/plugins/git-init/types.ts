/**
 * git-init plugin types
 */

import type { ConditionExpression } from '../../types.js';

export interface GitInitConfig {
  removeExisting: boolean;
  initialCommit: boolean;
  message?: string;
  condition?: ConditionExpression;
}
