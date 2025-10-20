# Getting Started

This guide will help you get started with **@pixpilot/scaffoldfy** (formerly scaffoldfy) - a flexible and powerful template initialization utility for automating project setup, cleanup, and configuration tasks.

## Installation

Install the package using pnpm (or your preferred package manager):

```sh
pnpm add @pixpilot/scaffoldfy
```

Or install globally:

```sh
pnpm add -g @pixpilot/scaffoldfy
```

## Quick Start

### Interactive Mode

The simplest way to use the tool - it will prompt you for configuration:

```sh
scaffoldfy
```

### With JSON Tasks File

Define your tasks in a JSON file and pass it to the CLI:

```sh
scaffoldfy --tasks-file ./tasks.json
```

**Note:** By default, the tasks file will be removed after successful initialization. Use `--keep-tasks-file` to preserve it:

```sh
scaffoldfy --tasks-file ./tasks.json --keep-tasks-file
```

### With TypeScript Tasks File

You can also use TypeScript files for tasks:

```sh
scaffoldfy --tasks-ts ./tasks.ts
```

### Dry Run Mode

Preview what changes would be made without actually applying them:

```sh
scaffoldfy --tasks-file ./tasks.json --dry-run
```

Learn more: [Dry Run Mode Documentation](DRY_RUN.md)

### Force Re-initialization

Re-run initialization even if it was already completed:

```sh
scaffoldfy --force
```

## CLI Options

| Option                | Description                                                   |
| --------------------- | ------------------------------------------------------------- |
| `--tasks-file <path>` | Path to JSON task file (default: `./template-tasks.json`)     |
| `--tasks-ts <path>`   | Path to TypeScript task file (default: `./template-tasks.ts`) |
| `--dry-run`           | Preview changes without applying them                         |
| `--force`             | Force re-initialization                                       |
| `--keep-tasks-file`   | Keep task file after completion (default: remove)             |
| `-h, --help`          | Show help message                                             |
| `-v, --version`       | Show version                                                  |

## Programmatic Usage

### Using TypeScript Tasks

```typescript
import { runWithTasks } from '@pixpilot/scaffoldfy';
import { tasks } from './my-tasks';

// Run with default options (interactive)
await runWithTasks(tasks);

// Run with dry-run enabled
await runWithTasks(tasks, { dryRun: true });

// Force re-initialization
await runWithTasks(tasks, { force: true });

// Keep tasks file after initialization
await runWithTasks(tasks, {

  tasksFilePath: './my-tasks.json',
});
```

### Loading Tasks from JSON

```typescript
import fs from 'node:fs';
import { runWithTasks } from '@pixpilot/scaffoldfy';

const tasksFilePath = './tasks.json';
const tasksJson = JSON.parse(fs.readFileSync(tasksFilePath, 'utf-8'));

// By default, tasks file will be removed after successful init
await runWithTasks(tasksJson.tasks);

// Or keep the tasks file
await runWithTasks(tasksJson.tasks, {

  tasksFilePath,
});
```

### Custom Task Example

```typescript
import type { TaskDefinition } from '@pixpilot/scaffoldfy';
import { runWithTasks } from '@pixpilot/scaffoldfy';

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
        name: '{{projectName}}',
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
      template: `# {{projectName}}

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
  "$schema": "node_modules/@pixpilot/scaffoldfy/schema/tasks.schema.json",
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
          "name": "{{projectName}}"
        }
      }
    }
  ]
}
```

### With Interactive Prompts

Add user prompts to collect custom input:

```json
{
  "tasks": [
    {
      "id": "setup",
      "name": "Project Setup",
      "description": "Configure project settings",
      "required": true,
      "enabled": true,
      "type": "update-json",
      "prompts": [
        {
          "id": "projectName",
          "type": "input",
          "message": "What is your project name?",
          "required": true,
          "global": true
        },
        {
          "id": "useTypeScript",
          "type": "confirm",
          "message": "Use TypeScript?",
          "default": true
        }
      ],
      "config": {
        "file": "package.json",
        "updates": {
          "name": "{{projectName}}"
        }
      }
    }
  ]
}
```

Learn more: [Interactive Prompts Guide](PROMPTS.md)

### With Dependencies

Tasks can depend on other tasks to ensure correct execution order:

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

Use conditions to control task execution based on user input or configuration:

```json
{
  "id": "remove-examples",
  "name": "Remove Examples",
  "description": "Delete example files if not needed",
  "required": false,
  "enabled": true,
  "type": "delete",
  "config": {
    "condition": "removeExamples === true",
    "paths": ["examples", "samples"]
  }
}
```

Learn more: [Advanced Features Guide](FEATURES.md)

## IDE Integration

### VSCode

Add the schema reference to get autocomplete and validation in your JSON task files:

```json
{
  "$schema": "./node_modules/@pixpilot/scaffoldfy/schema/tasks.schema.json",
  "tasks": []
}
```

### WebStorm / IntelliJ IDEA

The JSON schema will be automatically detected if the `$schema` property is set in your JSON file.

## Template Variables

Built-in variables available for interpolation in any task config:

- `{{projectName}}` - Repository name
- `{{owner}}` - Repository owner/organization
- `{{repoUrl}}` - Full repository URL
- `{{author}}` - Author name
- `{{repoUrl}}` - Base repository URL (without .git)
- `{{orgName}}` - Organization name with @ prefix

You can also use any custom variables defined through prompts:

```json
{
  "prompts": [
    {
      "id": "port",
      "type": "number",
      "message": "Server port?",
      "default": 3000
    }
  ],
  "config": {
    "file": "config.json",
    "updates": {
      "port": "{{port}}",
      "author": "{{author}}"
    }
  }
}
```

## Real-World Example

Here's a complete example that sets up a Node.js project:

```json
{
  "$schema": "./node_modules/@pixpilot/scaffoldfy/schema/tasks.schema.json",
  "tasks": [
    {
      "id": "project-info",
      "name": "Project Information",
      "description": "Collect project details",
      "required": true,
      "enabled": true,
      "type": "update-json",
      "prompts": [
        {
          "id": "projectName",
          "type": "input",
          "message": "Project name?",
          "required": true,
          "global": true
        },
        {
          "id": "description",
          "type": "input",
          "message": "Project description?",
          "global": true
        },
        {
          "id": "license",
          "type": "select",
          "message": "Choose a license:",
          "choices": ["MIT", "Apache-2.0", "GPL-3.0", "BSD-3-Clause"],
          "default": "MIT",
          "global": true
        }
      ],
      "config": {
        "file": "package.json",
        "updates": {
          "name": "{{projectName}}",
          "description": "{{description}}",
          "license": "{{license}}",
          "author": "{{author}}"
        }
      }
    },
    {
      "id": "create-readme",
      "name": "Create README",
      "description": "Generate project README file",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": {
        "file": "README.md",
        "template": "# {{projectName}}\n\n{{description}}\n\n## License\n\n{{license}}"
      }
    },
    {
      "id": "git-init",
      "name": "Initialize Git",
      "description": "Set up git repository",
      "required": false,
      "enabled": true,
      "dependencies": ["create-readme"],
      "type": "git-init",
      "config": {}
    }
  ]
}
```

## Best Practices

1. **Always use dry-run first** - Test with `--dry-run` before applying changes to see exactly what will happen
2. **Keep tasks atomic** - Each task should do one thing well and have a clear purpose
3. **Use dependencies wisely** - Chain tasks that must run in a specific order
4. **Mark critical tasks as required** - Only essential tasks should have `required: true` to stop execution on failure
5. **Document your tasks** - Write clear names and descriptions for maintainability
6. **Version your task files** - Keep task definitions in version control alongside your project
7. **Use global prompts** - Mark prompts with `"global": true` for values needed across multiple tasks
8. **Leverage the schema** - Add `$schema` to JSON files for IDE autocomplete and validation
9. **Test with different inputs** - Try various configuration values to ensure robustness
10. **Preview changes** - Use dry-run mode to verify behavior before execution

## Troubleshooting

### "No tasks defined" error

Make sure you're either:

- Passing `--tasks-file` with a valid JSON file path
- Calling `runWithTasks()` with a non-empty tasks array

### "Circular dependency detected" error

Review your task dependencies - one or more tasks have circular references. Check the `dependencies` arrays in your tasks to ensure they form a directed acyclic graph (DAG).

### "Task not found" error

A task lists a dependency that doesn't exist. Verify that all task IDs in `dependencies` arrays match existing task IDs exactly.

### Template variables not replaced

Ensure you're using the correct syntax: `{{variableName}}` and that the variable:

- Is a built-in variable (like `projectName`, `author`, etc.)
- Or is defined in a prompt with the matching `id`
- Or is marked as `global: true` if used in a different task

### File not found errors

Check that:

- File paths are relative to the project root (where you run the command)
- Template files exist at the specified `templateFile` path
- Directories exist for files you're trying to update

## Next Steps

Now that you're familiar with the basics, explore these topics:

- **[Task Types Reference](TASK_TYPES.md)** - Learn about all 9 built-in task types
- **[Interactive Prompts](PROMPTS.md)** - Master user input collection
- **[Advanced Features](FEATURES.md)** - Conditional execution, global prompts, and Handlebars
- **[Template Inheritance](TEMPLATE_INHERITANCE.md)** - Compose and extend templates
- **[Plugin System](PLUGINS.md)** - Create custom task types
- **[Dry Run Mode](DRY_RUN.md)** - Preview changes with detailed diffs

## Need Help?

- 📚 Browse the [full documentation](README.md)
- 🐛 [Report issues](https://github.com/pixpilot/scaffoldfy/issues)
- 💬 Ask questions in [discussions](https://github.com/pixpilot/scaffoldfy/discussions)
