/**
 * delete plugin types
 */

import type { ConditionExpression } from '../../types.js';

export interface DeleteConfig {
  paths: string[];
  condition?: ConditionExpression;
}
