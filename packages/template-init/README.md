# @pixpilot/template-init

A flexible and powerful template initialization utility for automating project setup, cleanup, and configuration tasks.

## Features

- 🔄 **9 Task Types** - update-json, template, regex-replace, replace-in-file, delete, conditional-delete, rename, git-init, exec
- � **Interactive Prompts** - Collect user input with input, select, confirm, number, and password prompts
- 📦 **JSON/TypeScript Config** - Define tasks in JSON or TypeScript files
- 🔗 **Task Dependencies** - Ensure tasks run in the correct order
- 🌳 **Dry Run Mode** - Preview changes before applying them
- ✅ **Type-Safe** - Full TypeScript support with JSON schema validation
- 🎯 **Template Variables** - Use `{{variable}}` syntax for dynamic configuration
- ⚡ **CLI & Programmatic** - Use as a command-line tool or import as a library

## Installation

```sh
pnpm add @pixpilot/template-init
```

## Quick Start

### CLI Usage

```sh
# Basic usage with default task file
template-init

# With custom tasks file
template-init --tasks-file ./my-tasks.json

# TypeScript tasks file
template-init --tasks-ts ./my-tasks.ts

# Preview changes (dry run)
template-init --dry-run

# Force re-initialization
template-init --force
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
import { runWithTasks } from '@pixpilot/template-init';

await runWithTasks(tasks, {
  dryRun: false,
  force: false,
  keepTasksFile: true,
  tasksFilePath: './my-tasks.json',
});
```

## Core Concepts

### Task Types

9 built-in task types for common operations:

| Type                 | Purpose                                        |
| -------------------- | ---------------------------------------------- |
| `update-json`        | Update JSON files (supports nested properties) |
| `template`           | Create files from templates                    |
| `regex-replace`      | Find and replace with regex                    |
| `replace-in-file`    | Simple find and replace                        |
| `delete`             | Remove files/directories                       |
| `conditional-delete` | Remove based on conditions                     |
| `rename`             | Rename or move files                           |
| `git-init`           | Initialize git repository                      |
| `exec`               | Execute shell commands                         |

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
      "required": true
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

**Built-in variables:** `repoName`, `repoOwner`, `repoUrl`, `author`, `baseRepoUrl`, `defaultBundler`, `orgName`, `keepExamplePackages`

**Custom variables:** Any prompt values you define (e.g., `{{projectName}}`, `{{port}}`)

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

### 📚 Guides

- **[Task Types Reference](docs/TASK_TYPES.md)** - Complete guide to all 9 task types
- **[Prompts Guide](docs/PROMPTS.md)** - Interactive user input in tasks
- **[Prompts Quick Reference](docs/PROMPTS_QUICK_REFERENCE.md)** - Quick prompt syntax reference

### 📖 Resources

- **[JSON Schema](schema/tasks.schema.json)** - For IDE autocomplete and validation
- **[Example Files](examples/)** - Sample task configurations
- **[USAGE.md](USAGE.md)** - Detailed usage examples

### 📁 Project Structure

```
@pixpilot/template-init/
├── src/
│   ├── cli.ts                 # CLI entry point
│   ├── types.ts               # TypeScript definitions
│   ├── config.ts              # Configuration collection
│   ├── prompts.ts             # Prompt handling
│   ├── task-executors.ts     # Task execution logic
│   ├── task-resolver.ts       # Dependency resolution
│   └── utils.ts               # Utility functions
├── schema/
│   └── tasks.schema.json      # JSON schema for validation
├── docs/
│   ├── TASK_TYPES.md          # Task types documentation
│   ├── PROMPTS.md             # Prompts guide
│   └── PROMPTS_QUICK_REFERENCE.md  # Quick reference
├── examples/
│   └── template-tasks-with-prompts.json
└── test/
    ├── prompts.test.ts        # Prompt tests
    ├── prompts-integration.test.ts
    └── ...                    # Other test files
```

## JSON Schema Support

Enable autocomplete and validation in your IDE:

```json
{
  "$schema": "node_modules/@pixpilot/template-init/schema/tasks.schema.json",
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
