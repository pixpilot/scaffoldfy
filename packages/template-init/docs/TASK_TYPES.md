# Task Types Reference

Complete reference for all available task types in template-init.

## update-json

Update JSON files with new values. Supports nested properties using dot notation.

### Configuration

```typescript
{
  string; // Path to JSON file
  Record<string, unknown>; // Key-value pairs to update
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

### Features

- Nested property updates using dot notation (e.g., `"scripts.test"`)
- Template variable interpolation
- Preserves JSON formatting
- Deep object merging

---

## template

Create or overwrite files from templates with variable interpolation.

### Configuration

```typescript
{
  string; // Path to file to create/overwrite
  string; // Template string with {{variables}}
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

### Features

- Full template variable interpolation
- Creates directories if needed
- Overwrites existing files

---

## regex-replace

Replace text in files using regular expressions.

### Configuration

```typescript
interface Config {
  file: string /* Path to file to modify */;
  pattern: string /* Regular expression pattern */;
  replacement: string /* Replacement string */;
  flags?: string /* Regex flags (g, i, m, etc.) */;
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

### Features

- Full regex support
- Optional flags (global, case-insensitive, multiline)
- Template variables in replacement strings

---

## replace-in-file

Simple find and replace in files (string literal matching).

### Configuration

```typescript
{
  string;
  Array<{
    find: string; // String to find
    replace: string; // String to replace with
  }>;
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

### Features

- Multiple replacements in single file
- Global replacement (all occurrences)
- Template variable interpolation
- Skips non-existent files gracefully

---

## delete

Delete files or directories.

### Configuration

```typescript
interface Config {
  paths: string[];
}
```

### Example

```json
{
  "type": "delete",
  "config": {
    "paths": ["coverage", "dist", "temp", "node_modules/.cache"]
  }
}
```

### Features

- Recursive directory deletion
- Multiple paths in single task
- Skips non-existent paths
- Force deletion (no confirmation)

---

## conditional-delete

Delete files or directories based on condition evaluation.

### Configuration

```typescript
interface Config {
  condition: string;
  paths: string[];
}
```

### Example

```json
{
  "type": "conditional-delete",
  "config": {
    "condition": "!keepExamplePackages",
    "paths": ["packages/example", "examples"]
  }
}
```

### Features

- JavaScript expression evaluation
- Access to all config variables
- Supports boolean logic (`!`, `&&`, `||`)
- Skips deletion if condition is false

---

## rename

Rename or move files and directories.

### Configuration

```typescript
{
  string; // Current path
  string; // New path
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

### Features

- Template variable interpolation in paths
- Works with files and directories
- Creates parent directories if needed
- Skips if source doesn't exist

---

## git-init

Initialize a new git repository.

### Configuration

```typescript
interface Config {
  removeExisting: boolean;
  initialCommit: boolean;
  message?: string;
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

### Features

- Clean slate: removes old git history
- Optional initial commit
- Custom commit message
- Stages all files if creating initial commit

---

## exec

Execute shell commands.

### Configuration

```typescript
interface Config {
  command: string;
  cwd?: string;
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

### Features

- Full shell command support
- Template variable interpolation
- Custom working directory
- Captures stdout/stderr
- Returns exit code

### Security Note

Be careful with exec tasks as they can run arbitrary commands. Only use in trusted task files.

---

## Common Features Across All Tasks

### Template Variables

All task configs support template variable interpolation using `{{variable}}` syntax:

- `{{repoName}}`
- `{{repoOwner}}`
- `{{repoUrl}}`
- `{{author}}`
- `{{baseRepoUrl}}`
- `{{defaultBundler}}`
- `{{orgName}}`
- `{{keepExamplePackages}}`

### Error Handling

- **Required tasks**: Stop execution on failure
- **Non-required tasks**: Log warning and continue
- **File not found**: Most tasks handle gracefully
- **Invalid config**: Validation error before execution

### Dry Run Mode

All tasks respect `--dry-run` flag:

- Show what would be done
- No actual file system changes
- No command execution
- Validates configuration

---

## Task Type Selection Guide

| Use Case                  | Task Type            |
| ------------------------- | -------------------- |
| Update package.json       | `update-json`        |
| Create new files          | `template`           |
| Find and replace (regex)  | `regex-replace`      |
| Find and replace (simple) | `replace-in-file`    |
| Remove files/folders      | `delete`             |
| Conditional removal       | `conditional-delete` |
| Rename/move files         | `rename`             |
| Reset git history         | `git-init`           |
| Run commands              | `exec`               |
