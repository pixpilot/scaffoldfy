/**
 * Task validation functions - validates tasks before execution
 */

import { log } from './logger';

/**
 * Display validation errors in a user-friendly format
 */
export function displayValidationErrors(errors: string[]): void {
  log('❌ Template validation failed:', 'error');
  log('', 'error');
  for (const error of errors) {
    log(`  • ${error}`, 'error');
  }
  log('', 'error');
  log('Please fix these errors before continuing.', 'error');
}
