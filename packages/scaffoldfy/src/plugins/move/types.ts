/**
 * move plugin types
 */

import type { ConditionExpression } from '../../types.js';

export interface MoveConfig {
  from: string;
  to: string;
  condition?: ConditionExpression;
}
