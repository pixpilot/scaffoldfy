# Usage Examples

This document shows various ways to use `@pixpilot/template-init`.

## CLI Usage

### Interactive Mode

The simplest way to use the tool - it will prompt you for configuration:

```sh
template-init
```

### With JSON Tasks File

Define your tasks in a JSON file and pass it to the CLI:

```sh
template-init --tasks-file ./tasks.json
```

**Note:** By default, the tasks file will be removed after successful initialization. Use `--keep-tasks-file` to preserve it:

```sh
template-init --tasks-file ./tasks.json --keep-tasks-file
```

### With TypeScript Tasks File

You can also use TypeScript files for tasks:

```sh
template-init --tasks-ts ./tasks.ts
```

### Dry Run Mode

Preview what changes would be made without actually applying them:

```sh
template-init --tasks-file ./tasks.json --dry-run
```

### Force Re-initialization

Re-run initialization even if it was already completed:

```sh
template-init --force
```

## Programmatic Usage

### Using TypeScript Tasks

```typescript
import { runWithTasks } from '@pixpilot/template-init';
import { tasks } from './my-tasks';

// Run with default options (interactive)
await runWithTasks(tasks);

// Run with dry-run enabled
await runWithTasks(tasks, { dryRun: true });

// Force re-initialization
await runWithTasks(tasks, { force: true });

// Keep tasks file after initialization
await runWithTasks(tasks, {
  keepTasksFile: true,
  tasksFilePath: './my-tasks.json',
});
```

### Loading Tasks from JSON

```typescript
import fs from 'node:fs';
import { runWithTasks } from '@pixpilot/template-init';

const tasksFilePath = './tasks.json';
const tasksJson = JSON.parse(fs.readFileSync(tasksFilePath, 'utf-8'));

// By default, tasks file will be removed after successful init
await runWithTasks(tasksJson.tasks);

// Or keep the tasks file
await runWithTasks(tasksJson.tasks, {
  keepTasksFile: true,
  tasksFilePath,
});
```

### Custom Task Example

```typescript
import type {TaskDefinition} from '@pixpilot/template-init';
import { runWithTasks  } from '@pixpilot/template-init';

const customTasks: TaskDefinition[] = [
  {
    id: 'setup-project',
    name: 'Setup Project',
    description: 'Initialize project with custom settings',
    required: true,
    enabled: true,
    type: 'update-json',
    config: {
      file: 'package.json',
      updates: {
        name: '{{repoName}}',
        author: '{{author}}',
        version: '0.1.0',
      },
    },
  },
  {
    id: 'create-readme',
    name: 'Create README',
    description: 'Generate project README',
    required: true,
    enabled: true,
    type: 'template',
    config: {
      file: 'README.md',
      template: `# {{repoName}}

Created by {{author}}

## Installation

\`\`\`sh
npm install
\`\`\`
`,
    },
  },
];

await runWithTasks(customTasks);
```

## JSON Tasks Format

### Basic Structure

```json
{
  "$schema": "node_modules/@pixpilot/template-init/src/tasks.schema.json",
  "tasks": [
    {
      "id": "unique-id",
      "name": "Task Name",
      "description": "What this task does",
      "required": true,
      "enabled": true,
      "type": "update-json",
      "config": {
        "file": "package.json",
        "updates": {
          "name": "{{repoName}}"
        }
      }
    }
  ]
}
```

### With Dependencies

Tasks can depend on other tasks:

```json
{
  "tasks": [
    {
      "id": "update-config",
      "name": "Update Config",
      "description": "Update configuration files",
      "required": true,
      "enabled": true,
      "type": "update-json",
      "config": {
        "file": "config.json",
        "updates": { "version": "1.0.0" }
      }
    },
    {
      "id": "install-deps",
      "name": "Install Dependencies",
      "description": "Install after config update",
      "required": false,
      "enabled": true,
      "dependencies": ["update-config"],
      "type": "exec",
      "config": {
        "command": "npm install"
      }
    }
  ]
}
```

### Conditional Tasks

Use conditions to control task execution:

```json
{
  "id": "remove-examples",
  "name": "Remove Examples",
  "description": "Delete example files if not needed",
  "required": false,
  "enabled": true,
  "type": "conditional-delete",
  "config": {
    "condition": "!keepExamplePackages",
    "paths": ["examples", "samples"]
  }
}
```

## IDE Integration

### VSCode

Add the schema reference to get autocomplete and validation:

```json
{
  "$schema": "./node_modules/@pixpilot/template-init/src/tasks.schema.json",
  "tasks": []
}
```

### WebStorm / IntelliJ

The JSON schema will be automatically detected if the `$schema` property is set.

## Template Variables

Available variables for interpolation:

- `{{repoName}}` - Repository name
- `{{repoOwner}}` - Repository owner/organization
- `{{repoUrl}}` - Full repository URL
- `{{author}}` - Author name
- `{{baseRepoUrl}}` - Base repository URL (without .git)
- `{{defaultBundler}}` - Default bundler (tsc/tsdown)
- `{{orgName}}` - Organization name with @ prefix

Example usage:

```json
{
  "type": "template",
  "config": {
    "file": "README.md",
    "template": "# {{repoName}}\n\nBy {{author}}\n\nRepo: {{baseRepoUrl}}"
  }
}
```

## Best Practices

1. **Always use dry-run first** - Test with `--dry-run` before applying changes
2. **Keep tasks atomic** - Each task should do one thing well
3. **Use dependencies wisely** - Chain tasks that must run in order
4. **Mark critical tasks as required** - Only essential tasks should stop on failure
5. **Document your tasks** - Write clear descriptions for maintainability
6. **Version your task files** - Keep task definitions in version control
7. **Test with different inputs** - Try various configuration values
8. **Use the schema** - Add `$schema` to JSON files for IDE support

## Troubleshooting

### "No tasks defined" error

Make sure you're either:

- Passing `--tasks-file` with a valid JSON file
- Calling `runWithTasks()` with a tasks array

### "Circular dependency detected" error

Review your task dependencies - one or more tasks have circular references.

### "Task not found" error

A task lists a dependency that doesn't exist. Check the dependency IDs.

### Template variables not replaced

Ensure you're using the correct syntax: `{{variableName}}` and that the variable exists in InitConfig.

## More Examples

See:

- `example-tasks.json` - Complete JSON example
- `example-tasks.ts` - TypeScript definition example
- Tests in `test/index.test.ts` - Various usage patterns
