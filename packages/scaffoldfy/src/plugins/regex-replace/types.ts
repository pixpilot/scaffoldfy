/**
 * regex-replace plugin types
 */

import type { ConditionExpression } from '../../types';

export interface RegexReplaceConfig {
  file: string;
  pattern: string;
  flags?: string;
  replacement: string;
  condition?: ConditionExpression;
}
