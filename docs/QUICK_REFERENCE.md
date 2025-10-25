---
layout: default
title: Quick Reference - Scaffoldfy
---

# Quick Reference Guide

**Get started with Scaffoldfy in minutes!** This guide provides quick examples and essential commands to help you understand and use the library without reading all the documentation.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Essential Task Types](#essential-task-types)
- [Quick Prompt Examples](#quick-prompt-examples)
- [Common Patterns](#common-patterns)
- [Programmatic API](#programmatic-api)

---

## Basic Usage

### 🚀 Quick Start with npx (No Installation Required)

```bash
# Run any template directly with npx (fastest way!)
npx @pixpilot/scaffoldfy

# With custom tasks file
npx @pixpilot/scaffoldfy --config ./my-tasks.json

# Preview changes first (recommended)
npx @pixpilot/scaffoldfy --dry-run

# With TypeScript tasks file
npx @pixpilot/scaffoldfy --config ./my-tasks.ts
```

### CLI

#### Installation (Optional)

**Optional:** You can use npx (above) without installing anything. Or install for repeated use:

```bash
# Install globally for CLI usage
npm install -g @pixpilot/scaffoldfy

# Or install locally in your project
npm install --save-dev @pixpilot/scaffoldfy
```

```bash
# Basic usage with default task file (./template-tasks.json)
scaffoldfy

# With custom tasks file
scaffoldfy --config ./my-tasks.json

# Preview changes without applying (dry-run mode)
scaffoldfy --dry-run

# With TypeScript task file
scaffoldfy --config ./my-tasks.ts
```

### Programmatic API

```typescript
import { runWithTasks } from '@pixpilot/scaffoldfy';

// Run tasks
await runWithTasks(tasks, {
  dryRun: false,
  force: false,
  tasksFilePath: './template-tasks.json',
});
```

---

## Essential Task Types

### 1. **Write Files** - Create or overwrite files

```json
{
  "id": "create-readme",
  "name": "Create README",
  "type": "write",
  "config": {
    "file": "README.md",
    "template": "# {{projectName}}\n\nAuthor: {{author}}"
  }
}
```

### 2. **Update JSON** - Modify JSON files (merge or set values)

```json
{
  "id": "update-package",
  "name": "Update package.json",
  "type": "update-json",
  "config": {
    "file": "package.json",
    "updates": {
      "name": "{{projectName}}",
      "version": "1.0.0",
      "author": "{{author}}"
    }
  }
}
```

### 3. **Copy Files** - Copy files or directories

```json
{
  "id": "copy-template",
  "name": "Copy template files",
  "type": "copy",
  "config": {
    "source": "templates/",
    "destination": "src/",
    "overwrite": true
  }
}
```

### 4. **Execute Commands** - Run shell commands

```json
{
  "id": "install-deps",
  "name": "Install dependencies",
  "type": "exec",
  "config": {
    "command": "npm install"
  }
}
```

### 5. **Delete Files** - Remove files or directories

```json
{
  "id": "cleanup",
  "name": "Remove temp files",
  "type": "delete",
  "config": {
    "paths": ["temp/", "*.log"]
  }
}
```

---

## Quick Prompt Examples

### Text Input

```json
{
  "id": "projectName",
  "type": "input",
  "message": "Project name",
  "required": true,
  "default": "my-project"
}
```

### Confirmation (Yes/No)

```json
{
  "id": "useTypeScript",
  "type": "confirm",
  "message": "Use TypeScript?",
  "default": true
}
```

### Single Selection

```json
{
  "id": "framework",
  "type": "select",
  "message": "Choose a framework",
  "choices": ["React", "Vue", "Angular", "Svelte"]
}
```

### Multiple Selection

```json
{
  "id": "features",
  "type": "multiselect",
  "message": "Select features",
  "choices": ["ESLint", "Prettier", "Jest", "Husky"]
}
```

### Dynamic Default from Command

```json
{
  "id": "author",
  "type": "input",
  "message": "Author name",
  "default": {
    "type": "exec",
    "value": "git config --get user.name"
  }
}
```

---

## Common Patterns

### Complete Minimal Template

```json
{
  "$schema": "../schema/tasks.schema.json",
  "prompts": [
    {
      "id": "projectName",
      "type": "input",
      "message": "Project name",
      "required": true
    }
  ],
  "tasks": [
    {
      "id": "create-readme",
      "name": "Create README",
      "type": "write",
      "config": {
        "file": "README.md",
        "template": "# {{projectName}}\n\nA new project."
      }
    },
    {
      "id": "init-git",
      "name": "Initialize Git",
      "type": "git-init"
    }
  ]
}
```

### Conditional Task Execution

```json
{
  "id": "setup-typescript",
  "name": "Setup TypeScript",
  "type": "write",
  "enabled": "{{useTypeScript}}",
  "config": {
    "file": "tsconfig.json",
    "template": "{\"compilerOptions\": {\"strict\": true}}"
  }
}
```

### Task with Dependencies

```json
{
  "id": "install-deps",
  "name": "Install dependencies",
  "type": "exec",
  "dependencies": ["update-package"],
  "config": {
    "command": "npm install"
  }
}
```

### Using Variables (No User Input)

```json
{
  "variables": [
    {
      "id": "currentYear",
      "value": {
        "type": "exec",
        "value": "date +%Y"
      }
    }
  ],
  "tasks": [
    {
      "id": "add-license",
      "name": "Add LICENSE",
      "type": "write",
      "config": {
        "file": "LICENSE",
        "template": "Copyright {{currentYear}} {{author}}"
      }
    }
  ]
}
```

---

```bash
# Run with default config
scaffoldfy

# With custom config file
scaffoldfy --config ./my-tasks.json

# Dry run (preview changes)
scaffoldfy --dry-run

# Show version
scaffoldfy --version

# Show help
scaffoldfy --help
```

### Options

```bash
--config <path>    # Path to config file (JSON or TypeScript, default: ./template-tasks.json)
--dry-run          # Preview changes without applying them
--no-validate      # Skip schema validation
--force            # Force execution even if checks fail
```

---

## Programmatic API

### Basic Usage

```typescript
import { runWithTasks } from '@pixpilot/scaffoldfy';

// Run with tasks array
await runWithTasks(tasks, {
  dryRun: false,
  force: false,
  tasksFilePath: './template-tasks.json',
});
```

### With Options

```typescript
await runWithTasks(tasks, {
  dryRun: true, // Preview mode
  force: false, // Don't force execution
  tasksFilePath: './my-tasks.json',
  variables: [], // Optional global variables
  prompts: [], // Optional global prompts
});
```

### Error Handling

```typescript
import { runWithTasks } from '@pixpilot/scaffoldfy';

try {
  await runWithTasks(tasks, {
    dryRun: false,
    tasksFilePath: './template-tasks.json',
  });
  console.log('✅ Tasks completed successfully!');
} catch (error) {
  console.error('❌ Task execution failed:', error.message);
}
```

---

## Quick Tips

### 💡 Best Practices

1. **Always use `--dry-run` first** to preview changes
2. **Use descriptive task IDs** for better error messages
3. **Set `required: false`** for optional tasks that shouldn't stop execution
4. **Use dependencies** to ensure tasks run in the correct order
5. **Validate your template** with the JSON schema for IntelliSense

### 🔥 Common Gotchas

- **Template syntax**: Use `{{variableName}}` not `${variableName}`
- **File paths**: Always use forward slashes `/` even on Windows
- **JSON escaping**: Escape quotes in JSON: `\"` or use template files
- **Task order**: Tasks run in array order unless dependencies specified
- **Prompt IDs**: Must be unique across all prompts

### 📦 Template File Formats

Scaffoldfy supports multiple formats:

- **JSON**: `.json` files (most common)
- **TypeScript**: `.ts` files (for dynamic templates)
- **Remote URLs**: HTTP/HTTPS URLs (for shared templates)

---

## Next Steps

### Learn More

- **[Getting Started Guide](GETTING_STARTED.html)** - Detailed installation and setup
- **[Task Types Reference](TASK_TYPES.html)** - Complete list of all task types
- **[Interactive Prompts](PROMPTS.html)** - Detailed prompt configuration
- **[Advanced Features](FEATURES.html)** - Conditional execution, Handlebars, etc.

### Example Templates

Check the `examples/` directory for complete working templates:

- `base-node-template.json` - Basic Node.js project
- `template-tasks-with-handlebars.json` - Using Handlebars templates
- `template-tasks-with-inheritance.json` - Template composition
- `template-tasks-with-plugin.json` - Custom plugin example

---

## Need Help?

- 📖 **[Full Documentation](index.html)** - Complete guides and references
- 🐛 **[Report Issues](https://github.com/pixpilot/scaffoldfy/issues)** - Found a bug?
- 💬 **[GitHub Discussions](https://github.com/pixpilot/scaffoldfy/discussions)** - Ask questions

---

**Ready to start?** Run your first template:

```bash
scaffoldfy --dry-run
```
