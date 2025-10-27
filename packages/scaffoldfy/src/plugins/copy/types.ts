/**
 * copy plugin types
 */

import type { ConditionExpression } from '../../types';

export interface CopyConfig {
  from: string;
  to: string;
  condition?: ConditionExpression;
}
