/**
 * exec plugin types
 */

import type { ConditionExpression } from '../../types';

export interface ExecConfig {
  command: string;
  /**
   * Arguments appended to the command. Each entry supports {{variable}}
   * interpolation and is quoted for the current shell, so values containing
   * spaces do not need manual quotes. Entries that interpolate to an empty
   * string are dropped, which makes optional flags easy to express.
   */
  args?: string[];
  cwd?: string;
  condition?: ConditionExpression;
}
