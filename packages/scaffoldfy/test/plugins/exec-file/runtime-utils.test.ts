/**
 * Tests for runtime detection utilities
 */

import { describe, expect, it } from 'vitest';
import {
  detectRuntimeFromExtension,
  getFileExtension,
  getRuntimeCommand,
} from '../../../src/plugins/exec-file/runtime-utils.js';

describe('detectRuntimeFromExtension', () => {
  it('should detect node for .js files', () => {
    expect(detectRuntimeFromExtension('script.js')).toBe('node');
    expect(detectRuntimeFromExtension('/path/to/script.js')).toBe('node');
  });

  it('should detect node for .cjs files', () => {
    expect(detectRuntimeFromExtension('script.cjs')).toBe('node');
  });

  it('should detect node for .mjs files', () => {
    expect(detectRuntimeFromExtension('script.mjs')).toBe('node');
  });

  it('should detect bash for .sh files', () => {
    expect(detectRuntimeFromExtension('script.sh')).toBe('bash');
  });

  it('should detect bash for .bash files', () => {
    expect(detectRuntimeFromExtension('script.bash')).toBe('bash');
  });

  it('should detect pwsh for .ps1 files', () => {
    expect(detectRuntimeFromExtension('script.ps1')).toBe('pwsh');
  });

  it('should return undefined for unknown extensions', () => {
    expect(detectRuntimeFromExtension('script.txt')).toBeUndefined();
    expect(detectRuntimeFromExtension('script.py')).toBeUndefined();
    expect(detectRuntimeFromExtension('script')).toBeUndefined();
  });

  it('should be case insensitive', () => {
    expect(detectRuntimeFromExtension('script.JS')).toBe('node');
    expect(detectRuntimeFromExtension('script.SH')).toBe('bash');
    expect(detectRuntimeFromExtension('script.PS1')).toBe('pwsh');
  });
});

describe('getRuntimeCommand', () => {
  it('should generate correct command for node', () => {
    expect(getRuntimeCommand('node', '/path/to/script.js')).toBe(
      'node "/path/to/script.js"',
    );
  });

  it('should generate correct command for bash', () => {
    expect(getRuntimeCommand('bash', '/path/to/script.sh')).toBe(
      'bash "/path/to/script.sh"',
    );
  });

  it('should generate correct command for sh', () => {
    expect(getRuntimeCommand('sh', '/path/to/script.sh')).toBe('sh "/path/to/script.sh"');
  });

  it('should generate correct command for pwsh', () => {
    expect(getRuntimeCommand('pwsh', '/path/to/script.ps1')).toBe(
      'pwsh -File "/path/to/script.ps1"',
    );
  });

  it('should generate correct command for powershell', () => {
    expect(getRuntimeCommand('powershell', '/path/to/script.ps1')).toBe(
      'powershell -File "/path/to/script.ps1"',
    );
  });
});

describe('getFileExtension', () => {
  it('should return .js for node', () => {
    expect(getFileExtension('node')).toBe('.js');
  });

  it('should return .sh for bash', () => {
    expect(getFileExtension('bash')).toBe('.sh');
  });

  it('should return .sh for sh', () => {
    expect(getFileExtension('sh')).toBe('.sh');
  });

  it('should return .ps1 for pwsh', () => {
    expect(getFileExtension('pwsh')).toBe('.ps1');
  });

  it('should return .ps1 for powershell', () => {
    expect(getFileExtension('powershell')).toBe('.ps1');
  });
});
