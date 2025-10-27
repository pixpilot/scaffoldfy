/**
 * move plugin types
 */

import type { ConditionExpression } from '../../types';

export interface MoveConfig {
  from: string;
  to: string;
  condition?: ConditionExpression;
}
