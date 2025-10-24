---
layout: default
title: Task Types Reference - Scaffoldfy
---

# Task Types Reference

Complete reference for all available task types in scaffoldfy.

## Task Structure

Every task has the following properties:

### Required Properties

- **`id`** (string): Unique identifier for the task
- **`name`** (string): Human-readable task name
- **`type`** (string): Task type (see below for all available types)

### Optional Properties

- **`description`** (string): Detailed description of what the task does. Defaults to empty string if omitted.
- **`required`** (boolean): Whether failure of this task should stop the process. Defaults to `true` if omitted. Set to `false` for non-critical tasks.
- **`enabled`** (boolean | string | object): Whether this task should execute. Defaults to `true` if omitted. Can be a boolean, a string expression, or conditional expression object (see below).
- **`config`** (object): Task-specific configuration (varies by task type)
- **`dependencies`** (string[]): IDs of tasks that must run before this one
- **`rollback`** (object): How to rollback if something fails
- **`prompts`** (array): Task-scoped prompts to collect before running task
- **`variables`** (array): Task-scoped variables (not available to other tasks)
- **`override`** (string): Merge strategy when extending templates (`'merge'` or `'replace'`)

### Minimal Task Example

```json
{
  "id": "my-task",
  "name": "My Task",
  "type": "write",
  "config": {
    "file": "README.md",
    "template": "# My Project"
  }
}
```

This will use defaults: `description: ""`, `required: true`, `enabled: true`.

## Conditional Task Execution

Tasks can be conditionally enabled using the `enabled` field. This allows you to dynamically skip or run tasks based on runtime conditions.

### Enabled Field

The `enabled` field can be:

1. **Omitted** (default): Task is always enabled (defaults to `true`)
2. **Simple boolean**: `true` or `false`
3. **String expression**: Direct JavaScript expression (shorthand for `{ "condition": "..." }`)
4. **Conditional object**: `{ "condition": "JavaScript expression" }`
5. **Executable object**: `{ "type": "exec", "value": "shell command" }` - Run a command to determine enabled state

### Simple Boolean

```json
{
  "id": "my-task",
  "name": "My Task",
  "enabled": true,
  "type": "write",
  "config": {
    "file": "README.md",
    "template": "# My Project"
  }
}
```

### String Expression (Shorthand)

You can use a string directly as a condition expression:

```json
{
  "id": "typescript-setup",
  "name": "Setup TypeScript",
  "enabled": "useTypeScript === true",
  "type": "write",
  "config": {
    "file": "tsconfig.json",
    "template": "{ \"compilerOptions\": {} }"
  }
}
```

This is equivalent to using the conditional object syntax but more concise.

### Conditional Enabled

```json
{
  "id": "typescript-setup",
  "name": "Setup TypeScript",
  "enabled": {
    "condition": "useTypeScript === true"
  },
  "type": "write",
  "config": {
    "file": "tsconfig.json",
    "template": "{ \"compilerOptions\": {} }"
  }
}
```

### Executable Enabled

Run a shell command to determine if the task should be enabled:

```json
{
  "id": "git-hooks-setup",
  "name": "Setup Git Hooks",
  "enabled": {
    "type": "exec",
    "value": "git rev-parse --is-inside-work-tree"
  },
  "type": "exec",
  "config": {
    "command": "npx husky install"
  }
}
```

The command output is parsed as a boolean:

- Empty string, `"0"`, `"false"`, or `"no"` (case-insensitive) = `false`
- Everything else = `true`
- Failed commands = `false`

### How Conditional Enabled Works

1. Conditions are **JavaScript expressions** evaluated at runtime
2. The expression has access to:
   - All prompt values (both top-level and task-level)
   - All variable values (both global and task-scoped)
   - All config values
3. If the condition evaluates to `false`, the task is **completely skipped**
4. If the condition evaluates to `true`, the task proceeds normally

**Evaluation Timing:**

- Tasks are evaluated **twice** during execution:
  1. **Initial filter (lazy mode)**: Before prompts are collected. Tasks with conditions referencing undefined prompts or exec commands are **included** (not filtered out yet).
  2. **Final filter (strict mode)**: After all prompts and variables are collected. Tasks are evaluated with the full context (including exec command execution), and only enabled tasks are executed.

This two-phase approach allows you to use prompt values in task `enabled` conditions without errors. Tasks referencing prompts that don't exist yet or using exec commands will be temporarily included, then properly filtered once all user input is collected and commands are executed.

### Examples

#### Enable Based on Prompt Value

Using string expression (shorthand):

```json
{
  "prompts": [
    {
      "id": "useTypeScript",
      "type": "confirm",
      "message": "Use TypeScript?",
      "default": true
    }
  ],
  "tasks": [
    {
      "id": "setup-typescript",
      "name": "Setup TypeScript",
      "enabled": "useTypeScript === true",
      "type": "write",
      "config": {
        "file": "tsconfig.json",
        "template": "{ \"compilerOptions\": {} }"
      }
    }
  ]
}
```

Using conditional object (verbose):

```json
{
  "prompts": [
    {
      "id": "useTypeScript",
      "type": "confirm",
      "message": "Use TypeScript?",
      "default": true
    }
  ],
  "tasks": [
    {
      "id": "setup-typescript",
      "name": "Setup TypeScript",
      "enabled": {
        "condition": "useTypeScript === true"
      },
      "type": "write",
      "config": {
        "file": "tsconfig.json",
        "template": "{ \"compilerOptions\": {} }"
      }
    }
  ]
}
```

#### Complex Conditional Logic

Using string expression:

```json
{
  "id": "setup-ci",
  "name": "Setup CI/CD",
  "enabled": "includeCI === true && (platform === 'github' || platform === 'gitlab')",
  "type": "write",
  "config": {
    "file": ".github/workflows/ci.yml",
    "template": "name: CI"
  }
}
```

Using conditional object:

```json
{
  "id": "setup-ci",
  "name": "Setup CI/CD",
  "enabled": {
    "condition": "includeCI === true && (platform === 'github' || platform === 'gitlab')"
  },
  "type": "write",
  "config": {
    "file": ".github/workflows/ci.yml",
    "template": "name: CI"
  }
}
```

## Task Config Conditions

Individual task configs also support a `condition` field that determines whether the task operations should execute. The condition is a JavaScript expression evaluated at runtime with access to all prompt values and variables.

**Type:** `ConditionExpression` (string)

**Examples:**

- `"useTypeScript === true"`
- `"nodeVersion >= 16 && includeTests === true"`
- `"packageManager === 'pnpm'"`
- `"!keepExampleCode"`

If the config condition evaluates to `false`, the task will be skipped. If omitted, the task will always execute (when enabled).

**Note:** The difference between `enabled` and `config.condition`:

- `enabled`: Controls whether the task runs at all (evaluated before the task)
- `config.condition`: Controls whether the task's operations execute (evaluated during the task)

In most cases, use `enabled` for conditional task execution.

## update-json

Update JSON files with new values. Supports nested properties using dot notation.

### Configuration

```typescript
interface Config {
  file: string; // Path to JSON file
  updates: Record<string, unknown>; // Key-value pairs to update
  condition?: string; // Optional: only execute if condition evaluates to true
}
```

### Example

```json
{
  "type": "update-json",
  "config": {
    "file": "package.json",
    "updates": {
      "name": "{{projectName}}",
      "scripts.test": "vitest",
      "repository.url": "{{repoUrl}}"
    }
  }
}
```

### Conditional Example

```json
{
  "type": "update-json",
  "config": {
    "file": "package.json",
    "updates": {
      "private": true
    },
    "condition": "makePrivate === true"
  }
}
```

### Features

- Nested property updates using dot notation (e.g., `"scripts.test"`)
- Template variable interpolation
- Preserves JSON formatting
- Deep object merging
- **Optional condition:** JavaScript expression evaluation (skips task if false)

---

## template

Create or overwrite files from templates with variable interpolation.

### Configuration

```typescript
interface Config {
  file: string; // Path to file to create/overwrite
  template: string; // Template string with {{variables}}
  condition?: string; // Optional: only execute if condition evaluates to true
  allowCreate?: boolean; // Optional: whether to allow creating the file if it doesn't exist (default: true)
}
```

### Example

```json
{
  "type": "write",
  "config": {
    "file": "README.md",
    "template": "# {{projectName}}\n\nAuthor: {{author}}\n\nRepository: {{repoUrl}}"
  }
}
```

### Conditional Example

```json
{
  "type": "write",
  "config": {
    "file": "CONTRIBUTING.md",
    "template": "# Contributing Guide\n\nThank you for contributing!",
    "condition": "includeContributing === true"
  }
}
```

### Prevent File Creation Example

```json
{
  "type": "write",
  "config": {
    "file": "existing-file.md",
    "template": "This will only be written if the file already exists",
    "allowCreate": false
  }
}
```

### Features

- Full template variable interpolation
- Creates directories if needed
- Overwrites existing files
- **Optional condition:** JavaScript expression evaluation (skips task if false)
- **Optional allowCreate:** Control whether to create files that don't exist (default: true)

---

## create

Create new files with optional content. Similar to `template` but specifically designed for file creation, with support for both inline content and external template files.

### Configuration

```typescript
interface Config {
  file: string; // Path to file to create
  template?: string; // Inline template string (supports simple {{variable}} syntax)
  templateFile?: string; // Path to external template file (relative to project root). .hbs files use Handlebars automatically
  condition?: string; // Optional: only execute if condition evaluates to true
}
```

### Example: Inline Template

```json
{
  "type": "create",
  "config": {
    "file": "README.md",
    "template": "# {{projectName}}\n\nAuthor: {{author}}\n\nRepository: {{repoUrl}}"
  }
}
```

### Example: External Template File

```json
{
  "type": "create",
  "config": {
    "file": "src/config.ts",
    "templateFile": "templates/config.template.ts"
  }
}
```

### Example: Handlebars Template

```json
{
  "type": "create",
  "config": {
    "file": "README.md",
    "templateFile": "templates/readme.hbs"
  }
}
```

When using a `.hbs` file, Handlebars syntax is automatically used. Otherwise, simple `{{variable}}` interpolation is used.

### Conditional Example

```json
{
  "type": "create",
  "config": {
    "file": "CONTRIBUTING.md",
    "template": "# Contributing Guide\n\nThank you for contributing!",
    "condition": "includeContributing === true"
  }
}
```

### Features

- Creates files with optional content
- Supports **inline templates** via `template` property
- Supports **external template files** via `templateFile` property
- Automatic Handlebars support for `.hbs` files
- Simple `{{variable}}` interpolation for non-Handlebars templates
- Creates parent directories if needed
- Skips if file already exists (won't overwrite)
- **Optional condition:** JavaScript expression evaluation (skips task if false)

---

## regex-replace

Replace text in files using regular expressions.

### Configuration

```typescript
interface Config {
  file: string; // Path to file to modify
  pattern: string; // Regular expression pattern
  replacement: string; // Replacement string
  flags?: string; // Regex flags (g, i, m, etc.)
  condition?: string; // Optional: only execute if condition evaluates to true
}
```

### Example

```json
{
  "type": "regex-replace",
  "config": {
    "file": ".github/workflows/ci.yml",
    "pattern": "old-repo-name",
    "replacement": "{{projectName}}",
    "flags": "g"
  }
}
```

### Conditional Example

```json
{
  "type": "regex-replace",
  "config": {
    "file": "README.md",
    "pattern": "\\[DRAFT\\]\\s*",
    "replacement": "",
    "flags": "g",
    "condition": "!isDraft"
  }
}
```

### Features

- Full regex support
- Optional flags (global, case-insensitive, multiline)
- Template variables in replacement strings
- **Optional condition:** JavaScript expression evaluation (skips task if false)

---

## replace-in-file

Simple find and replace in files (string literal matching).

### Configuration

```typescript
interface Config {
  file: string;
  replacements: Array<{
    find: string; // String to find
    replace: string; // String to replace with
  }>;
  condition?: string; // Optional: only execute if condition evaluates to true
}
```

### Example

```json
{
  "type": "replace-in-file",
  "config": {
    "file": "CONTRIBUTING.md",
    "replacements": [
      { "find": "template-name", "replace": "{{projectName}}" },
      { "find": "template-author", "replace": "{{author}}" }
    ]
  }
}
```

### Conditional Example

```json
{
  "type": "replace-in-file",
  "config": {
    "file": "README.md",
    "replacements": [{ "find": "[BETA]", "replace": "" }],
    "condition": "!isBeta"
  }
}
```

### Features

- Multiple replacements in single file
- Global replacement (all occurrences)
- Template variable interpolation
- Skips non-existent files gracefully
- **Optional condition:** JavaScript expression evaluation (skips task if false)

---

## delete

Delete files or directories, optionally based on condition evaluation.

### Configuration

```typescript
interface Config {
  paths: string[];
  condition?: string; // Optional: only delete if condition evaluates to true
}
```

### Example

Basic deletion:

```json
{
  "type": "delete",
  "config": {
    "paths": ["coverage", "dist", "temp", "node_modules/.cache"]
  }
}
```

Conditional deletion:

```json
{
  "type": "delete",
  "config": {
    "condition": "!keepExamplePackages",
    "paths": ["packages/example", "examples"]
  }
}
```

### Features

- Recursive directory deletion
- Multiple paths in single task
- Skips non-existent paths
- Force deletion (no confirmation)
- **Optional condition:** JavaScript expression evaluation
- **Condition context:** Access to all config variables (including prompt values)
- **Conditional logic:** Supports boolean logic (`!`, `&&`, `||`)
- Skips deletion if condition is false or invalid

**Note:** When using conditions, you can reference values from task prompts. For example, if you have a confirm prompt with `id: "keepExamplePackages"`, you can use `!keepExamplePackages` in your condition to delete when the user answers "No".

---

## rename

Rename or move files and directories.

### Configuration

```typescript
interface Config {
  from: string; // Current path
  to: string; // New path
  condition?: string; // Optional: only execute if condition evaluates to true
}
```

### Example

```json
{
  "type": "rename",
  "config": {
    "from": "template.config.js",
    "to": "{{projectName}}.config.js"
  }
}
```

### Conditional Example

```json
{
  "type": "rename",
  "config": {
    "from": "example.config.js",
    "to": "{{projectName}}.config.js",
    "condition": "useCustomConfig === true"
  }
}
```

### Features

- Template variable interpolation in paths
- Works with files and directories
- Creates parent directories if needed
- Skips if source doesn't exist
- **Optional condition:** JavaScript expression evaluation (skips task if false)

---

## move

Move files or directories from one location to another.

### Configuration

```typescript
interface Config {
  from: string; // Source path
  to: string; // Destination path
  condition?: string; // Optional: only execute if condition evaluates to true
}
```

### Example

```json
{
  "type": "move",
  "config": {
    "from": "templates/example.config.js",
    "to": "config/{{projectName}}.config.js"
  }
}
```

### Conditional Example

```json
{
  "type": "move",
  "config": {
    "from": "temp/generated-files",
    "to": "src/generated",
    "condition": "useGenerated === true"
  }
}
```

### Features

- Template variable interpolation in paths
- Works with files and directories
- Creates parent directories if needed
- Skips if source doesn't exist
- Original file is removed (moved, not copied)
- **Optional condition:** JavaScript expression evaluation (skips task if false)

---

## copy

Copy files or directories from one location to another. Unlike `move`, the original files remain intact.

### Configuration

```typescript
interface Config {
  from: string; // Source path
  to: string; // Destination path
  condition?: string; // Optional: only execute if condition evaluates to true
}
```

### Example

```json
{
  "type": "copy",
  "config": {
    "from": "templates/base-structure",
    "to": "src/"
  }
}
```

### Conditional Example

```json
{
  "type": "copy",
  "config": {
    "from": "examples/sample-files",
    "to": "examples/",
    "condition": "includeExamples === true"
  }
}
```

### Features

- Template variable interpolation in paths
- Works with files and directories
- Recursive directory copying
- Creates parent directories if needed
- Skips if source doesn't exist
- Original files remain intact (copied, not moved)
- **Optional condition:** JavaScript expression evaluation (skips task if false)

---

## append

Append content to existing files. Useful for adding entries to `.gitignore`, `README.md`, or other configuration files.

### Configuration

```typescript
interface Config {
  file: string; // Target file path
  content?: string; // Inline content (supports {{variable}} syntax)
  template?: string; // Alias for content
  templateFile?: string; // Path to external template file (.hbs files use Handlebars)
  newline?: boolean; // Add newline before appending (default: true)
  condition?: string; // Optional: only execute if condition evaluates to true
}
```

### Example

```json
{
  "type": "append",
  "config": {
    "file": ".gitignore",
    "content": "\n# Custom ignores\n*.local\n.env\n"
  }
}
```

### With Template Variables

```json
{
  "type": "append",
  "config": {
    "file": "README.md",
    "template": "\n## {{projectName}}\n\nCreated by {{author}}\n"
  }
}
```

### With Template File

```json
{
  "type": "append",
  "config": {
    "file": "CHANGELOG.md",
    "templateFile": "templates/changelog-entry.md"
  }
}
```

### Without Newline

```json
{
  "type": "append",
  "config": {
    "file": "inline-data.txt",
    "content": ", more data",
    "newline": false
  }
}
```

### Conditional Example

```json
{
  "type": "append",
  "config": {
    "file": ".gitignore",
    "content": "\n# IDE files\n.vscode/\n.idea/\n",
    "condition": "includeIDEIgnores === true"
  }
}
```

### Features

- Template variable interpolation in content
- Support for both inline content and template files
- Handlebars support for `.hbs` template files
- Creates file if it doesn't exist
- Automatically adds newline before content if file doesn't end with one (unless `newline: false`)
- Support for both `content` and `template` fields (aliases)
- **Optional condition:** JavaScript expression evaluation (skips task if false)

---

## mkdir

Create directory structure. Useful for setting up project scaffolding.

### Configuration

```typescript
interface Config {
  path: string; // Directory path to create
  condition?: string; // Optional: only execute if condition evaluates to true
}
```

### Example

```json
{
  "type": "mkdir",
  "config": {
    "path": "src/components/ui"
  }
}
```

### Multiple Directories Example

Use multiple tasks to create several directories:

```json
{
  "tasks": [
    {
      "id": "create-src",
      "name": "Create src directory",
      "type": "mkdir",
      "config": {
        "path": "src"
      }
    },
    {
      "id": "create-tests",
      "name": "Create tests directory",
      "type": "mkdir",
      "config": {
        "path": "tests"
      }
    }
  ]
}
```

### Conditional Example

```json
{
  "type": "mkdir",
  "config": {
    "path": "src/e2e-tests",
    "condition": "includeE2ETests === true"
  }
}
```

### Features

- Template variable interpolation in paths
- Recursive directory creation (creates parent directories automatically)
- Handles existing directories gracefully (no error)
- Cross-platform path support
- **Optional condition:** JavaScript expression evaluation (skips task if false)

---

## git-init

Initialize a new git repository.

### Configuration

```typescript
interface Config {
  removeExisting: boolean;
  initialCommit: boolean;
  message?: string;
  condition?: string; // Optional: only execute if condition evaluates to true
}
```

### Example

```json
{
  "type": "git-init",
  "config": {
    "removeExisting": true,
    "initialCommit": true,
    "message": "feat: initial project setup"
  }
}
```

### Conditional Example

```json
{
  "type": "git-init",
  "config": {
    "removeExisting": true,
    "initialCommit": true,
    "message": "feat: initial project setup",
    "condition": "initializeGit === true"
  }
}
```

### Features

- Clean slate: removes old git history
- Optional initial commit
- Custom commit message
- Stages all files if creating initial commit
- **Optional condition:** JavaScript expression evaluation (skips task if false)

---

## exec

Execute shell commands.

### Configuration

```typescript
interface Config {
  command: string;
  cwd?: string;
  condition?: string; // Optional: only execute if condition evaluates to true
}
```

### Example

```json
{
  "type": "exec",
  "config": {
    "command": "pnpm install && pnpm build",
    "cwd": "./"
  }
}
```

### Conditional Example

```json
{
  "type": "exec",
  "config": {
    "command": "npm run generate-docs",
    "condition": "includeDocs === true"
  }
}
```

### Features

- Full shell command support
- Template variable interpolation
- Custom working directory
- Captures stdout/stderr
- Returns exit code
- **Optional condition:** JavaScript expression evaluation (skips task if false)

### Security Note

Be careful with exec tasks as they can run arbitrary commands. Only use in trusted task files.

---

## Common Features Across All Tasks

### Conditional Execution

**All task types** now support optional conditional execution via the `condition?: string` field:

```typescript
let condition: string; // JavaScript expression that evaluates to true/false
```

**How it works:**

- Add a `condition` field to any task config
- The condition is a JavaScript expression evaluated with config variables
- Task executes only if condition evaluates to `true`
- Task is skipped if condition evaluates to `false` or is invalid
- Access to all config variables (including prompt values)

**Example:**

```json
{
  "type": "update-json",
  "config": {
    "file": "package.json",
    "updates": { "private": true },
    "condition": "makePrivate === true"
  }
}
```

**Supported operators:**

- Comparison: `===`, `!==`, `>`, `<`, `>=`, `<=`
- Logical: `&&`, `||`, `!`
- Ternary: `condition ? true : false`
- Property access: `config.value`

**Common patterns:**

- `"condition": "!keepExamples"` - Skip if keepExamples is false
- `"condition": "environment === 'production'"` - Only in production
- `"condition": "includeTests && !skipLinting"` - Multiple conditions
- `"condition": "version >= 2"` - Numeric comparison

### Template Variables

All task configs support template variable interpolation using `{{variable}}` syntax:

- `{{projectName}}`
- `{{owner}}`
- `{{repoUrl}}`
- `{{author}}`
- `{{repoUrl}}`
- `{{orgName}}`
- Custom variables from prompts (e.g., `{{keepExamplePackages}}`)

### Error Handling

- **Required tasks** (default): Stop execution on failure
- **Non-required tasks** (`required: false`): Log warning and continue
- **File not found**: Most tasks handle gracefully
- **Invalid config**: Validation error before execution
- **Invalid condition**: Task is skipped with warning

### Dry Run Mode

All tasks respect `--dry-run` flag:

- Show what would be done
- No actual file system changes
- No command execution
- Validates configuration

---

## Task Type Selection Guide

| Use Case                           | Task Type                                |
| ---------------------------------- | ---------------------------------------- |
| Update package.json                | `update-json`                            |
| Create new files (overwrite ok)    | `write`                                  |
| Create new files (don't overwrite) | `create`                                 |
| Create from external template      | `create` (with `templateFile`)           |
| Create with Handlebars template    | `create` (with `.hbs` file)              |
| Find and replace (regex)           | `regex-replace`                          |
| Find and replace (simple)          | `replace-in-file`                        |
| Remove files/folders               | `delete`                                 |
| Conditional operations             | Any task type (with `enabled.condition`) |
| Rename/move files                  | `rename`                                 |
| Move files (relocate)              | `move`                                   |
| Copy files/folders                 | `copy`                                   |
| Append to existing files           | `append`                                 |
| Create directories                 | `mkdir`                                  |
| Reset git history                  | `git-init`                               |
| Run commands                       | `exec`                                   |
| Execute only when user agrees      | Any task type (with prompt + `enabled`)  |
