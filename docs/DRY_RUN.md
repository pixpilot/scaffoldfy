# Dry-Run Mode with Diff Preview

Dry-run mode allows you to preview exactly what changes would be made to your project before actually applying them. This is invaluable for understanding template behavior and avoiding unwanted changes.

## Overview

With dry-run mode, you can:

- **Preview all changes** before they're applied
- **See diffs** for file modifications
- **Identify skipped tasks** due to unmet conditions
- **Validate your template** without modifying files

## Basic Usage

### CLI

```bash
# Preview changes without applying them
scaffoldfy --tasks-file ./template-tasks.json --dry-run

# Preview with inherited templates
scaffoldfy --tasks-file ./my-template.json --dry-run
```

### Programmatic

```typescript
import { runWithTasks } from '@pixpilot/scaffoldfy';

const tasks = [
  {
    id: 'update-package',
    name: 'Update package.json',
    description: 'Update package information',
    required: true,
    enabled: true,
    type: 'update-json',
    config: {
      file: 'package.json',
      updates: {
        name: 'my-new-project',
        author: 'John Doe',
      },
    },
  },
];

// Run in dry-run mode
await runWithTasks(tasks, { dryRun: true });
```

## Output Format

Dry-run mode provides color-coded output showing what would change:

```
═══════════════════════════════════════════════════════
  DRY RUN - Preview of changes
═══════════════════════════════════════════════════════

▶ Task: Update package.json
  Update package information

File: package.json
-   "name": "template-name",
+   "name": "my-new-project",
-   "author": "",
+   "author": "John Doe",

───────────────────────────────────────────────────────

▶ Task: Clean up README
  Remove template instructions

File: README.md
+ New file would be created
Content preview:
# my-new-project

Your project description here.

───────────────────────────────────────────────────────

═══════════════════════════════════════════════════════
  No changes were applied (dry-run mode)
═══════════════════════════════════════════════════════
```

## Diff Types by Task Type

### `update-json`

Shows JSON property changes:

```
File: package.json
-   "version": "0.0.0",
+   "version": "1.0.0",
-   "description": "Template",
+   "description": "My awesome project",
```

### `template`

Shows full file creation or modification:

```
File: .github/workflows/ci.yml
+ New file would be created
Content preview:
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
...
```

### `regex-replace`

Shows pattern-based replacements:

```
File: README.md
- <!-- TEMPLATE_INSTRUCTIONS -->
- This is a template...
- <!-- /TEMPLATE_INSTRUCTIONS -->
+ # My Project
```

### `replace-in-file`

Shows literal string replacements:

```
File: config.json
-   "templateName": "my-template",
+   "templateName": "my-project",
```

### `delete`

Lists files/directories that would be deleted:

```
Would delete:
  - TEMPLATE_README.md
  - .github/TEMPLATE_SETUP.md
  - docs/template-guide.md
```

### `rename`

Shows file/directory renames:

```
Would rename: template.config.js → project.config.js
```

### `git-init`

Shows git initialization steps:

```
Would remove existing .git directory
Would initialize git repository
Would create initial commit: "🎉 Initial commit"
```

### `exec`

Shows commands that would be executed:

```
Would execute:
  Command: npm install
  Working directory: /path/to/project
```

## Conditional Tasks

Tasks with unmet conditions are clearly marked:

```
▶ Task: Setup TypeScript
  Configure TypeScript for the project

⊘ Condition not met - task would be skipped
```

## Working with Generated Diffs

### Programmatic Diff Access

You can generate diffs programmatically for custom workflows:

```typescript
import { displayTasksDiff, getTaskDiff } from '@pixpilot/scaffoldfy';

// Get diff for a single task
const task = {
  id: 'update-pkg',
  name: 'Update package.json',
  description: 'Update package',
  required: true,
  enabled: true,
  type: 'update-json',
  config: {
    file: 'package.json',
    updates: { name: 'new-name' },
  },
};

const config = {
  repoName: 'new-name',
  repoOwner: 'owner',
  repoUrl: 'https://github.com/owner/new-name',
  author: 'Author Name',
  baseRepoUrl: 'https://github.com/owner/new-name',
  orgName: 'org',
};

const diff = await getTaskDiff(task, config);
console.log(diff);

// Or display all task diffs
await displayTasksDiff([task], config);
```

### Individual Diff Functions

For specific task types:

```typescript
import {
  getDeleteDiff,
  getExecDiff,
  getGitInitDiff,
  getRegexReplaceDiff,
  getRenameDiff,
  getReplaceInFileDiff,
  getTemplateDiff,
  getUpdateJsonDiff,
} from '@pixpilot/scaffoldfy';

// Get diff for specific task type
const diff = await getUpdateJsonDiff(
  {
    file: 'package.json',
    updates: { name: 'new-name' },
  },
  config,
);
```

## Plugin Support

Plugins can implement custom diff generation:

```typescript
import { createPlugin, registerPlugin } from '@pixpilot/scaffoldfy';

const myPlugin = createPlugin(
  'my-plugin',
  'custom-task',
  async (task, config, options) => {
    if (!options.dryRun) {
      // Execute task
    }
  },
  {
    getDiff: async (task, config) =>
      // Return custom diff string
      '→ Would perform custom operation',
  },
);

registerPlugin(myPlugin);
```

## Best Practices

1. **Always dry-run first** before applying templates to new projects
2. **Review each diff carefully** especially for file deletions
3. **Test templates with dry-run** during development
4. **Use dry-run in CI/CD** to validate template changes
5. **Document expected diffs** for your templates
6. **Combine with version control** to easily revert changes if needed

## CI/CD Integration

Use dry-run mode in continuous integration:

```yaml
# .github/workflows/test-template.yml
name: Test Template

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - name: Test template dry-run
        run: npx scaffoldfy --tasks-file ./template-tasks.json --dry-run
```

## Comparing Before/After

You can use dry-run with version control to see exactly what changed:

```bash
# Initialize git if not already
git init
git add .
git commit -m "Before template"

# Run dry-run to preview
scaffoldfy --tasks-file ./template.json --dry-run

# If satisfied, apply for real
scaffoldfy --tasks-file ./template.json

# See what actually changed
git diff
```

## Troubleshooting

### No diff shown but expecting changes?

- Check that task conditions are met
- Verify file paths are correct
- Ensure interpolation variables are set
- Check if task is enabled

### Diff looks wrong?

- Verify your config values
- Check template syntax
- Test interpolation patterns
- Review task order and dependencies

### Missing color output?

Color output may be disabled in some terminals. The diff structure is still readable in plain text.

## API Reference

### `displayTasksDiff(tasks, config): Promise<void>`

Display diffs for all tasks with formatted output.

### `getTaskDiff(task, config): Promise<string>`

Get diff string for a single task.

### Task-specific diff functions

- `getUpdateJsonDiff(config, initConfig): Promise<string>`
- `getTemplateDiff(config, initConfig): Promise<string>`
- `getRegexReplaceDiff(config, initConfig): Promise<string>`
- `getReplaceInFileDiff(config, initConfig): Promise<string>`
- `getDeleteDiff(config, initConfig): string`
- `getRenameDiff(config, initConfig): string`
- `getGitInitDiff(config): string`
- `getExecDiff(config, initConfig): string`

All functions return formatted diff strings with color codes for terminal output.
