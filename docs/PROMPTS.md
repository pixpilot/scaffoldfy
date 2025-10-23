# Using Prompts in scaffoldfy

scaffoldfy supports prompts at both the top level (global) and within individual tasks. This allows you to collect user input dynamically and use those values throughout your task configurations.

## Overview

Prompts enable you to:

- Collect custom user input when running initialization
- Support different input types (text, numbers, selections, confirmations, passwords)
- Define default values and validation rules
- Execute commands to generate dynamic default values (e.g., git branch, npm version, node version)
- Use prompt values in task configs via template interpolation
- Define **top-level (global) prompts** collected once upfront
- Define **task-specific prompts** collected only when that task runs
- Conditionally enable/disable prompts based on runtime conditions

## Top-Level (Global) Prompts

You can define prompts at the **top level** of your configuration file. These prompts are **always global** and are collected **once upfront** before any tasks run. Their values are available to **all tasks**.

### Example: Top-Level Prompts

```json
{
  "$schema": "../schema/tasks.schema.json",
  "prompts": [
    {
      "id": "projectName",
      "type": "input",
      "message": "Project name",
      "required": true
    },
    {
      "id": "author",
      "type": "input",
      "message": "Author name",
      "default": {
        "type": "exec",
        "value": "git config --get user.name"
      }
    },
    {
      "id": "useTypeScript",
      "type": "confirm",
      "message": "Use TypeScript?",
      "default": true
    }
  ],
  "tasks": [
    {
      "id": "update-package",
      "name": "Update package.json",
      "description": "Set project metadata",
      "required": true,
      "enabled": true,
      "type": "update-json",
      "config": {
        "file": "package.json",
        "updates": {
          "name": "{{projectName}}",
          "author": "{{author}}"
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
        "template": "# {{projectName}}\n\nAuthor: {{author}}"
      }
    }
  ]
}
```

In this example:

- `prompts` array is defined at the top level (same level as `tasks`)
- All prompts are collected **once** before any tasks run
- Values are available to **all tasks** using `{{projectName}}`, `{{author}}`, `{{useTypeScript}}`

## Task-Level Prompts

You can also define prompts within individual tasks. These prompts are **task-specific** and are only collected when that particular task runs. Their values are available **only within that task**.

### Example: Task-Level Prompts

```json
{
  "tasks": [
    {
      "id": "setup-env",
      "name": "Setup Environment",
      "description": "Create .env file",
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
        "template": "API_URL={{apiUrl}}\nAPI_SECRET={{apiSecret}}\n"
      }
    }
  ]
}
```

In this example:

- `apiUrl` and `apiSecret` are task-specific prompts
- They are only collected when the `setup-env` task runs
- They are **not available** to other tasks

### 1. Input Prompt

Collect text input from the user.

```json
{
  "id": "projectName",
  "type": "input",
  "message": "What is your project name?",
  "default": "my-project",
  "required": true,
  "enabled": true
}
```

#### Conditional Enabled

You can conditionally enable/disable prompts based on runtime conditions using a string expression (shorthand) or conditional object:

**String expression (shorthand):**

```json
{
  "id": "tsConfigPath",
  "type": "input",
  "message": "Path to tsconfig.json",
  "default": "./tsconfig.json",
  "enabled": "useTypeScript === true"
}
```

**Conditional object (verbose):**

```json
{
  "id": "tsConfigPath",
  "type": "input",
  "message": "Path to tsconfig.json",
  "default": "./tsconfig.json",
  "enabled": {
    "condition": "useTypeScript === true"
  }
}
```

In these examples, the `tsConfigPath` prompt is only shown if `useTypeScript` is `true`. Prompts are evaluated in order, so later prompts can depend on earlier prompt values.

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

## Executable Default Values

Default values can be either static values or dynamically generated by executing shell commands. This is useful for providing context-aware defaults based on the current environment.

### Static Default Values

The traditional way to define defaults:

```json
{
  "id": "projectName",
  "type": "input",
  "message": "Project name",
  "default": "my-project"
}
```

### Executable Default Values

Execute a command to generate the default value:

```json
{
  "id": "projectName",
  "type": "input",
  "message": "Project name",
  "default": {
    "type": "exec",
    "value": "basename $(pwd)"
  }
}
```

### How It Works

1. **Parallel Execution**: All executable defaults are resolved in parallel before any prompts are shown
2. **Auto-parsing**: Command output is automatically trimmed and parsed as:
   - **JSON** if output starts with `{` or `[`
   - **Number** if output matches a numeric pattern
   - **Boolean** if output is `"true"` or `"false"`
   - **String** otherwise
3. **Timeout**: Commands have a 10-second timeout
4. **Error Handling**: If a command fails, the default value becomes `undefined` (no default)

### Common Use Cases

#### Git Information

Get the current git branch:

```json
{
  "id": "branchName",
  "type": "input",
  "message": "Branch name",
  "default": {
    "type": "exec",
    "value": "git branch --show-current"
  }
}
```

Get the git remote URL:

```json
{
  "id": "repoUrl",
  "type": "input",
  "message": "Repository URL",
  "default": {
    "type": "exec",
    "value": "git config --get remote.origin.url"
  }
}
```

Get the current git user name:

```json
{
  "id": "authorName",
  "type": "input",
  "message": "Author name",
  "default": {
    "type": "exec",
    "value": "git config user.name"
  }
}
```

#### Node.js and Package Manager Info

Detect the Node.js version:

```json
{
  "id": "nodeVersion",
  "type": "input",
  "message": "Node.js version",
  "default": {
    "type": "exec",
    "value": "node --version"
  }
}
```

Detect which package manager is available:

```json
{
  "id": "packageManager",
  "type": "select",
  "message": "Package manager",
  "choices": [
    { "name": "npm", "value": "npm" },
    { "name": "pnpm", "value": "pnpm" },
    { "name": "yarn", "value": "yarn" }
  ],
  "default": {
    "type": "exec",
    "value": "command -v pnpm > /dev/null && echo 'pnpm' || (command -v yarn > /dev/null && echo 'yarn' || echo 'npm')"
  }
}
```

#### Environment Detection

Check if running in CI:

```json
{
  "id": "isCI",
  "type": "confirm",
  "message": "Running in CI?",
  "default": {
    "type": "exec",
    "value": "test -n \"$CI\" && echo 'true' || echo 'false'"
  }
}
```

Check if a directory exists:

```json
{
  "id": "hasTests",
  "type": "confirm",
  "message": "Include tests?",
  "default": {
    "type": "exec",
    "value": "test -d tests && echo 'true' || echo 'false'"
  }
}
```

Get the current directory name:

```json
{
  "id": "projectName",
  "type": "input",
  "message": "Project name",
  "default": {
    "type": "exec",
    "value": "basename $(pwd)"
  }
}
```

#### System Information

Get the operating system:

```json
{
  "id": "os",
  "type": "select",
  "message": "Operating system",
  "choices": [
    { "name": "Linux", "value": "linux" },
    { "name": "macOS", "value": "darwin" },
    { "name": "Windows", "value": "win32" }
  ],
  "default": {
    "type": "exec",
    "value": "node -p \"process.platform\""
  }
}
```

#### Number Prompts with Executable Defaults

Find an available port:

```json
{
  "id": "port",
  "type": "number",
  "message": "Development server port",
  "min": 1024,
  "max": 65535,
  "default": {
    "type": "exec",
    "value": "node -e \"require('net').createServer().listen(0, () => { console.log(require('net').createServer().address().port); process.exit(); })\""
  }
}
```

Or use a simpler approach:

```json
{
  "id": "port",
  "type": "number",
  "message": "Development server port",
  "default": {
    "type": "exec",
    "value": "echo 3000"
  }
}
```

### Explicit Value Type

You can also explicitly mark a static value using the `value` type:

```json
{
  "id": "projectName",
  "type": "input",
  "message": "Project name",
  "default": {
    "type": "value",
    "value": "my-project"
  }
}
```

This is equivalent to:

```json
{
  "id": "projectName",
  "type": "input",
  "message": "Project name",
  "default": "my-project"
}
```

### Best Practices for Executable Defaults

1. **Keep commands simple**: Complex commands are harder to debug
2. **Handle errors gracefully**: Commands may fail; ensure your prompts work without defaults
3. **Use platform-agnostic commands when possible**: Consider cross-platform compatibility
4. **Test your commands**: Verify they work in different environments
5. **Provide static fallbacks**: Consider having a static default if the command fails
6. **Be mindful of security**: Avoid executing untrusted input
7. **Use timeouts wisely**: Commands timeout after 10 seconds; keep them fast

## Template Interpolation in Default Values

You can use `{{variable}}` syntax in prompt default values. These will be dynamically interpolated using the current configuration and previously collected prompt/variable values.

### Example

```json
{
  "id": "securityEmail",
  "type": "input",
  "message": "Security contact email",
  "default": "{{authorEmail}}",
  "required": true
}
```

If `authorEmail` is available from another prompt or variable, it will be used as the default value.

## Conditional Default Values

You can provide conditional defaults using the `type: "conditional"` format. This allows you to set a default value based on a runtime condition (JavaScript expression).

### Example

```json
{
  "id": "securityEmail",
  "type": "input",
  "message": "Security contact email",
  "default": {
    "type": "conditional",
    "condition": "orgName === 'pixpilot'",
    "ifTrue": "security@pixpilot.com",
    "ifFalse": "{{authorEmail}}"
  },
  "required": true
}
```

This will use `security@pixpilot.com` if `orgName` is `pixpilot`, otherwise it will use the value of `authorEmail`.

### Windows Compatibility

For cross-platform compatibility, prefer using Node.js commands or Git commands over shell-specific syntax:

```json
{
  "id": "projectName",
  "type": "input",
  "message": "Project name",
  "default": {
    "type": "exec",
    "value": "node -p \"require('path').basename(process.cwd())\""
  }
}
```

This works on Windows, macOS, and Linux without modification.

## Complete Example

Here's a complete example showing how to use prompts with executable defaults in `template-tasks.json`:

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
          "default": {
            "type": "exec",
            "value": "node -p \"require('path').basename(process.cwd())\""
          },
          "required": true
        },
        {
          "id": "authorName",
          "type": "input",
          "message": "Author name",
          "default": {
            "type": "exec",
            "value": "git config user.name"
          }
        },
        {
          "id": "authorEmail",
          "type": "input",
          "message": "Author email",
          "default": {
            "type": "exec",
            "value": "git config user.email"
          }
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
          "default": {
            "type": "exec",
            "value": "command -v pnpm > /dev/null && echo 'pnpm' || echo 'npm'"
          }
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
          "author": "{{authorName}} <{{authorEmail}}>",
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

## Conditional Enabled for Prompts

Both top-level and task-level prompts support a conditional `enabled` field. This allows you to dynamically show or hide prompts based on runtime conditions.

### Simple Boolean

```json
{
  "id": "projectName",
  "type": "input",
  "message": "Project name",
  "enabled": true
}
```

### String Expression (Shorthand)

You can use a string directly as a condition expression:

```json
{
  "id": "tsConfigPath",
  "type": "input",
  "message": "Path to tsconfig.json",
  "default": "./tsconfig.json",
  "enabled": "useTypeScript === true"
}
```

This is equivalent to using the conditional object syntax but more concise.

### Conditional Object

```json
{
  "id": "tsConfigPath",
  "type": "input",
  "message": "Path to tsconfig.json",
  "default": "./tsconfig.json",
  "enabled": {
    "condition": "useTypeScript === true"
  }
}
```

### How Conditional Enabled Works

1. Conditions are **JavaScript expressions** evaluated at runtime
2. The expression has access to:
   - All previously collected prompt values
   - All variable values (both global and task-scoped)
   - All config values
3. Prompts are evaluated **in order**, so later prompts can depend on earlier ones
4. If the condition evaluates to `false`, the prompt is **skipped**
5. Conditions can be provided as:
   - **String expression**: `"enabled": "useDatabase === true"` (shorthand)
   - **Conditional object**: `"enabled": { "condition": "useDatabase === true" }` (verbose)

### Examples

#### Conditional Based on Previous Prompt

Using string expression (shorthand):

```json
{
  "prompts": [
    {
      "id": "useDatabase",
      "type": "confirm",
      "message": "Use database?",
      "default": false
    },
    {
      "id": "databaseType",
      "type": "select",
      "message": "Select database type",
      "choices": [
        { "name": "PostgreSQL", "value": "postgres" },
        { "name": "MySQL", "value": "mysql" },
        { "name": "MongoDB", "value": "mongodb" }
      ],
      "enabled": "useDatabase === true"
    }
  ]
}
```

Using conditional object (verbose):

```json
{
  "prompts": [
    {
      "id": "useDatabase",
      "type": "confirm",
      "message": "Use database?",
      "default": false
    },
    {
      "id": "databaseType",
      "type": "select",
      "message": "Select database type",
      "choices": [
        { "name": "PostgreSQL", "value": "postgres" },
        { "name": "MySQL", "value": "mysql" },
        { "name": "MongoDB", "value": "mongodb" }
      ],
      "enabled": {
        "condition": "useDatabase === true"
      }
    },
    {
      "id": "databaseUrl",
      "type": "input",
      "message": "Database connection URL",
      "enabled": {
        "condition": "useDatabase === true"
      }
    }
  ]
}
```

#### Complex Conditional Logic

Using string expression:

```json
{
  "prompts": [
    {
      "id": "framework",
      "type": "select",
      "message": "Select framework",
      "choices": [
        { "name": "React", "value": "react" },
        { "name": "Vue", "value": "vue" },
        { "name": "Svelte", "value": "svelte" }
      ]
    },
    {
      "id": "useTypeScript",
      "type": "confirm",
      "message": "Use TypeScript?",
      "default": true
    },
    {
      "id": "tsConfigPath",
      "type": "input",
      "message": "Path to tsconfig.json",
      "default": "./tsconfig.json",
      "enabled": "useTypeScript === true && (framework === 'react' || framework === 'vue')"
    }
  ]
}
```

Using conditional object:

```json
{
  "prompts": [
    {
      "id": "framework",
      "type": "select",
      "message": "Select framework",
      "choices": [
        { "name": "React", "value": "react" },
        { "name": "Vue", "value": "vue" },
        { "name": "Svelte", "value": "svelte" }
      ]
    },
    {
      "id": "useTypeScript",
      "type": "confirm",
      "message": "Use TypeScript?",
      "default": true
    },
    {
      "id": "reactRouter",
      "type": "confirm",
      "message": "Include React Router?",
      "default": true,
      "enabled": {
        "condition": "framework === 'react'"
      }
    },
    {
      "id": "tsConfigStrict",
      "type": "confirm",
      "message": "Enable strict TypeScript mode?",
      "default": true,
      "enabled": {
        "condition": "useTypeScript === true && (framework === 'react' || framework === 'vue')"
      }
    }
  ]
}
```

## Prompt Collection Order

When you run initialization:

1. **Top-level (global) prompts** are collected first, in the order they're defined
2. **Task-specific prompts** are collected when each task runs
3. Within each level, prompts are evaluated in order, respecting `enabled` conditions

This ensures users provide common information upfront before task-specific details.

## Using Prompt Values

Prompt values are automatically merged into the configuration object and can be used anywhere template interpolation is supported:

- `{{promptId}}` - Access prompt values in config via template interpolation
- Works in all task types (update-json, template, regex-replace, etc.)
- Values are available alongside variable values
- **Top-level prompts** are available to all tasks
- **Task-specific prompts** are only available within their task

### Using Prompt Values in Conditions

Prompt values can also be used directly in condition expressions for tasks and within task configs:

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

- **ID**: Must be a valid JavaScript identifier (letters, digits, underscores, and `$`; cannot start with a digit or contain hyphens)
- **ID uniqueness**: All prompt IDs must be unique (top-level and task-level combined)
- **Required**: If `required: true`, empty values are rejected
- **Number min/max**: Values must be within specified range
- **Select choices**: At least one choice must be provided
- **Executable defaults**: Commands that fail will result in no default value (prompt shown without a default)
- **Enabled condition**: Must be a valid JavaScript expression

## TypeScript Support

For TypeScript task files (`template-tasks.ts`), you can use typed prompt definitions:

```typescript
import type { TaskDefinition } from '@pixpilot/scaffoldfy';

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
3. **Use executable defaults for context**: Let the environment suggest intelligent defaults (e.g., git user name, current directory)
4. **Define shared prompts at top level**: If multiple tasks need the same value, define it in the top-level `prompts` array
5. **Use conditional enabled**: Show/hide prompts based on user choices to create dynamic workflows
6. **Validate inputs**: Use `required`, `min`, `max` to ensure valid data
7. **Keep it simple**: Don't overwhelm users with too many prompts
8. **Test executable defaults**: Ensure commands work across different platforms
9. **Handle command failures gracefully**: Don't rely solely on executable defaults for required prompts
10. **Order matters**: Later prompts can depend on earlier ones, so order them logically

## CLI Usage

Run initialization with prompts:

```bash
# Using JSON file (default)
scaffoldfy --tasks-file ./template-tasks.json

# Using TypeScript file
scaffoldfy --tasks-ts ./template-tasks.ts

# Dry run to preview
scaffoldfy --dry-run
```

The CLI will automatically detect prompts in your tasks and collect user input before executing the tasks.
