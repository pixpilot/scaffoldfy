import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateScaffoldfyJsonFile } from '@pixpilot/scaffoldfy';
import { describe, expect, it } from 'vitest';

const CONFIG_DIR = path.join(__dirname, '..', 'workspace-package-generator');
const TEMPLATES_DIR = path.join(CONFIG_DIR, 'templates');
const SCRIPTS_DIR = path.join(CONFIG_DIR, 'scripts');

/** Directory where scaffoldfy is installed (contains its own handlebars dep). */
const SCAFFOLDFY_DIR = path.join(
  __dirname,
  '..',
  'node_modules',
  '@pixpilot',
  'scaffoldfy',
);

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Render a Handlebars template file by writing a small CJS runner script to
 * a temp file and executing it inside the scaffoldfy package directory so that
 * `require('handlebars')` resolves correctly.
 */
function renderHbs(templatePath: string, context: Record<string, unknown>): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffoldfy-hbs-'));
  const runnerPath = path.join(tmpDir, 'run.cjs');
  /*
   * The runner is a plain CJS file — it resolves Handlebars relative to
   * SCAFFOLDFY_DIR via require.resolve, then renders the template.
   */
  const hbsPath = require.resolve('handlebars', { paths: [SCAFFOLDFY_DIR] });
  const runnerScript = [
    `'use strict';`,
    `const Handlebars = require(${JSON.stringify(hbsPath)});`,
    `const templateContent = require('node:fs').readFileSync(${JSON.stringify(templatePath)}, 'utf8');`,
    `const compiled = Handlebars.compile(templateContent);`,
    `process.stdout.write(compiled(${JSON.stringify(context)}));`,
  ].join('\n');

  try {
    fs.writeFileSync(runnerPath, runnerScript);
    return execSync(`node "${runnerPath}"`, { encoding: 'utf8' });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Run the add-dependencies.cjs script in a temp directory and return
 * the resulting package.json as an object.
 */
function runAddDeps(
  initialPkg: Record<string, unknown>,
  deps: string,
): Record<string, unknown> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffoldfy-test-'));
  const pkgFile = path.join(tmpDir, 'package.json');
  try {
    fs.writeFileSync(pkgFile, JSON.stringify(initialPkg, null, 2));
    execSync(
      `node ${JSON.stringify(path.join(SCRIPTS_DIR, 'add-dependencies.cjs'))} --file=${JSON.stringify(pkgFile)} --deps=${JSON.stringify(deps)}`,
      { encoding: 'utf8' },
    );
    return JSON.parse(fs.readFileSync(pkgFile, 'utf8')) as Record<string, unknown>;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/* -------------------------------------------------------------------------- */
/*  Schema validation                                                          */
/* -------------------------------------------------------------------------- */

describe('workspace-package-generator – schema', () => {
  it('should have a valid scaffoldfy.json', () => {
    const filePath = path.join(CONFIG_DIR, 'scaffoldfy.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const result = validateScaffoldfyJsonFile(filePath);
    if (!result.valid) {
      console.error('Validation errors:', result.errors);
    }
    expect(result.valid).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/*  Template file existence                                                    */
/* -------------------------------------------------------------------------- */

describe('workspace-package-generator – template files', () => {
  const expectedTemplates = [
    'eslint.config.mjs.hbs',
    'package.json.hbs',
    'README.md.hbs',
    'tsconfig.json.hbs',
    'tsconfig.build.json.hbs',
    'tsdown.config.ts.hbs',
    'vitest.config.ts.hbs',
    path.join('src', 'index.ts.hbs'),
    path.join('test', 'index.test.ts.hbs'),
    // license templates removed from this config; no expectations here
  ];

  for (const tpl of expectedTemplates) {
    it(`should have template: ${tpl}`, () => {
      expect(fs.existsSync(path.join(TEMPLATES_DIR, tpl))).toBe(true);
    });
  }
});

/* -------------------------------------------------------------------------- */
/*  Helper scripts                                                             */
/* -------------------------------------------------------------------------- */

describe('workspace-package-generator – add-dependencies script', () => {
  it('should add dependencies to package.json', () => {
    const initial = { name: 'test-pkg', dependencies: {} };
    const result = runAddDeps(initial, 'lodash axios');

    expect(result.dependencies).toMatchObject({ lodash: '*', axios: '*' });
  });

  it('should sort dependencies alphabetically', () => {
    const initial = { name: 'test-pkg', dependencies: {} };
    const result = runAddDeps(initial, 'zod axios chalk');
    const keys = Object.keys(result.dependencies as Record<string, string>);

    expect(keys).toEqual([...keys].sort());
  });

  it('should sort existing devDependencies alphabetically', () => {
    const initial = {
      name: 'test-pkg',
      dependencies: {},
      devDependencies: { zod: '^3.0.0', axios: '^1.0.0', chalk: '^5.0.0' },
    };
    const result = runAddDeps(initial, 'vitest');
    const keys = Object.keys(result.devDependencies as Record<string, string>);

    expect(keys).toEqual([...keys].sort());
  });

  it('should exit gracefully when no deps are provided', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scaffoldfy-test-'));
    const pkgFile = path.join(tmpDir, 'package.json');
    try {
      const initial = { name: 'test-pkg' };
      fs.writeFileSync(pkgFile, JSON.stringify(initial, null, 2));

      expect(() =>
        execSync(
          `node "${path.join(SCRIPTS_DIR, 'add-dependencies.cjs')}" --file="${pkgFile}" --deps=""`,
          { encoding: 'utf8' },
        ),
      ).not.toThrow();

      /* File should be unchanged */
      expect(JSON.parse(fs.readFileSync(pkgFile, 'utf8'))).toMatchObject(initial);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

/* -------------------------------------------------------------------------- */
/*  Template rendering – key scenarios                                         */
/* -------------------------------------------------------------------------- */

describe('workspace-package-generator – package.json.hbs rendering', () => {
  const tplPath = path.join(TEMPLATES_DIR, 'package.json.hbs');

  /** Internal package (non-npm) */
  it('should render a valid JSON for an internal package', () => {
    const ctx = {
      packageBaseName: 'my-package',
      isNpmPackage: false,
      workspace: 'packages',
      repoDirectory: 'packages/my-package',
      relativeRootPath: '../../',
      author: 'Test Author',
      repoUrl: 'https://github.com/test/monorepo.git',
      orgName: 'myorg',
      isBundlerTsc: false,
      isBundlerTsdown: false,
      hasTsdownConfig: false,
      tsdownConfigPackage: '@pixpilot/tsdown-config',
    };

    const rendered = renderHbs(tplPath, ctx);
    const pkg = JSON.parse(rendered);

    expect(pkg.name).toBe('@internal/my-package');
    expect(pkg.private).toBe(true);
    expect(pkg.publishConfig).toBeUndefined();
    expect(pkg.files).toBeUndefined();
  });

  /** Public npm package with tsdown bundler */
  it('should render valid JSON for a public npm package (tsdown)', () => {
    const ctx = {
      packageBaseName: 'my-package',
      isNpmPackage: true,
      isPublicPackage: true,
      bundler: 'tsdown',
      isBundlerTsc: false,
      isBundlerTsdown: true,
      hasTsdownConfig: false,
      tsdownConfigPackage: '@pixpilot/tsdown-config',
      workspace: 'packages',
      repoDirectory: 'packages/my-package',
      relativeRootPath: '../../',
      author: 'Test Author',
      repoUrl: 'https://github.com/test/monorepo.git',
      orgName: 'myorg',
    };

    const rendered = renderHbs(tplPath, ctx);
    const pkg = JSON.parse(rendered);

    expect(pkg.name).toBe('@myorg/my-package');
    expect(pkg.private).toBeUndefined();
    expect(pkg.publishConfig?.access).toBe('public');
    expect(pkg.files).toContain('dist');
    expect(pkg.scripts?.build).toBe('tsdown');
    expect(pkg.devDependencies?.['@pixpilot/tsdown-config']).toBeDefined();
    expect(pkg.devDependencies?.tsdown).toBe('catalog:dev');
  });

  /** Private npm package with tsc bundler */
  it('should render valid JSON for a private npm package (tsc)', () => {
    const ctx = {
      packageBaseName: 'my-package',
      isNpmPackage: true,
      isPublicPackage: false,
      bundler: 'tsc',
      isBundlerTsc: true,
      isBundlerTsdown: false,
      hasTsdownConfig: false,
      tsdownConfigPackage: '@pixpilot/tsdown-config',
      workspace: 'packages',
      repoDirectory: 'packages/my-package',
      relativeRootPath: '../../',
      author: 'Test Author',
      repoUrl: 'https://github.com/test/monorepo.git',
      orgName: '',
    };

    const rendered = renderHbs(tplPath, ctx);
    const pkg = JSON.parse(rendered);

    expect(pkg.name).toBe('my-package');
    expect(pkg.publishConfig?.access).toBe('restricted');
    expect(pkg.scripts?.build).toContain('tsc');
    expect(pkg.scripts?.['build:watch']).toContain('tsc');
    expect(pkg.devDependencies?.tsdown).toBeUndefined();
  });

  /** npm package with internal tsdown config */
  it('should use @internal/tsdown-config when hasTsdownConfig is true', () => {
    const ctx = {
      packageBaseName: 'my-package',
      isNpmPackage: true,
      isPublicPackage: true,
      bundler: 'tsdown',
      isBundlerTsc: false,
      isBundlerTsdown: true,
      hasTsdownConfig: true,
      tsdownConfigPackage: '@internal/tsdown-config',
      workspace: 'packages',
      repoDirectory: 'packages/my-package',
      relativeRootPath: '../../',
      author: 'Test Author',
      repoUrl: '',
      orgName: 'myorg',
    };

    const rendered = renderHbs(tplPath, ctx);
    const pkg = JSON.parse(rendered);

    expect(pkg.devDependencies?.['@internal/tsdown-config']).toBe('workspace:*');
    expect(pkg.devDependencies?.['@pixpilot/tsdown-config']).toBeUndefined();
  });
});

describe('workspace-package-generator – tsdown.config.ts.hbs rendering', () => {
  const tplPath = path.join(TEMPLATES_DIR, 'tsdown.config.ts.hbs');

  it('should render without bundle size when bundleSizeLimit is falsy', () => {
    const ctx = {
      tsdownConfigPackage: '@pixpilot/tsdown-config',
      bundleSizeLimit: 0,
    };
    const rendered = renderHbs(tplPath, ctx);

    expect(rendered).toContain("import { defineConfig } from '@pixpilot/tsdown-config'");
    expect(rendered).not.toContain('MAX_BUNDLE_SIZE_KB');
    expect(rendered).toContain("entry: 'src/index.ts'");
  });

  it('should render bundle size limit when bundleSizeLimit is set', () => {
    const ctx = {
      tsdownConfigPackage: '@pixpilot/tsdown-config',
      bundleSizeLimit: 50,
    };
    const rendered = renderHbs(tplPath, ctx);

    expect(rendered).toContain('MAX_BUNDLE_SIZE_KB = 50');
    expect(rendered).toContain('bundleSize: MAX_BUNDLE_SIZE_KB * KB');
  });
});

describe('workspace-package-generator – src/index.ts.hbs rendering', () => {
  it('should render the package name into the exported constant', () => {
    const tplPath = path.join(TEMPLATES_DIR, 'src', 'index.ts.hbs');
    const rendered = renderHbs(tplPath, { packageBaseName: 'cool-lib' });

    expect(rendered).toContain("export const name = 'cool-lib'");
  });
});

describe('workspace-package-generator – test/index.test.ts.hbs rendering', () => {
  it('should render a valid vitest test file', () => {
    const tplPath = path.join(TEMPLATES_DIR, 'test', 'index.test.ts.hbs');
    const rendered = renderHbs(tplPath, {});

    expect(rendered).toContain("from 'vitest'");
    expect(rendered).toContain("from '../src'");
  });
});
