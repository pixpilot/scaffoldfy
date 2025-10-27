/**
 * rename plugin types
 */

import type { ConditionExpression } from '../../types';

export interface RenameConfig {
  from: string;
  to: string;
  condition?: ConditionExpression;
}
