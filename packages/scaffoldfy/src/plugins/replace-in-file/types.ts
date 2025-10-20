/**
 * replace-in-file plugin types
 */

import type { ConditionExpression } from '../../types.js';

export interface ReplaceInFileConfig {
  file: string;
  replacements: Array<{
    find: string;
    replace: string;
  }>;
  condition?: ConditionExpression;
}
