# Quick Reference: Embedded Prompts in Tasks

## Prompt Structure

Every prompt needs:

- `id` - Unique identifier (must be a valid JavaScript identifier: letters, digits, underscores, and `$`, cannot start with a digit)
- `type` - Prompt type (input, password, number, select, confirm)
- `message` - Question to display to user

#---
layout: default
title: Prompts Quick Reference - Scaffoldfy

---

# Prompts Quick Reference

### Input

```json
{
  "id": "projectName",
  "type": "input",
  "message": "Project name?",
  "default": "my-project",
  "required": true
}
```

### Password

```json
{
  "id": "apiKey",
  "type": "password",
  "message": "Enter API key",
  "required": true
}
```

### Number

```json
{
  "id": "port",
  "type": "number",
  "message": "Port number?",
  "default": 3000,
  "min": 1024,
  "max": 65535
}
```

### Select

```json
{
  "id": "framework",
  "type": "select",
  "message": "Choose framework",
  "choices": [
    { "name": "React", "value": "react" },
    { "name": "Vue", "value": "vue" }
  ],
  "default": "react"
}
```

### Confirm

```json
{
  "id": "includeTests",
  "type": "confirm",
  "message": "Include tests?",
  "default": true
}
```

## Using Prompt Values

Values are available via template interpolation:

```json
{
  "config": {
    "file": "package.json",
    "updates": {
      "name": "{{projectName}}",
      "version": "{{projectVersion}}",
      "port": "{{port}}"
    }
  }
}
```

## Minimal Example

```json
{
  "tasks": [
    {
      "id": "setup",
      "name": "Setup",
      "description": "Configure project",
      "required": true,
      "enabled": true,
      "type": "update-json",
      "prompts": [
        {
          "id": "appName",
          "type": "input",
          "message": "App name?",
          "required": true
        }
      ],
      "config": {
        "file": "package.json",
        "updates": {
          "name": "{{appName}}"
        }
      }
    }
  ]
}
```

## Common Properties

| Property   | Types                          | Description                              |
| ---------- | ------------------------------ | ---------------------------------------- |
| `id`       | all                            | Unique identifier for the value          |
| `type`     | all                            | input, password, number, select, confirm |
| `message`  | all                            | Question text                            |
| `required` | all                            | Force non-empty value                    |
| `global`   | all                            | If true, value is available to all tasks |
| `default`  | input, number, select, confirm | Default value                            |
| `min`      | number                         | Minimum value                            |
| `max`      | number                         | Maximum value                            |
| `choices`  | select                         | Array of {name, value} objects           |

## Global Prompts

Mark prompts as `"global": true` to share values across all tasks:

```json
{
  "prompts": [
    {
      "id": "projectName",
      "type": "input",
      "message": "Project name?",
      "global": true
    }
  ]
}
```

- Global prompts are collected once at the beginning
- Values are available to all tasks, not just the task where defined
- Useful for project-wide settings (name, version, author, etc.)

## Validation Rules

- ✅ IDs must be unique across all tasks (except global prompts can be duplicated)
- ✅ IDs must be valid JavaScript identifiers (letters, digits, underscores, `$`, cannot start with digit or contain hyphens)
- ✅ Messages cannot be empty
- ✅ A prompt ID cannot be both global and task-specific
- ✅ Select must have at least one choice
- ✅ Number min must be ≤ max
- ✅ Required prompts reject empty values

## See Also

- Full documentation: `docs/PROMPTS.md`
- Example files:
  - `examples/template-tasks-with-prompts.json`
  - `examples/template-tasks-with-global-prompts.json`
- Feature summary: `PROMPTS_FEATURE.md`
