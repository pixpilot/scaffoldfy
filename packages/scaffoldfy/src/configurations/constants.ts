/**
 * Conflicting field groups for different task types
 * These fields cannot coexist in the same config
 */
export const CONFLICTING_FIELDS: Record<string, string[][]> = {
  template: [['template', 'templateFile']], // template tasks can have either inline template OR templateFile
};
