<div style="background: #ffdddd; border: 1px solid #ff0000; color: #a00; padding: 1em; margin-bottom: 1.5em; border-radius: 6px; font-weight: bold;">
🚨 <b>Package moved!</b> Now published as <a href="https://www.npmjs.com/package/@pixpilot/scaffoldfy" style="color: #a00; text-decoration: underline;">@pixpilot/scaffoldfy</a> on npm.
</div>

# scaffoldfy

A flexible and powerful template initialization utility for automating project setup, cleanup, and configuration tasks.

## Features

- 🔄 **9 Task Types** - update-json, template, regex-replace, replace-in-file, delete, conditional-delete, rename, git-init, exec
- 🧩 **Template Inheritance** - Extend base templates for code reuse
- 🔍 **Dry-Run Mode with Diff** - Preview exact changes before applying
- 🔌 **Plugin System** - Create custom task types and lifecycle hooks
- 💬 **Interactive Prompts** - Collect user input with input, select, confirm, number, and password prompts
- 📦 **JSON/TypeScript Config** - Define tasks in JSON or TypeScript files
- 🔗 **Task Dependencies** - Ensure tasks run in the correct order
- ✅ **Type-Safe** - Full TypeScript support with JSON schema validation
- 🎯 **Template Variables** - Use `{{variable}}` syntax for dynamic configuration
- 📝 **Handlebars Support** - Advanced templating with conditionals, loops, and helpers
- ⚡ **CLI & Programmatic** - Use as a command-line tool or import as a library

## Installation

```sh
pnpm add scaffoldfy
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

### CLI Options

| Option                | Description                                                   |
| --------------------- | ------------------------------------------------------------- |
| `--tasks-file <path>` | Path to JSON task file (default: `./template-tasks.json`)     |
| `--tasks-ts <path>`   | Path to TypeScript task file (default: `./template-tasks.ts`) |
| `--dry-run`           | Preview changes without applying them                         |
| `--force`             | Force re-initialization                                       |
| `--keep-tasks-file`   | Keep task file after completion (default: remove)             |
| `-h, --help`          | Show help message                                             |
| `-v, --version`       | Show version                                                  |

### Programmatic API

```typescript
import { runWithTasks } from 'scaffoldfy';

await runWithTasks(tasks, {
  dryRun: false,
  force: false,
  tasksFilePath: './my-tasks.json',
});
```

## Core Concepts

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

📖 **[Complete Task Types Reference →](docs/TASK_TYPES.md)**

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

💬 **[Full Prompts Guide →](docs/PROMPTS.md)** | 📋 **[Quick Reference →](docs/PROMPTS_QUICK_REFERENCE.md)**

### Template Variables

Use `{{variable}}` syntax anywhere in your task configs:

```json
{
  "updates": {
    "name": "{{repoName}}",
    "author": "{{author}}",
    "repository": "{{repoUrl}}"
  }
}
```

**Built-in variables:** `repoName`, `repoOwner`, `repoUrl`, `author`, `baseRepoUrl`, `orgName`

**Custom variables:** Any prompt values you define (e.g., `{{projectName}}`, `{{port}}`)

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
{{repoName}}

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

📝 **[Complete Handlebars Guide →](docs/HANDLEBARS_TEMPLATES.md)**

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

🧬 **[Complete Inheritance Guide →](docs/TEMPLATE_INHERITANCE.md)**

### Dry-Run Mode with Diff Preview

Preview exactly what will change before applying:

```bash
scaffoldfy --tasks-file ./tasks.json --dry-run
```

See color-coded diffs for all file modifications, deletions, and additions.

🔍 **[Dry-Run Documentation →](docs/DRY_RUN.md)**

### Plugin System

Create custom task types for specialized operations:

```typescript
import { createPlugin, registerPlugin } from 'scaffoldfy';

const myPlugin = createPlugin(
  'my-plugin',
  'custom-task',
  async (task, config, options) => {
    // Your custom logic here
  },
);

registerPlugin(myPlugin);
```

🔌 **[Complete Plugin Guide →](docs/PLUGINS.md)**

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
          "name": "{{repoName}}",
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

📚 **[Complete Documentation](../../docs/README.md)** - Start here for comprehensive guides and references

### Quick Links

- **[Getting Started](../../docs/GETTING_STARTED.md)** - Installation, CLI usage, and examples
- **[Task Types Reference](../../docs/TASK_TYPES.md)** - All 9 built-in task types
- **[Interactive Prompts](../../docs/PROMPTS.md)** - Collect user input
- **[Advanced Features](../../docs/FEATURES.md)** - Conditional execution, global prompts, Handlebars
- **[Template Inheritance](../../docs/TEMPLATE_INHERITANCE.md)** - Extend and compose templates
- **[Plugin System](../../docs/PLUGINS.md)** - Create custom task types
- **[Dry-Run Mode](../../docs/DRY_RUN.md)** - Preview changes safely

### Resources

- **[JSON Schema](schema/tasks.schema.json)** - For IDE autocomplete and validation
- **[Example Files](examples/)** - Sample task configurations

### 📁 Project Structure

```
scaffoldfy (monorepo)/
├── docs/                          # Complete documentation
│   ├── README.md                  # Documentation index
│   ├── GETTING_STARTED.md         # Getting started guide
│   ├── FEATURES.md                # Advanced features
│   ├── TASK_TYPES.md              # Task types reference
│   ├── PROMPTS.md                 # Prompts guide
│   ├── PROMPTS_QUICK_REFERENCE.md # Quick reference
│   ├── TEMPLATE_INHERITANCE.md    # Inheritance guide
│   ├── HANDLEBARS_TEMPLATES.md    # Handlebars guide
│   ├── PLUGINS.md                 # Plugin system
│   ├── DRY_RUN.md                 # Dry-run mode
│   └── EXECUTABLE_DEFAULTS_REFERENCE.md
└── packages/
    └── scaffoldfy/                # Main package
        ├── src/
        │   ├── cli.ts             # CLI entry point
        │   ├── types.ts           # TypeScript definitions
        │   ├── config.ts          # Configuration
        │   ├── prompts.ts         # Prompt handling
        │   ├── task-executors.ts  # Task execution
        │   ├── task-resolver.ts   # Dependency resolution
        │   └── utils.ts           # Utilities
        ├── schema/
        │   └── tasks.schema.json  # JSON schema
        ├── examples/              # Example configurations
        └── test/                  # Test files
```

## JSON Schema Support

Enable autocomplete and validation in your IDE:

```json
{
  "$schema": "node_modules/scaffoldfy/schema/tasks.schema.json",
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
