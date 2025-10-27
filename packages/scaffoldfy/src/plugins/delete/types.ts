/**
 * delete plugin types
 */

import type { ConditionExpression } from '../../types';

export interface DeleteConfig {
  paths: string[];
  condition?: ConditionExpression;
}
