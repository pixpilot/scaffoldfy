# @pixpilot/scaffoldfy

[![Documentation](https://img.shields.io/badge/docs-pixpilot.github.io/scaffoldfy-blue)](https://pixpilot.github.io/scaffoldfy/)

A flexible and powerful task automation utility for project setup, cleanup, and configuration.

## Features

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
scaffoldfy --config ./my-tasks.json

# Preview changes (dry run)
scaffoldfy --dry-run
```

Or run without installing using npx:

```sh
# Basic usage with default task file
npx @pixpilot/scaffoldfy

# With custom tasks file
npx @pixpilot/scaffoldfy --config ./my-tasks.json

# Preview changes (dry run)
npx @pixpilot/scaffoldfy --dry-run
```

### CLI Options

| Option            | Description                                                                     |
| ----------------- | ------------------------------------------------------------------------------- |
| `--config <path>` | Path to config file (JSON or TypeScript, default: `./template-tasks.json`)      |
| `--dry-run`       | Preview changes without applying them                                           |
| `--no-validate`   | Skip schema validation of task configuration (validation is enabled by default) |
| `-h, --help`      | Show help message                                                               |
| `-v, --version`   | Show version                                                                    |

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

Built-in task types for common operations:

| Type              | Purpose                                            |
| ----------------- | -------------------------------------------------- |
| `update-json`     | Update JSON files (supports nested properties)     |
| `template`        | Create files from templates (simple or Handlebars) |
| `create`          | Create new files with optional content             |
| `regex-replace`   | Find and replace with regex                        |
| `replace-in-file` | Simple find and replace                            |
| `delete`          | Remove files/directories                           |
| `rename`          | Rename or move files                               |
| `move`            | Move files or directories                          |
| `copy`            | Copy files or directories                          |
| `append`          | Append content to existing files                   |
| `mkdir`           | Create directories                                 |
| `git-init`        | Initialize git repository                          |
| `exec`            | Execute shell commands                             |

📖 **[Complete Task Types Reference →](https://pixpilot.github.io/scaffoldfy/TASK_TYPES.html)**

### Interactive Prompts

Collect user input at the root level - prompts are collected once before tasks run and available to all tasks:

```json
{
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
      "name": "Setup Project",
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

**Supported prompt types:** `input`, `password`, `number`, `select`, `confirm`

**Root-level only:** Prompts are defined at the root level, collected once upfront, and available to all tasks

💬 **[Full Prompts Guide →](https://pixpilot.github.io/scaffoldfy/PROMPTS.html)** | 📋 **[Quick Reference →](https://pixpilot.github.io/scaffoldfy/PROMPTS_QUICK_REFERENCE.html)**

### Variables

Define reusable values without user interaction - automatically resolved from static values or executable commands:

```json
{
  "variables": [
    {
      "id": "currentYear",
      "value": {
        "type": "exec",
        "value": "node -e \"console.log(new Date().getFullYear())\""
      }
    },
    {
      "id": "gitUserName",
      "value": {
        "type": "exec",
        "value": "git config user.name"
      }
    },
    {
      "id": "defaultLicense",
      "value": "MIT"
    }
  ],
  "tasks": [
    {
      "id": "update-license",
      "type": "template",
      "config": {
        "file": "LICENSE",
        "template": "Copyright {{currentYear}} {{gitUserName}}\n\nLicense: {{defaultLicense}}"
      }
    }
  ]
}
```

**Use in tasks:** Reference variables using `{{variable}}` syntax: `{{currentYear}}`, `{{gitUserName}}`, `{{defaultLicense}}`

**Variable types:** Static values, executable commands (with auto-parsing), or conditional expressions

📌 **[Complete Variables Guide →](https://pixpilot.github.io/scaffoldfy/VARIABLES.html)**

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
scaffoldfy --config ./tasks.json --dry-run
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

### Complete Example with Prompts and Variables

```json
{
  "prompts": [
    {
      "id": "projectName",
      "type": "input",
      "message": "What is your project name?",
      "required": true
    },
    {
      "id": "author",
      "type": "input",
      "message": "Who is the author?",
      "default": {
        "type": "exec",
        "value": "git config user.name"
      }
    },
    {
      "id": "useTypeScript",
      "type": "confirm",
      "message": "Use TypeScript?",
      "default": true
    }
  ],
  "variables": [
    {
      "id": "currentYear",
      "value": {
        "type": "exec",
        "value": "node -e \"console.log(new Date().getFullYear())\""
      }
    },
    {
      "id": "license",
      "value": "MIT"
    }
  ],
  "tasks": [
    {
      "id": "update-package",
      "name": "Update package.json",
      "description": "Set project metadata",
      "type": "update-json",
      "config": {
        "file": "package.json",
        "updates": {
          "name": "{{projectName}}",
          "author": "{{author}}",
          "license": "{{license}}"
        }
      }
    },
    {
      "id": "create-readme",
      "name": "Create README",
      "description": "Generate README file",
      "type": "template",
      "config": {
        "file": "README.md",
        "template": "# {{projectName}}\n\nAuthor: {{author}}\nCopyright {{currentYear}}"
      }
    }
  ]
}
```

### Simple Example

```json
{
  "prompts": [
    {
      "id": "projectName",
      "type": "input",
      "message": "Project name?",
      "required": true
    }
  ],
  "tasks": [
    {
      "id": "update-package",
      "name": "Update package.json",
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

📁 **[More Examples →](examples/)**

## Documentation

📚 **[Complete Documentation](https://pixpilot.github.io/scaffoldfy/)** - Comprehensive guides and references

### Quick Links

- **[Getting Started](https://pixpilot.github.io/scaffoldfy/GETTING_STARTED.html)** - Installation, CLI usage, and examples
- **[Task Types Reference](https://pixpilot.github.io/scaffoldfy/TASK_TYPES.html)** - All built-in task types
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
