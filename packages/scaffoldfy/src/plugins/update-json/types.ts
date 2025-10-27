/**
 * update-json plugin types
 */

import type { ConditionExpression } from '../../types';

export interface UpdateJsonConfig {
  file: string;
  updates: Record<string, unknown>;
  condition?: ConditionExpression;
}
