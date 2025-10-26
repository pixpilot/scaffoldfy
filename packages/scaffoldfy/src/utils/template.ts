import type { InitConfig } from '../types';
import { getNestedProperty } from './object';

/**
 * Interpolate template variables in a string
 */
export function interpolateTemplate(template: string, config: InitConfig): string {
  return template.replace(/\{\{(?<key>[\w.]+)\}\}/gu, (match, key: string) => {
    const value = getNestedProperty(config as unknown as Record<string, unknown>, key);
    return value?.toString() ?? '';
  });
}
