/**
 * append plugin types
 */

import type { ConditionExpression } from '../../types';

export interface AppendConfig {
  file: string;
  content?: string; // Inline content string (supports simple {{variable}} syntax)
  template?: string; // Alias for content
  templateFile?: string; // Path to external template file (relative to project root). .hbs files use Handlebars automatically
  newline?: boolean; // Add newline before appending (default: true)
  condition?: ConditionExpression;
}
