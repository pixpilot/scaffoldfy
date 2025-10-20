/**
 * rename plugin types
 */

import type { ConditionExpression } from '../../types.js';

export interface RenameConfig {
  from: string;
  to: string;
  condition?: ConditionExpression;
}
