/**
 * regex-replace plugin types
 */

import type { ConditionExpression } from '../../types.js';

export interface RegexReplaceConfig {
  file: string;
  pattern: string;
  flags?: string;
  replacement: string;
  condition?: ConditionExpression;
}
