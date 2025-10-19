# Task Types Reference

Complete reference for all available task types in template-init.

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
      "name": "{{repoName}}",
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
}
```

### Example

```json
{
  "type": "template",
  "config": {
    "file": "README.md",
    "template": "# {{repoName}}\n\nAuthor: {{author}}\n\nRepository: {{baseRepoUrl}}"
  }
}
```

### Conditional Example

```json
{
  "type": "template",
  "config": {
    "file": "CONTRIBUTING.md",
    "template": "# Contributing Guide\n\nThank you for contributing!",
    "condition": "includeContributing === true"
  }
}
```

### Features

- Full template variable interpolation
- Creates directories if needed
- Overwrites existing files
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
    "replacement": "{{repoName}}",
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
      { "find": "template-name", "replace": "{{repoName}}" },
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
    "to": "{{repoName}}.config.js"
  }
}
```

### Conditional Example

```json
{
  "type": "rename",
  "config": {
    "from": "example.config.js",
    "to": "{{repoName}}.config.js",
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

- `{{repoName}}`
- `{{repoOwner}}`
- `{{repoUrl}}`
- `{{author}}`
- `{{baseRepoUrl}}`
- `{{orgName}}`
- Custom variables from prompts (e.g., `{{keepExamplePackages}}`)

### Error Handling

- **Required tasks**: Stop execution on failure
- **Non-required tasks**: Log warning and continue
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

| Use Case                      | Task Type                                 |
| ----------------------------- | ----------------------------------------- |
| Update package.json           | `update-json`                             |
| Create new files              | `template`                                |
| Find and replace (regex)      | `regex-replace`                           |
| Find and replace (simple)     | `replace-in-file`                         |
| Remove files/folders          | `delete`                                  |
| Conditional operations        | Any task type (with `condition`)          |
| Rename/move files             | `rename`                                  |
| Reset git history             | `git-init`                                |
| Run commands                  | `exec`                                    |
| Execute only when user agrees | Any task type (with prompt + `condition`) |
