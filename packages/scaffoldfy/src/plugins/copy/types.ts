/**
 * copy plugin types
 */

import type { ConditionExpression } from '../../types.js';

export interface CopyConfig {
  from: string;
  to: string;
  condition?: ConditionExpression;
}
