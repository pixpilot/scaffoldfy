/**
 * Tests for dry-run utils functions
 */

import { describe, expect, it } from 'vitest';

import { formatDiffLine, generateDiff } from '../../src/dry-run/utils.js';

describe('formatDiffLine', () => {
  it('should format add lines', () => {
    const result = formatDiffLine('new line', 'add');
    expect(result).toContain('+ new line');
  });

  it('should format remove lines', () => {
    const result = formatDiffLine('old line', 'remove');
    expect(result).toContain('- old line');
  });

  it('should format context lines', () => {
    const result = formatDiffLine('context line', 'context');
    expect(result).toContain('  context line');
  });

  it('should return line as is for unknown type', () => {
    const result = formatDiffLine('unknown line', 'unknown' as any);
    expect(result).toBe('unknown line');
  });
});

describe('generateDiff', () => {
  it('should generate diff for identical content', () => {
    const original = 'line1\nline2';
    const modified = 'line1\nline2';

    const diff = generateDiff(original, modified);

    expect(diff).toHaveLength(2);
    expect(diff[0]).toContain('  line1');
    expect(diff[1]).toContain('  line2');
  });

  it('should generate diff for modified content', () => {
    const original = 'line1\nline2';
    const modified = 'line1\nmodified';

    const diff = generateDiff(original, modified);

    expect(diff).toHaveLength(3);
    expect(diff[0]).toContain('  line1');
    expect(diff[1]).toContain('- line2');
    expect(diff[2]).toContain('+ modified');
  });

  it('should generate diff for added lines', () => {
    const original = 'line1';
    const modified = 'line1\nline2';

    const diff = generateDiff(original, modified);

    expect(diff).toHaveLength(2);
    expect(diff[0]).toContain('  line1');
    expect(diff[1]).toContain('+ line2');
  });

  it('should generate diff for removed lines', () => {
    const original = 'line1\nline2';
    const modified = 'line1';

    const diff = generateDiff(original, modified);

    expect(diff).toHaveLength(2);
    expect(diff[0]).toContain('  line1');
    expect(diff[1]).toContain('- line2');
  });
});
