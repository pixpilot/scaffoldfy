import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { validateScaffoldfyJsonFile } from '@pixpilot/scaffoldfy';
import { describe, expect, it } from 'vitest';

const CONFIG_DIR = path.join(__dirname, '..', 'feature-package-generator');
const SCAFFOLDFY_DIR = path.join(
  __dirname,
  '..',
  'node_modules',
  '@pixpilot',
  'scaffoldfy',
);

// The Handlebars that scaffoldfy itself renders templates with.
const requireFromScaffoldfy = createRequire(path.join(SCAFFOLDFY_DIR, 'package.json'));
const Handlebars = requireFromScaffoldfy('handlebars') as typeof import('handlebars');

/** Render a template file with the given context. */
function renderHbs(templatePath: string, context: Record<string, unknown>): string {
  return Handlebars.compile(fs.readFileSync(templatePath, 'utf8'))(context);
}

/** Run add-package-dependencies.cjs on a temp package.json and return the result. */
function addDependencies(
  initialPkg: Record<string, unknown>,
  args: string[],
): Record<string, Record<string, string>> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'feature-package-'));
  const pkgFile = path.join(tmpDir, 'package.json');
  try {
    fs.writeFileSync(pkgFile, JSON.stringify(initialPkg));
    const script = path.join(CONFIG_DIR, 'scripts', 'add-package-dependencies.cjs');
    execSync(
      `node ${JSON.stringify(script)} --file=${JSON.stringify(pkgFile)} ${args.map((arg) => JSON.stringify(arg)).join(' ')}`,
    );
    return JSON.parse(fs.readFileSync(pkgFile, 'utf8')) as Record<
      string,
      Record<string, string>
    >;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

const context = {
  packageName: '@internal/sample-feature',
  featureName: 'sample-feature',
  featurePascal: 'SampleFeature',
  featureCamel: 'sampleFeature',
  featureConstant: 'SAMPLE_FEATURE',
  featureTitle: 'Sample Feature',
  featurePagePath: '/dashboard/sample-feature',
  relativeRootPath: '../../',
};

describe('feature-package-generator – schema', () => {
  it('has a valid scaffoldfy.json', () => {
    const result = validateScaffoldfyJsonFile(path.join(CONFIG_DIR, 'scaffoldfy.json'));
    expect(result.valid).toBe(true);
  });
});

describe('feature-package-generator – package.json', () => {
  const template = path.join(CONFIG_DIR, 'templates', 'package.json.hbs');

  it('renders valid JSON with the base entry points', () => {
    const pkg = JSON.parse(renderHbs(template, { ...context, extraEntryPoints: [] }));

    expect(pkg.name).toBe('@internal/sample-feature');
    expect(Object.keys(pkg.exports)).toEqual([
      './db',
      './services',
      './trpc',
      './types',
      './client',
      './ui',
    ]);
  });

  it('adds the entry points an extending config lists, before the browser-safe ones', () => {
    const pkg = JSON.parse(
      renderHbs(template, { ...context, extraEntryPoints: ['ai', 'jobs'] }),
    );

    expect(Object.keys(pkg.exports)).toEqual([
      './db',
      './services',
      './trpc',
      './ai',
      './jobs',
      './types',
      './client',
      './ui',
    ]);
    expect(pkg.exports['./ai']).toBe('./src/ai/index.ts');
  });
});

describe('feature-package-generator – add-package-dependencies', () => {
  it('adds dependencies with a catalog: default and keeps maps sorted', () => {
    const pkg = addDependencies(
      { dependencies: { zod: 'catalog:', '@internal/trpc': 'workspace:*' } },
      [
        '--dependencies=@internal/shared@workspace:* lodash',
        '--dev-dependencies=@electric-sql/pglite-pgvector',
      ],
    );

    expect(pkg['dependencies']).toEqual({
      '@internal/shared': 'workspace:*',
      '@internal/trpc': 'workspace:*',
      lodash: 'catalog:',
      zod: 'catalog:',
    });
    expect(Object.keys(pkg['dependencies']!)).toEqual([
      '@internal/shared',
      '@internal/trpc',
      'lodash',
      'zod',
    ]);
    expect(pkg['devDependencies']).toEqual({
      '@electric-sql/pglite-pgvector': 'catalog:',
    });
  });

  it('leaves the package unchanged when nothing is listed', () => {
    const initial = { dependencies: { a: '1.0.0' } };

    expect(addDependencies(initial, ['--dependencies=', '--dev-dependencies='])).toEqual(
      initial,
    );
  });
});
