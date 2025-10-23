/**
 * mkdir plugin types
 */

import type { ConditionExpression } from '../../types.js';

export interface MkdirConfig {
  path: string;
  condition?: ConditionExpression;
}
