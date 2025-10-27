/**
 * exec plugin types
 */

import type { ConditionExpression } from '../../types';

export interface ExecConfig {
  command: string;
  cwd?: string;
  condition?: ConditionExpression;
}
