# @pixpilot/template-init

A flexible and powerful template initialization utility for automating project setup, cleanup, and configuration tasks.

## Features

- 🔄 **9 Task Types** - update-json, template, regex-replace, replace-in-file, delete, conditional-delete, rename, git-init, exec
- 📦 **JSON Configuration** - Define tasks in JSON files for easy sharing and version control
- 🔗 **Task Dependencies** - Ensure tasks run in the correct order
- 🌳 **Dry Run Mode** - Preview changes before applying them
- ✅ **Type-Safe** - Full TypeScript support with JSON schema validation
- 🎯 **Template Variables** - Use `{{variable}}` syntax for dynamic configuration
- ⚡ **CLI & Programmatic** - Use as a command-line tool or import as a library

## Installation

```sh
pnpm add @pixpilot/template-init
```

## Usage

### CLI

```sh
# Interactive mode
template-init

# With custom tasks from JSON file
template-init --tasks-file ./tasks.json

# With custom tasks from TypeScript file
template-init --tasks-ts ./tasks.ts

# Dry run to preview changes
template-init --tasks-file ./tasks.json --dry-run

# Force re-initialization
template-init --force

# Keep tasks file after initialization (default is to remove it)
template-init --tasks-file ./tasks.json --keep-tasks-file
```

#### CLI Options

- `--tasks-file <path>` - Path to JSON file containing task definitions (default: `./template-tasks.json`)
- `--tasks-ts <path>` - Path to TypeScript file exporting tasks (default: `./template-tasks.ts`)
- `--dry-run` - Show what would be done without making changes
- `--force` - Force re-initialization even if already initialized
- `--keep-tasks-file` - Keep the tasks file after successful initialization (default: remove)
- `-h, --help` - Show help message
- `-v, --version` - Show version information

**Note:** By default, the tasks file (JSON or TypeScript) will be automatically removed after successful initialization. Use `--keep-tasks-file` to preserve it.

### Programmatic Usage

```typescript
import { runWithTasks } from '@pixpilot/template-init';

const tasks = [
  {
    id: 'update-package',
    name: 'Update package.json',
    description: 'Update repository information',
    required: true,
    enabled: true,
    type: 'update-json',
    config: {
      file: 'package.json',
      updates: {
        name: '{{repoName}}',
        author: '{{author}}',
      },
    },
  },
];

// Basic usage
await runWithTasks(tasks);

// With options
await runWithTasks(tasks, {
  dryRun: false,
  force: false,
  keepTasksFile: true,
  tasksFilePath: './my-tasks.json',
});
```

## Task Types

### update-json

Update JSON files with new values. Supports nested properties using dot notation.

```json
{
  "type": "update-json",
  "config": {
    "file": "package.json",
    "updates": {
      "name": "{{repoName}}",
      "scripts.test": "vitest",
      "repository.url": "{{repoUrl}}"
    }
  }
}
```

### template

Create or overwrite files from templates with variable interpolation.

```json
{
  "type": "template",
  "config": {
    "file": "README.md",
    "template": "# {{repoName}}\n\nAuthor: {{author}}"
  }
}
```

### regex-replace

Replace text using regular expressions.

```json
{
  "type": "regex-replace",
  "config": {
    "file": ".github/workflows/ci.yml",
    "pattern": "old-repo-name",
    "replacement": "{{repoName}}",
    "flags": "g"
  }
}
```

### replace-in-file

Simple find and replace in files.

```json
{
  "type": "replace-in-file",
  "config": {
    "file": "CONTRIBUTING.md",
    "replacements": [
      { "find": "template-name", "replace": "{{repoName}}" },
      { "find": "template-author", "replace": "{{author}}" }
    ]
  }
}
```

### delete

Delete files or directories.

```json
{
  "type": "delete",
  "config": {
    "paths": ["coverage", "dist", "temp"]
  }
}
```

### conditional-delete

Delete based on condition evaluation.

```json
{
  "type": "conditional-delete",
  "config": {
    "condition": "!keepExamplePackages",
    "paths": ["packages/example"]
  }
}
```

### rename

Rename or move files/directories.

```json
{
  "type": "rename",
  "config": {
    "from": "template.config.js",
    "to": "{{repoName}}.config.js"
  }
}
```

### git-init

Initialize a new git repository.

```json
{
  "type": "git-init",
  "config": {
    "removeExisting": true,
    "initialCommit": true,
    "message": "Initial commit"
  }
}
```

### exec

Execute shell commands.

```json
{
  "type": "exec",
  "config": {
    "command": "pnpm install",
    "cwd": "./"
  }
}
```

## Task Structure

```json
{
  "tasks": [
    {
      "id": "unique-task-id",
      "name": "Human-readable task name",
      "description": "Detailed description of what this task does",
      "required": true,
      "enabled": true,
      "type": "update-json",
      "dependencies": ["other-task-id"],
      "config": {
        "file": "package.json",
        "updates": { "name": "{{repoName}}" }
      }
    }
  ]
}
```

### Task Properties

- **id** (string, required) - Unique identifier for the task
- **name** (string, required) - Human-readable task name
- **description** (string, required) - Detailed description
- **required** (boolean, required) - Whether failure should stop the process
- **enabled** (boolean, required) - Whether this task should be executed
- **type** (string, required) - Task type (see Task Types section)
- **dependencies** (string[], optional) - IDs of tasks that must run before this one
- **config** (object, required) - Task-specific configuration

## Template Variables

Use `{{variable}}` syntax in templates, file contents, and configurations. Available variables:

- `{{repoName}}` - Repository name
- `{{repoOwner}}` - Repository owner
- `{{repoUrl}}` - Full repository URL
- `{{author}}` - Author name
- `{{baseRepoUrl}}` - Base repository URL (for package links)
- `{{defaultBundler}}` - Default bundler (tsc/tsdown)
- `{{orgName}}` - Organization name (e.g., @myorg)

## Condition Expressions

For conditional tasks, use JavaScript expressions with available variables:

```javascript
// Simple boolean
'keepExamplePackages';

// Negation
'!keepExamplePackages';

// Comparison
"defaultBundler === 'tsc'";

// Complex conditions
"!keepExamplePackages && defaultBundler === 'tsc'";
```

## Task Dependencies

Tasks can depend on other tasks using the `dependencies` array:

```json
{
  "tasks": [
    {
      "id": "install-deps",
      "type": "exec",
      "config": { "command": "pnpm install" }
    },
    {
      "id": "build",
      "dependencies": ["install-deps"],
      "type": "exec",
      "config": { "command": "pnpm build" }
    }
  ]
}
```

The system automatically resolves dependencies and ensures correct execution order.

## Example: Full Configuration

```json
{
  "tasks": [
    {
      "id": "update-package",
      "name": "Update package.json",
      "description": "Update repository information",
      "required": true,
      "enabled": true,
      "type": "update-json",
      "config": {
        "file": "package.json",
        "updates": {
          "name": "{{repoName}}",
          "author": "{{author}}",
          "repository.url": "{{repoUrl}}"
        }
      }
    },
    {
      "id": "create-readme",
      "name": "Create README",
      "description": "Generate README from template",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": {
        "file": "README.md",
        "template": "# {{repoName}}\n\nAuthor: {{author}}\n\nRepository: {{baseRepoUrl}}"
      }
    },
    {
      "id": "remove-examples",
      "name": "Remove example packages",
      "description": "Clean up example packages if not needed",
      "required": false,
      "enabled": true,
      "type": "conditional-delete",
      "config": {
        "condition": "!keepExamplePackages",
        "paths": ["packages/example"]
      }
    },
    {
      "id": "install-deps",
      "name": "Install dependencies",
      "description": "Reinstall dependencies after changes",
      "required": false,
      "enabled": true,
      "dependencies": ["update-package", "remove-examples"],
      "type": "exec",
      "config": {
        "command": "pnpm install"
      }
    }
  ]
}
```

## Best Practices

1. **Use descriptive task IDs** - Make them clear and kebab-case
2. **Mark critical tasks as required** - Only mark tasks as required if failure should stop initialization
3. **Leverage dependencies** - Ensure tasks run in the correct order
4. **Test with dry-run** - Always preview changes before applying
5. **Keep conditions simple** - Use clear, readable condition expressions
6. **Document your tasks** - Write clear descriptions for each task

## JSON Schema

The package includes a JSON schema for task validation. Use it in your IDE for autocomplete and validation:

```json
{
  "$schema": "node_modules/@pixpilot/template-init/src/tasks.schema.json",
  "tasks": []
}
```

## License

MIT
