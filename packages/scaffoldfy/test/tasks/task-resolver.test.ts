/**
 * Tests for task resolver
 */

import { describe, expect, it } from 'vitest';
import { topologicalSort } from '../../src/tasks/task-resolver';

describe('task resolver', () => {
  it('should export topologicalSort function', () => {
    expect(topologicalSort).toBeDefined();
    expect(typeof topologicalSort).toBe('function');
  });
});
