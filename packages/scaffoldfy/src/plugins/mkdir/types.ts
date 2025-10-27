/**
 * mkdir plugin types
 */

import type { ConditionExpression } from '../../types';

export interface MkdirConfig {
  path: string;
  condition?: ConditionExpression;
}
