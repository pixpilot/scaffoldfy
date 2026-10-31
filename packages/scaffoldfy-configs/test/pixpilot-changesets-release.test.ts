import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const CONFIG_DIR = path.join(__dirname, '..', 'pixpilot-changesets-release');
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

function render(template: string, releaseToGitHubPackages: boolean): string {
  const content = fs.readFileSync(path.join(CONFIG_DIR, template), 'utf-8');
  return Handlebars.compile(content)({ releaseToGitHubPackages });
}

/** Secret names release.yml passes to the reusable CI workflow. */
function passedCiSecrets(release: string): string[] {
  const body = /\n {2}ci:\n(?<body>[\s\S]*?)\n {2}\w/u.exec(release)?.groups?.body ?? '';
  return [...body.matchAll(/^ {6}(?<name>\w+): \$\{\{/gmu)].map(
    (match) => match.groups!.name!,
  );
}

/** Secret names ci.yml declares under on.workflow_call.secrets. */
function workflowCallSecrets(ci: string): string[] {
  const body =
    /\n {2}workflow_call:\n(?<body>[\s\S]*?)\n\n/u.exec(ci)?.groups?.body ?? '';
  return [...body.matchAll(/^ {6}(?<name>\w+):$/gmu)].map((match) => match.groups!.name!);
}

describe('pixpilot-changesets-release templates', () => {
  it.each([true, false])(
    'should declare in ci.yml every secret release.yml passes to CI (GitHub Packages: %s)',
    (releaseToGitHubPackages) => {
      const passed = passedCiSecrets(render('release.yml.hbs', releaseToGitHubPackages));

      expect(passed).toEqual(
        releaseToGitHubPackages ? ['PIXPILOT_PRIVATE_REGISTRY_TOKEN'] : [],
      );
      expect(workflowCallSecrets(render('ci.yml.hbs', releaseToGitHubPackages))).toEqual(
        passed,
      );
    },
  );

  it('should keep GitHub expressions literal when publishing to GitHub Packages', () => {
    const ci = render('ci.yml.hbs', true);
    const release = render('release.yml.hbs', true);

    expect(ci).toMatch(
      /\n {10}NODE_AUTH_TOKEN: \$\{\{ secrets\.PIXPILOT_PRIVATE_REGISTRY_TOKEN \}\}\n/u,
    );
    expect(ci).toContain("scope: '@pixpilot-private'");
    expect(release).toMatch(
      /\n {10}REGISTRY_TOKEN: \$\{\{ secrets\.PIXPILOT_PRIVATE_REGISTRY_TOKEN \}\}\n/u,
    );
    expect(release).toContain("registry-url: 'https://npm.pkg.github.com'");
    expect(release).toContain("provenance: 'false'");
    expect(release).toContain('      packages: write\n');
  });

  it('should leave the registry token out when publishing to npmjs', () => {
    const ci = render('ci.yml.hbs', false);
    const release = render('release.yml.hbs', false);

    expect(ci).not.toContain('PIXPILOT_PRIVATE_REGISTRY_TOKEN');
    expect(ci).toContain(
      '        uses: pixpilot/github-actions/setup-pnpm-project@v1\n\n      - name: Lint\n',
    );
    expect(release).not.toContain('PIXPILOT_PRIVATE_REGISTRY_TOKEN');
    expect(release).not.toContain('packages: write');
    expect(release).toContain("registry-url: 'https://registry.npmjs.org'");
    expect(release).toContain("provenance: 'true'");
    expect(release).toMatch(
      /\n {10}message: \$\{\{ needs\.release\.outputs\.release-summary \}\}\n/u,
    );
  });
});
