/**
 * create plugin types
 */

import type { ConditionExpression } from '../../types';

export interface CreateConfig {
  file: string;
  template?: string; // Inline template string (supports simple {{variable}} syntax)
  templateFile?: string; // Path to external template file (relative to project root). .hbs files use Handlebars automatically
  condition?: ConditionExpression;
}
