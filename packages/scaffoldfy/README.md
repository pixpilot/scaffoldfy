# @pixpilot/scaffoldfy

A flexible and powerful task automation utility for project setup, cleanup, and configuration.

## Features

- 🔄 **9 Task Types** - update-json, write, regex-replace, replace-in-file, delete, conditional-delete, rename, git-init, exec
- 🧩 **Template Inheritance** - Extend base templates for code reuse
- 🔍 **Dry-Run Mode with Diff** - Preview exact changes before applying
- 🔌 **Plugin System** - Create custom task types and lifecycle hooks
- 💬 **Interactive Prompts** - Collect user input with input, select, confirm, number, and password prompts
- � **Variables** - Define reusable values from static or executable sources without user interaction
- �📦 **JSON/TypeScript Config** - Define tasks in JSON or TypeScript files
- 🔗 **Task Dependencies** - Ensure tasks run in the correct order
- ✅ **Type-Safe** - Full TypeScript support with JSON schema validation
- 🎯 **Template Variables** - Use `{{variable}}` syntax for dynamic configuration
- 📝 **Handlebars Support** - Advanced templating with conditionals, loops, and helpers
- ⚡ **CLI & Programmatic** - Use as a command-line tool or import as a library

## Installation

```sh
pnpm add @pixpilot/scaffoldfy
```

## Quick Start

### CLI Usage

```sh
# Basic usage with default task file
scaffoldfy

# With custom tasks file
scaffoldfy --tasks-file ./my-tasks.json

# TypeScript tasks file
scaffoldfy --tasks-ts ./my-tasks.ts

# Preview changes (dry run)
scaffoldfy --dry-run

# Force re-initialization
scaffoldfy --force
```

Or run without installing using npx:

```sh
# Basic usage with default task file
npx @pixpilot/scaffoldfy

# With custom tasks file
npx @pixpilot/scaffoldfy --tasks-file ./my-tasks.json

# TypeScript tasks file
npx @pixpilot/scaffoldfy --tasks-ts ./my-tasks.ts

# Preview changes (dry run)
npx @pixpilot/scaffoldfy --dry-run

# Force re-initialization
npx @pixpilot/scaffoldfy --force
```

### CLI Options

| Option                | Description                                                                     |
| --------------------- | ------------------------------------------------------------------------------- |
| `--tasks-file <path>` | Path to JSON task file (default: `./template-tasks.json`)                       |
| `--tasks-ts <path>`   | Path to TypeScript task file (default: `./template-tasks.ts`)                   |
| `--dry-run`           | Preview changes without applying them                                           |
| `--force`             | Force re-initialization                                                         |
| `--no-validate`       | Skip schema validation of task configuration (validation is enabled by default) |
| `-h, --help`          | Show help message                                                               |
| `-v, --version`       | Show version                                                                    |

### Programmatic API

```typescript
import { runWithTasks } from '@pixpilot/scaffoldfy';

await runWithTasks(tasks, {
  dryRun: false,
  force: false,
  tasksFilePath: './my-tasks.json',
});
```

### Task Types

9 built-in task types for common operations:

| Type                 | Purpose                                            |
| -------------------- | -------------------------------------------------- |
| `update-json`        | Update JSON files (supports nested properties)     |
| `template`           | Create files from templates (simple or Handlebars) |
| `regex-replace`      | Find and replace with regex                        |
| `replace-in-file`    | Simple find and replace                            |
| `delete`             | Remove files/directories                           |
| `conditional-delete` | Remove based on conditions                         |
| `rename`             | Rename or move files                               |
| `git-init`           | Initialize git repository                          |
| `exec`               | Execute shell commands                             |

📖 **[Complete Task Types Reference →](https://pixpilot.github.io/scaffoldfy/TASK_TYPES.html)**

### Interactive Prompts

Collect custom user input directly in your task definitions:

```json
{
  "id": "setup",
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
```

**Supported prompt types:** `input`, `password`, `number`, `select`, `confirm`

**Global prompts:** Mark prompts with `"global": true` to share values across all tasks

💬 **[Full Prompts Guide →](https://pixpilot.github.io/scaffoldfy/PROMPTS.html)** | 📋 **[Quick Reference →](https://pixpilot.github.io/scaffoldfy/PROMPTS_QUICK_REFERENCE.html)**

### Template Variables

Use `{{variable}}` syntax anywhere in your task configs:

```json
{
  "updates": {
    "name": "{{projectName}}",
    "author": "{{author}}",
    "repository": "{{repoUrl}}"
  }
}
```

**All variables come from prompts:** Define prompts with `"global": true` to create variables available across all tasks.

**Example:** `{{projectName}}`, `{{author}}`, `{{repoUrl}}`, `{{port}}`, etc.

### Handlebars Templates

Create powerful file templates with Handlebars support. Files with `.hbs` extension automatically use Handlebars templating:

```json
{
  "id": "readme-from-template",
  "name": "Generate README",
  "type": "template",
  "config": {
    "file": "README.md",
    "templateFile": "templates/readme.hbs"
  }
}
```

**Automatic detection:** Any template file ending in `.hbs` uses Handlebars. Other files use simple `{{variable}}` interpolation.

**Template file** (`templates/readme.hbs`):

```handlebars
#
{{projectName}}

{{#if description}}
  >
  {{description}}
{{else}}
  > A modern TypeScript project
{{/if}}

## Features

{{#each features}}
  -
  {{this}}
{{/each}}

{{#if author}}
  ## Author

  {{author}}
{{/if}}
```

**Key features:**

- **File-based only:** Handlebars is only supported for external template files (`.hbs` extension)
- **Automatic detection:** No configuration needed - just use `.hbs` files
- **Conditionals:** `{{#if}}`, `{{#unless}}`, `{{else}}`
- **Loops:** `{{#each}}`, `{{#with}}`
- **Comments:** `{{!-- This won't appear in output --}}`

📝 **[Complete Handlebars Guide →](https://pixpilot.github.io/scaffoldfy/HANDLEBARS_TEMPLATES.html)**

### Template Inheritance

Extend base templates to promote code reuse:

```json
{
  "extends": "./base-template.json",
  "tasks": [
    {
      "id": "custom-task",
      "name": "Custom Task",
      "description": "Project-specific setup",
      "required": true,
      "enabled": true,
      "type": "exec",
      "config": { "command": "echo 'Custom setup'" }
    }
  ]
}
```

You can extend multiple templates, override tasks by ID, and merge dependencies automatically.

🧬 **[Complete Inheritance Guide →](https://pixpilot.github.io/scaffoldfy/TEMPLATE_INHERITANCE.html)**

### Dry-Run Mode with Diff Preview

Preview exactly what will change before applying:

```bash
scaffoldfy --tasks-file ./tasks.json --dry-run
```

See color-coded diffs for all file modifications, deletions, and additions.

🔍 **[Dry-Run Documentation →](https://pixpilot.github.io/scaffoldfy/DRY_RUN.html)**

### Plugin System

Create custom task types for specialized operations:

```typescript
import { createPlugin, registerPlugin } from '@pixpilot/scaffoldfy';

const myPlugin = createPlugin(
  'my-plugin',
  'custom-task',
  async (task, config, options) => {
    // Your custom logic here
  },
);

registerPlugin(myPlugin);
```

🔌 **[Complete Plugin Guide →](https://pixpilot.github.io/scaffoldfy/PLUGINS.html)**

### Task Dependencies

Control execution order:

```json
{
  "tasks": [
    { "id": "clean", "type": "delete", "config": { "paths": ["dist"] } },
    {
      "id": "build",
      "dependencies": ["clean"],
      "type": "exec",
      "config": { "command": "pnpm build" }
    }
  ]
}
```

## Example Configuration

### Simple Example

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
          "name": "{{projectName}}",
          "author": "{{author}}"
        }
      }
    }
  ]
}
```

### With Prompts

```json
{
  "tasks": [
    {
      "id": "setup-project",
      "name": "Setup Project",
      "description": "Configure project settings",
      "required": true,
      "enabled": true,
      "type": "update-json",
      "prompts": [
        {
          "id": "projectName",
          "type": "input",
          "message": "Project name?",
          "required": true
        },
        {
          "id": "includeTests",
          "type": "confirm",
          "message": "Include tests?",
          "default": true
        }
      ],
      "config": {
        "file": "package.json",
        "updates": {
          "name": "{{projectName}}",
          "scripts": {
            "test": "{{includeTests ? 'vitest' : 'echo \"No tests\"'}}"
          }
        }
      }
    }
  ]
}
```

📁 **[More Examples →](examples/)**

## Documentation

📚 **[Complete Documentation](https://pixpilot.github.io/scaffoldfy/)** - Comprehensive guides and references

### Quick Links

- **[Getting Started](https://pixpilot.github.io/scaffoldfy/GETTING_STARTED.html)** - Installation, CLI usage, and examples
- **[Task Types Reference](https://pixpilot.github.io/scaffoldfy/TASK_TYPES.html)** - All 9 built-in task types
- **[Interactive Prompts](https://pixpilot.github.io/scaffoldfy/PROMPTS.html)** - Collect user input
- **[Variables](https://pixpilot.github.io/scaffoldfy/VARIABLES.html)** - Reusable values without user interaction
- **[Advanced Features](https://pixpilot.github.io/scaffoldfy/FEATURES.html)** - Conditional execution, global prompts, Handlebars
- **[Template Inheritance](https://pixpilot.github.io/scaffoldfy/TEMPLATE_INHERITANCE.html)** - Extend and compose templates
- **[Plugin System](https://pixpilot.github.io/scaffoldfy/PLUGINS.html)** - Create custom task types
- **[Dry-Run Mode](https://pixpilot.github.io/scaffoldfy/DRY_RUN.html)** - Preview changes safely

### Resources

- **[JSON Schema](schema/tasks.schema.json)** - For IDE autocomplete and validation
- **[Example Files](examples/)** - Sample task configurations

## JSON Schema Support

Enable autocomplete and validation in your IDE:

```json
{
  "$schema": "node_modules/@pixpilot/scaffoldfy/schema/tasks.schema.json",
  "tasks": []
}
```

## Contributing

Contributions are welcome! Please check out the [Contributing Guide](../../CONTRIBUTING.md) for guidelines.

### Development

```sh
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Build
pnpm build

# Type check
pnpm typecheck
```

## License

MIT
