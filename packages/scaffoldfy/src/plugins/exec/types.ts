/**
 * exec plugin types
 */

import type { ConditionExpression } from '../../types.js';

export interface ExecConfig {
  command: string;
  cwd?: string;
  condition?: ConditionExpression;
}
