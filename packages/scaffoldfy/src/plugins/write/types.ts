/**
 * write plugin types
 */

import type { ConditionExpression } from '../../types.js';

export interface WriteConfig {
  file: string;
  template?: string; // Inline template string (supports simple {{variable}} syntax)
  templateFile?: string; // Path to external template file (relative to project root). .hbs files use Handlebars automatically
  condition?: ConditionExpression;
  /**
   * Whether to allow creating the file if it does not exist.
   * @default true
   */
  allowCreate?: boolean;
}
