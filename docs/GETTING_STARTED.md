---
layout: default
title: Getting Started - Scaffoldfy
---

# Getting Started with scaffoldfy

This guide will help you get started with **@pixpilot/scaffoldfy** (formerly scaffoldfy) - a flexible and powerful task automation utility for project setup, cleanup, and configuration tasks.

## Installation

Install the package using pnpm (or your preferred package manager):

```sh
pnpm add @pixpilot/scaffoldfy
```

Or install globally:

```sh
pnpm add -g @pixpilot/scaffoldfy
```

## Using without Installation

You can also run scaffoldfy without installing it using npx:

```sh
npx @pixpilot/scaffoldfy --config ./setup/setup-tasks.json
```

## Quick Start

### Interactive Mode

The simplest way to use the tool - it will prompt you for configuration:

```sh
scaffoldfy
```

### With Configuration File

Define your tasks in a JSON or TypeScript file and pass it to the CLI:

```sh
scaffoldfy --config ./tasks.json
```

Or with TypeScript:

```sh
scaffoldfy --config ./tasks.ts
```

### Schema Validation

By default, all JSON task configuration files are validated against the JSON schema to catch configuration errors early. The schema validation ensures:

- Required fields are present
- Field types are correct
- Enum values are valid
- Configuration structure matches expected format

If validation fails, you'll see detailed error messages pointing to the issues:

```sh
scaffoldfy --config ./tasks.json
# Validating task configuration against schema...
# ❌ Schema validation failed:
#
# The following validation errors were found:
#
#   • /tasks/0: Missing required property "type"
#   • /name: Value must match pattern: ^[a-z\d]+(?:-[a-z\d]+)*$
```

You can skip validation (not recommended) with the `--no-validate` flag:

```sh
scaffoldfy --config ./tasks.json --no-validate
```

### Dry Run Mode

Preview what changes would be made without actually applying them:

```sh
scaffoldfy --config ./tasks.json --dry-run
```

Learn more: [Dry Run Mode Documentation](DRY_RUN.md)

### Force Execution

Force execution even if checks fail:

```sh
scaffoldfy --force
```

### Debug Mode

Enable debug logging to see detailed information about what's happening:

```sh
scaffoldfy --config ./tasks.json --debug
```

Debug mode provides verbose output including:

- Variable resolution details
- Task dependency resolution
- Plugin hook executions
- Template processing steps
- Detailed error messages

This is particularly useful for:

- Troubleshooting configuration issues
- Understanding task execution order
- Debugging template inheritance
- Verifying variable and prompt values

## CLI Options

| Option            | Description                                                                     |
| ----------------- | ------------------------------------------------------------------------------- |
| `--config <path>` | Path to config file (JSON or TypeScript, default: `./template-tasks.json`)      |
| `--dry-run`       | Preview changes without applying them                                           |
| `--force`         | Force execution even if checks fail                                             |
| `--no-validate`   | Skip schema validation of task configuration (validation is enabled by default) |
| `-h, --help`      | Show help message                                                               |
| `-v, --version`   | Show version                                                                    |

## Programmatic Usage

### Using TypeScript Tasks

```typescript
import { runWithTasks } from '@pixpilot/scaffoldfy';
import { tasks } from './my-tasks';

// Run with default options (interactive)
await runWithTasks(tasks);

// Run with dry-run enabled
await runWithTasks(tasks, { dryRun: true });

// Force execution
await runWithTasks(tasks, { force: true });
```

### Loading Tasks from JSON

```typescript
import fs from 'node:fs';
import { runWithTasks } from '@pixpilot/scaffoldfy';

const tasksFilePath = './tasks.json';
const tasksJson = JSON.parse(fs.readFileSync(tasksFilePath, 'utf-8'));

await runWithTasks(tasksJson.tasks);
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
    type: 'write',
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
  "name": "my-template",
  "description": "Optional description of what this template does",
  "dependencies": ["optional-dependency-template"],
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

> **Note:**
>
> - The `name` field is **required** for all templates. It must contain only lowercase letters, digits, and hyphens. It cannot start or end with a hyphen, or contain consecutive hyphens (e.g., `my-template`, `node-project-generator`).
> - The `description` field is optional but recommended for documentation.
> - The `dependencies` field is optional and can be used to document template dependencies.
> - The `tasks` array is optional when using template inheritance. You can create templates with only `prompts` and/or `variables` that other templates can extend. See [Template Inheritance](./TEMPLATE_INHERITANCE.md) for details.
> - Task properties `description`, `required`, and `enabled` are optional and default to `""`, `true`, and `true` respectively.

### With Interactive Prompts

Add user prompts at the root level to collect custom input:

```json
{
  "name": "project-setup-with-prompts",
  "description": "Configure project with interactive prompts",
  "prompts": [
    {
      "id": "projectName",
      "type": "input",
      "message": "What is your project name?",
      "required": true
    },
    {
      "id": "useTypeScript",
      "type": "confirm",
      "message": "Use TypeScript?",
      "default": true
    }
  ],
  "tasks": [
    {
      "id": "setup",
      "name": "Project Setup",
      "description": "Configure project settings",
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

Learn more: [Interactive Prompts Guide](PROMPTS.md)

### With Dependencies

Tasks can depend on other tasks to ensure correct execution order:

```json
{
  "name": "task-dependencies-example",
  "description": "Demonstrates task execution order with dependencies",
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
  "name": "remove-examples",
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

You can also define custom variables through root-level prompts:

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
  "tasks": [
    {
      "id": "configure",
      "name": "Configure",
      "type": "update-json",
      "config": {
        "file": "config.json",
        "updates": {
          "port": "{{port}}",
          "author": "{{author}}"
        }
      }
    }
  ]
}
```

## Real-World Example

Here's a complete example that sets up a Node.js project:

```json
{
  "$schema": "./node_modules/@pixpilot/scaffoldfy/schema/tasks.schema.json",
  "name": "node-project-setup",
  "prompts": [
    {
      "id": "projectName",
      "type": "input",
      "message": "Project name?",
      "required": true
    },
    {
      "id": "description",
      "type": "input",
      "message": "Project description?"
    },
    {
      "id": "license",
      "type": "select",
      "message": "Choose a license:",
      "choices": ["MIT", "Apache-2.0", "GPL-3.0", "BSD-3-Clause"],
      "default": "MIT"
    }
  ],
  "tasks": [
    {
      "id": "project-info",
      "name": "Project Information",
      "description": "Update package.json with project details",
      "required": true,
      "enabled": true,
      "type": "update-json",
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
      "type": "write",
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
4. **Mark critical tasks as required** - Essential tasks are `required: true` by default. Set `required: false` for optional tasks that shouldn't stop execution on failure
5. **Document your tasks** - Write clear names and descriptions for maintainability
6. **Version your task files** - Keep task definitions in version control alongside your project
7. **Leverage the schema** - Add `$schema` to JSON files for IDE autocomplete and validation
8. **Test with different inputs** - Try various configuration values to ensure robustness
9. **Preview changes** - Use dry-run mode to verify behavior before execution

## Troubleshooting

### "No tasks defined" error

Make sure you're either:

- Passing `--config` with a valid JSON or TypeScript file path
- Calling `runWithTasks()` with a non-empty tasks array

### "Circular dependency detected" error

Review your task dependencies - one or more tasks have circular references. Check the `dependencies` arrays in your tasks to ensure they form a directed acyclic graph (DAG).

### "Task not found" error

A task lists a dependency that doesn't exist. Verify that all task IDs in `dependencies` arrays match existing task IDs exactly.

### Template variables not replaced

Ensure you're using the correct syntax: `{{variableName}}` and that the variable:

- Is a built-in variable (like `projectName`, `author`, etc.)
- Or is defined in a root-level prompt with the matching `id`

### File not found errors

Check that:

- File paths are relative to the project root (where you run the command)
- Template files exist at the specified `templateFile` path
- Directories exist for files you're trying to update

## Next Steps

Now that you're familiar with the basics, explore these topics:

- **[Task Types Reference](TASK_TYPES.md)** - Learn about all built-in task types
- **[Interactive Prompts](PROMPTS.md)** - Master user input collection
- **[Advanced Features](FEATURES.md)** - Conditional execution, global prompts, and Handlebars
- **[Template Inheritance](TEMPLATE_INHERITANCE.md)** - Compose and extend templates
- **[Plugin System](PLUGINS.md)** - Create custom task types
- **[Dry Run Mode](DRY_RUN.md)** - Preview changes with detailed diffs

## Need Help?

- 📚 Browse the [full documentation](README.md)
- 🐛 [Report issues](https://github.com/pixpilot/scaffoldfy/issues)
- 💬 Ask questions in [discussions](https://github.com/pixpilot/scaffoldfy/discussions)
