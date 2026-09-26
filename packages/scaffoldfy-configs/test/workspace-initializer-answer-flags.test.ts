import path from 'node:path';
import {
  loadTasksWithInheritance,
  parseAnswerFlags,
  resolveAnswerFlags,
} from '@pixpilot/scaffoldfy';
import { describe, expect, it } from 'vitest';

const configPath = path.join(__dirname, '..', 'workspace-initializer', 'scaffoldfy.json');

describe('workspace-initializer answer flags', () => {
  it('should answer its own and extended prompts with flags', async () => {
    const { configs = [] } = await loadTasksWithInheritance(configPath, {
      sequential: true,
    });
    const prompts = configs.flatMap((config) => config.prompts ?? []);

    const answers = resolveAnswerFlags(
      parseAnswerFlags([
        // workspace-initializer/scaffoldfy.json
        '--keepExamplePackages',
        '--no-create-first-package-prompt',
        // extends ../pixpilot-changesets-release/scaffoldfy.json
        '--release-to-github-packages=false',
        // extends ../license-file/scaffoldfy.json
        '--license-type',
        'MIT',
        // extends ../security-policy/scaffoldfy.json
        '--no-add-security-file',
        // extends ../project-info/scaffoldfy.json, which extends ./project-name-info.json
        '--project-name',
        'my-app',
      ]),
      prompts,
    );

    expect(answers).toEqual({
      keepExamplePackages: 'true',
      createFirstPackagePrompt: 'false',
      releaseToGitHubPackages: 'false',
      licenseType: 'MIT',
      addSecurityFile: 'false',
      projectName: 'my-app',
    });
  });
});
