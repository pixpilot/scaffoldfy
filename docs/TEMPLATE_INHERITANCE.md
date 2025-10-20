# Template Inheritance

Template inheritance allows you to extend base templates, promoting code reuse and modularity in your template configurations.

## Overview

With template inheritance, you can:

- **Extend one or more base templates** using the `extends` field
- **Override tasks** from base templates by using the same task ID
- **Merge configurations** intelligently, combining dependencies and prompts
- **Create reusable template libraries** that can be shared across projects

## Basic Usage

### Single Inheritance

Create a base template:

```json
// base-template.json
{
  "tasks": [
    {
      "id": "update-package",
      "name": "Update package.json",
      "description": "Update package information",
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

Extend it in your template:

```json
// my-template.json
{
  "extends": "base-template.json",
  "tasks": [
    {
      "id": "cleanup-readme",
      "name": "Clean up README",
      "description": "Remove template instructions",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": {
        "file": "README.md",
        "template": "# {{repoName}}\n\nYour project description here."
      }
    }
  ]
}
```

The resulting template will have both tasks from the base and your custom task.

### Multiple Inheritance

You can extend multiple base templates:

```json
{
  "extends": ["base-common.json", "base-typescript.json"],
  "tasks": [
    {
      "id": "custom-task",
      "name": "Custom Task",
      "description": "Project-specific task",
      "required": true,
      "enabled": true,
      "type": "exec",
      "config": {
        "command": "echo 'Setup complete!'"
      }
    }
  ]
}
```

Tasks are merged in order, with later templates taking precedence.

## Task Overriding

If a child template defines a task with the same ID as a base template, the child's task completely replaces the base task:

```json
// base.json
{
  "tasks": [
    {
      "id": "setup-git",
      "name": "Initialize Git",
      "description": "Initialize git repository",
      "required": true,
      "enabled": true,
      "type": "git-init",
      "config": {
        "removeExisting": false,
        "initialCommit": true
      }
    }
  ]
}

// child.json
{
  "extends": "base.json",
  "tasks": [
    {
      "id": "setup-git",
      "name": "Custom Git Setup",
      "description": "Custom git initialization",
      "required": true,
      "enabled": true,
      "type": "git-init",
      "config": {
        "removeExisting": true,
        "initialCommit": true,
        "message": "🎉 Initial commit"
      }
    }
  ]
}
```

The child's `setup-git` task completely replaces the base version.

## Dependency and Prompt Merging

When overriding a task, dependencies and prompts are intelligently merged:

```json
// base.json
{
  "tasks": [
    {
      "id": "complex-task",
      "name": "Complex Task",
      "description": "Task with dependencies",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": {},
      "dependencies": ["task-a"],
      "prompts": [
        {
          "id": "prompt1",
          "type": "input",
          "message": "Enter value 1"
        }
      ]
    }
  ]
}

// child.json
{
  "extends": "base.json",
  "tasks": [
    {
      "id": "complex-task",
      "name": "Enhanced Complex Task",
      "description": "Enhanced version",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": { "enhanced": true },
      "dependencies": ["task-b", "task-c"],
      "prompts": [
        {
          "id": "prompt2",
          "type": "confirm",
          "message": "Enable feature?"
        }
      ]
    }
  ]
}
```

The resulting task will have:

- **Dependencies**: `["task-a", "task-b", "task-c"]` (merged and deduplicated)
- **Prompts**: Both `prompt1` and `prompt2` (merged by ID)
- **Config**: `{ "enhanced": true }` (child overrides base)

## Relative Paths

Template paths in `extends` are resolved relative to the template file containing them:

```
templates/
├── base/
│   └── common.json
├── typescript/
│   └── ts-base.json  (extends: "../base/common.json")
└── my-project.json    (extends: "typescript/ts-base.json")
```

## Programmatic Usage

```typescript
import { loadAndMergeTemplate, loadTasksWithInheritance } from '@pixpilot/scaffoldfy';

// Load tasks with full inheritance resolution
const tasks = await loadTasksWithInheritance('./my-template.json');

// Or load and get the full configuration
const config = await loadAndMergeTemplate('./my-template.json');
console.log(`Loaded ${config.tasks.length} tasks`);
```

## Advanced: Circular Dependency Detection

The system automatically detects and prevents circular dependencies:

```json
// template-a.json
{
  "extends": "template-b.json",
  "tasks": []
}

// template-b.json
{
  "extends": "template-a.json",  // ❌ Error: Circular dependency!
  "tasks": []
}
```

## Best Practices

1. **Create a library of base templates** for common project types
2. **Use descriptive task IDs** to make overriding intentional and clear
3. **Document what can be overridden** in your base templates
4. **Keep inheritance chains shallow** (2-3 levels max) for maintainability
5. **Version your base templates** if they're shared across projects
6. **Test inheritance chains** to ensure tasks merge as expected

## Example: Organization Template Library

```
org-templates/
├── base.json           # Common tasks for all projects
├── node-base.json      # Node.js specific (extends: base.json)
├── ts-base.json        # TypeScript specific (extends: node-base.json)
└── react-base.json     # React specific (extends: ts-base.json)
```

Your project template:

```json
{
  "extends": "../org-templates/react-base.json",
  "tasks": [
    {
      "id": "project-specific-setup",
      "name": "Project Setup",
      "description": "Custom setup for this project",
      "required": true,
      "enabled": true,
      "type": "exec",
      "config": {
        "command": "npm run setup"
      }
    }
  ]
}
```

## CLI Usage

The CLI automatically handles template inheritance:

```bash
# The template will be loaded with all inherited tasks
scaffoldfy --tasks-file ./my-template.json

# Dry run to see all inherited and merged tasks
scaffoldfy --tasks-file ./my-template.json --dry-run
```

## API Reference

### `loadTemplate(templatePath: string): Promise<TasksConfiguration>`

Load a single template file without processing inheritance.

### `loadAndMergeTemplate(templatePath: string): Promise<TasksConfiguration>`

Load a template and recursively merge all extended templates.

### `loadTasksWithInheritance(tasksFilePath: string): Promise<TaskDefinition[]>`

Load tasks from a file, processing all inheritance, and return the final task array.

### `mergeTemplates(templates: TasksConfiguration[]): TasksConfiguration`

Merge multiple template configurations manually.

### `clearTemplateCache(): void`

Clear the internal template cache (useful for testing).
