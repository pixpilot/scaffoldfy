/**
 * Tests for execute script file
 */

import { describe, expect, it } from 'vitest';
import { executeScriptFile } from '../../../src/plugins/exec-file/execute-script-file';

describe('execute script file', () => {
  it('should export executeScriptFile function', () => {
    expect(executeScriptFile).toBeDefined();
    expect(typeof executeScriptFile).toBe('function');
  });
});
