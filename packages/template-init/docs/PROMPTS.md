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

## Global Prompts

You can mark prompts as **global** by setting `"global": true`. Global prompts are collected once at the beginning and their values are available to **all tasks**, not just the task where they're defined.

### When to Use Global Prompts

Use global prompts when:

- Multiple tasks need the same value (e.g., project name, version, author)
- You want to collect common information upfront
- You want to avoid asking the user the same question multiple times

### Example: Global Prompts

```json
{
  "tasks": [
    {
      "id": "update-package-json",
      "name": "Update package.json",
      "description": "Set project metadata",
      "required": true,
      "enabled": true,
      "type": "update-json",
      "prompts": [
        {
          "id": "projectName",
          "type": "input",
          "message": "What is your project name?",
          "global": true,
          "required": true
        },
        {
          "id": "projectVersion",
          "type": "input",
          "message": "Initial version",
          "default": "0.1.0",
          "global": true
        }
      ],
      "config": {
        "file": "package.json",
        "updates": {
          "name": "{{projectName}}",
          "version": "{{projectVersion}}"
        }
      }
    },
    {
      "id": "create-readme",
      "name": "Create README",
      "description": "Generate README file",
      "required": true,
      "enabled": true,
      "type": "template",
      "config": {
        "file": "README.md",
        "template": "# {{projectName}}\\n\\nVersion: {{projectVersion}}"
      }
    },
    {
      "id": "setup-config",
      "name": "Setup Config",
      "description": "Create config file",
      "required": false,
      "enabled": true,
      "type": "update-json",
      "prompts": [
        {
          "id": "enableDebug",
          "type": "confirm",
          "message": "Enable debug mode?",
          "default": false
        }
      ],
      "config": {
        "file": "config.json",
        "updates": {
          "name": "{{projectName}}",
          "debug": "{{enableDebug}}"
        }
      }
    }
  ]
}
```

In this example:

- `projectName` and `projectVersion` are marked as **global**
- They are prompted once when the first task runs
- Both values can be used in **all three tasks** (update-package-json, create-readme, setup-config)
- `enableDebug` is **task-specific** and only available to the setup-config task

### Prompt Collection Order

When you run initialization:

1. **Global prompts** are collected first (shown once, even if defined in multiple tasks)
2. **Task-specific prompts** are collected afterwards

This ensures users provide common information upfront before task-specific details.

## Using Prompt Values

Prompt values are automatically merged into the configuration object and can be used anywhere template interpolation is supported:

- `{{promptId}}` - Access prompt values in config via template interpolation
- Works in all task types (update-json, template, regex-replace, etc.)
- Values are available alongside built-in config values (repoName, author, etc.)
- **Global prompts** are available to all tasks
- **Task-specific prompts** are only available within their task

### Using Prompt Values in Conditions

Prompt values can also be used directly in condition expressions for `delete` tasks:

```json
{
  "id": "handle-example-packages",
  "name": "Handle example packages",
  "description": "Prompt user about keeping example packages and remove if not wanted",
  "required": false,
  "enabled": true,
  "type": "delete",
  "prompts": [
    {
      "id": "keepExamplePackages",
      "type": "confirm",
      "message": "Keep example packages? (helpful for reference)",
      "default": true
    }
  ],
  "config": {
    "condition": "!keepExamplePackages",
    "paths": ["packages/example-package"]
  }
}
```

In this example:

- When the user answers **"No" (false)** to the confirm prompt, `keepExamplePackages` is `false`
- The condition `!keepExamplePackages` evaluates to `true`, so the directories are deleted
- When the user answers **"Yes" (true)**, `keepExamplePackages` is `true`
- The condition `!keepExamplePackages` evaluates to `false`, so the directories are kept

You can use any JavaScript expression in conditions, including:

- Boolean values: `keepExamplePackages`, `!includeTests`
- Comparisons: `framework === "react"`, `port > 3000`
- String methods: `projectName.startsWith("my-")`
- Logical operators: `useTypeScript && includeTests`

## Validation Rules

Prompts are validated automatically:

- **ID**: Must contain only alphanumeric characters, underscores, and hyphens
- **ID uniqueness**: All prompt IDs across all tasks must be unique (duplicates are only allowed if all instances are marked as global with the same definition)
- **Global vs task-specific conflict**: A prompt ID cannot be used as both global and task-specific
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
3. **Mark shared prompts as global**: If multiple tasks need the same value, mark the prompt as `"global": true`
4. **Group related prompts**: Put prompts in the task where they're primarily used
5. **Validate inputs**: Use `required`, `min`, `max` to ensure valid data
6. **Keep it simple**: Don't overwhelm users with too many prompts
7. **Collect global prompts first**: Define global prompts in your first task so they're collected early

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
