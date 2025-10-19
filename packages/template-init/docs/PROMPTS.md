# Using Embedded Prompts in Tasks

Template-init now supports embedding prompts directly in your task definitions. This allows you to collect user input dynamically and use those values in your task configurations.

## Overview

Prompts enable you to:

- Collect custom user input when running initialization
- Support different input types (text, numbers, selections, confirmations, passwords)
- Define default values and validation rules
- Use prompt values in task configs via template interpolation

## Prompt Types

### 1. Input Prompt

Collect text input from the user.

```json
{
  "id": "projectName",
  "type": "input",
  "message": "What is your project name?",
  "default": "my-project",
  "required": true,
  "placeholder": "Enter project name"
}
```

### 2. Password Prompt

Securely collect sensitive information (masked input).

```json
{
  "id": "apiKey",
  "type": "password",
  "message": "Enter your API key",
  "required": true
}
```

### 3. Number Prompt

Collect numeric input with optional min/max constraints.

```json
{
  "id": "port",
  "type": "number",
  "message": "Server port?",
  "default": 3000,
  "min": 1024,
  "max": 65535
}
```

### 4. Select Prompt

Present a list of choices to the user.

```json
{
  "id": "framework",
  "type": "select",
  "message": "Select your framework",
  "choices": [
    { "name": "React", "value": "react" },
    { "name": "Vue", "value": "vue" },
    { "name": "Svelte", "value": "svelte" }
  ],
  "default": "react"
}
```

### 5. Confirm Prompt

Ask a yes/no question.

```json
{
  "id": "includeTests",
  "type": "confirm",
  "message": "Include test setup?",
  "default": true
}
```

## Complete Example

Here's a complete example showing how to use prompts in `template-tasks.json`:

```json
{
  "tasks": [
    {
      "id": "setup-project",
      "name": "Setup Project",
      "description": "Configure project with custom settings",
      "required": true,
      "enabled": true,
      "type": "update-json",
      "prompts": [
        {
          "id": "appName",
          "type": "input",
          "message": "Application name",
          "default": "my-app",
          "required": true
        },
        {
          "id": "useTypeScript",
          "type": "confirm",
          "message": "Use TypeScript?",
          "default": true
        },
        {
          "id": "packageManager",
          "type": "select",
          "message": "Package manager",
          "choices": [
            { "name": "npm", "value": "npm" },
            { "name": "pnpm", "value": "pnpm" },
            { "name": "yarn", "value": "yarn" }
          ],
          "default": "pnpm"
        },
        {
          "id": "port",
          "type": "number",
          "message": "Development server port",
          "default": 3000,
          "min": 1024,
          "max": 65535
        }
      ],
      "config": {
        "file": "package.json",
        "updates": {
          "name": "{{appName}}",
          "scripts": {
            "dev": "vite --port {{port}}"
          }
        }
      }
    },
    {
      "id": "setup-env",
      "name": "Setup Environment",
      "description": "Create .env file with API credentials",
      "required": false,
      "enabled": true,
      "type": "template",
      "prompts": [
        {
          "id": "apiUrl",
          "type": "input",
          "message": "API URL",
          "default": "https://api.example.com"
        },
        {
          "id": "apiSecret",
          "type": "password",
          "message": "API Secret Key",
          "required": true
        }
      ],
      "config": {
        "file": ".env",
        "template": "API_URL={{apiUrl}}\\nAPI_SECRET={{apiSecret}}\\n"
      }
    }
  ]
}
```

## Using Prompt Values

Prompt values are automatically merged into the configuration object and can be used anywhere template interpolation is supported:

- `{{promptId}}` - Access prompt values in config
- Works in all task types (update-json, template, regex-replace, etc.)
- Values are available alongside built-in config values (repoName, author, etc.)

## Validation Rules

Prompts are validated automatically:

- **ID**: Must contain only alphanumeric characters, underscores, and hyphens
- **ID uniqueness**: All prompt IDs across all tasks must be unique
- **Required**: If `required: true`, empty values are rejected
- **Number min/max**: Values must be within specified range
- **Select choices**: At least one choice must be provided

## TypeScript Support

For TypeScript task files (`template-tasks.ts`), you can use typed prompt definitions:

```typescript
import type { TaskDefinition } from '@pixpilot/template-init';

export const tasks: TaskDefinition[] = [
  {
    id: 'setup',
    name: 'Setup',
    description: 'Project setup',
    required: true,
    enabled: true,
    type: 'update-json',
    prompts: [
      {
        id: 'projectName',
        type: 'input',
        message: 'Project name?',
        required: true,
      },
    ],
    config: {
      file: 'package.json',
      updates: {
        name: '{{projectName}}',
      },
    },
  },
];
```

## Best Practices

1. **Use descriptive IDs**: Choose clear, semantic IDs like `apiKey` instead of `key1`
2. **Provide defaults**: Always provide sensible defaults when possible
3. **Group related prompts**: Put prompts in the task where they're used
4. **Validate inputs**: Use `required`, `min`, `max` to ensure valid data
5. **Keep it simple**: Don't overwhelm users with too many prompts

## CLI Usage

Run initialization with prompts:

```bash
# Using JSON file (default)
template-init --tasks-file ./template-tasks.json

# Using TypeScript file
template-init --tasks-ts ./template-tasks.ts

# Dry run to preview
template-init --dry-run
```

The CLI will automatically detect prompts in your tasks and collect user input before executing the tasks.
