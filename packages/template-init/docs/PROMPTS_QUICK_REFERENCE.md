# Quick Reference: Embedded Prompts in Tasks

## Prompt Structure

Every prompt needs:

- `id` - Unique identifier (alphanumeric, underscores, hyphens)
- `type` - Prompt type (input, password, number, select, confirm)
- `message` - Question to display to user

## Prompt Types Quick Reference

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
| `default`  | input, number, select, confirm | Default value                            |
| `min`      | number                         | Minimum value                            |
| `max`      | number                         | Maximum value                            |
| `choices`  | select                         | Array of {name, value} objects           |

## Validation Rules

- ✅ IDs must be unique across all tasks
- ✅ IDs: alphanumeric, underscores, hyphens only
- ✅ Messages cannot be empty
- ✅ Select must have at least one choice
- ✅ Number min must be ≤ max
- ✅ Required prompts reject empty values

## See Also

- Full documentation: `docs/PROMPTS.md`
- Example file: `examples/template-tasks-with-prompts.json`
- Feature summary: `PROMPTS_FEATURE.md`
