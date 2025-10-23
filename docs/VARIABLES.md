# Variables

Variables provide a way to define reusable values in your template configuration **without requiring user interaction**. Unlike [prompts](./PROMPTS.md), which collect user input interactively, variables are resolved automatically from static values or executable commands.

## Overview

Variables are useful for:

- **Environment information**: Git user name, Node version, current year, etc.
- **Dynamic defaults**: Values computed from shell commands
- **Computed values**: Results from external tools or scripts
- **Configuration constants**: Shared values across multiple tasks
- **Build metadata**: Timestamps, versions, system information

## Key Differences from Prompts

| Feature          | Prompts                                 | Variables                          |
| ---------------- | --------------------------------------- | ---------------------------------- |
| User Interaction | Yes (interactive)                       | No (automatic)                     |
| Value Source     | User input (with optional defaults)     | Static values or command execution |
| Timing           | Collected before tasks run              | Resolved before tasks run          |
| Use Case         | User preferences, project configuration | System info, computed values       |

## Variable Definition

Variables can be defined at two levels:

1. **Top-level (global) variables**: Defined at the top level of the configuration, available to all tasks
2. **Task-scoped variables**: Defined within a specific task, available only to that task

### Top-Level (Global) Variables

Top-level variables are defined in the `variables` array at the root of your configuration. They are automatically available to **all tasks**.

```json
{
  "$schema": "../schema/tasks.schema.json",
  "variables": [
    {
      "id": "currentYear",
      "value": {
        "type": "exec",
        "value": "node -e \"console.log(new Date().getFullYear())\""
      }
    },
    {
      "id": "defaultLicense",
      "value": "MIT"
    }
  ],
  "tasks": [...]
}
```

In this example:

- `variables` array is defined at the top level (same level as `tasks`)
- All variables are **automatically global** and available to all tasks
- No need for a `global` property

### Task-Scoped Variables

Task-scoped variables are defined within a specific task's `variables` array. They are only available to that particular task.

```json
{
  "id": "create-readme",
  "name": "Create README",
  "type": "write",
  "variables": [
    {
      "id": "readmeTemplate",
      "value": "standard"
    },
    {
      "id": "badgeStyle",
      "value": {
        "type": "exec",
        "value": "echo flat-square"
      }
    }
  ],
  "config": {
    "file": "README.md",
    "template": "# {{projectName}}\n\nTemplate: {{readmeTemplate}}\nBadge Style: {{badgeStyle}}"
  }
}
```

In this example:

- `variables` array is defined within the task
- These variables are **task-scoped** and only available to this specific task
- Task-scoped variables are not available to other tasks

## Variable Types

### Static Values

Static variables have fixed values that don't change:

```json
{
  "id": "appName",
  "value": "MyApp"
}
```

You can also use explicit static type:

```json
{
  "id": "portNumber",
  "value": {
    "type": "static",
    "value": 3000
  }
}
```

### Executable Values

Executable variables run shell commands to get their value:

```json
{
  "id": "gitUserName",
  "value": {
    "type": "exec",
    "value": "git config user.name"
  }
}
```

#### Auto-Parsing

Command output is automatically parsed as:

- **JSON**: If output starts with `{` or `[`
- **Number**: If output matches a number pattern
- **Boolean**: If output is exactly `true` or `false`
- **String**: Otherwise

Examples:

```json
{
  "variables": [
    {
      "id": "packageInfo",
      "value": {
        "type": "exec",
        "value": "node -e \"console.log(JSON.stringify({name: 'test', version: '1.0.0'}))\""
      }
    },
    {
      "id": "cpuCount",
      "value": {
        "type": "exec",
        "value": "node -e \"console.log(require('os').cpus().length)\""
      }
    },
    {
      "id": "isCI",
      "value": {
        "type": "exec",
        "value": "node -e \"console.log(process.env.CI === 'true')\""
      }
    }
  ]
}
```

## Using Variables in Tasks

Variables are available in all template contexts using `{{variableName}}` syntax:

### In Template Files

```json
{
  "type": "write",
  "config": {
    "file": "LICENSE",
    "template": "MIT License\n\nCopyright (c) {{currentYear}} {{gitUserName}}"
  }
}
```

### In JSON Updates

```json
{
  "type": "update-json",
  "config": {
    "file": "package.json",
    "updates": {
      "author": "{{gitUserName}} <{{gitUserEmail}}>",
      "year": "{{currentYear}}"
    }
  }
}
```

### In Commands

```json
{
  "type": "exec",
  "config": {
    "command": "echo \"Building project {{projectName}} version {{nodeVersion}}\""
  }
}
```

## Common Variable Examples

### Git Information

```json
{
  "variables": [
    {
      "id": "gitUserName",
      "value": {
        "type": "exec",
        "value": "git config user.name"
      }
    },
    {
      "id": "gitUserEmail",
      "value": {
        "type": "exec",
        "value": "git config user.email"
      }
    },
    {
      "id": "gitRepoUrl",
      "value": {
        "type": "exec",
        "value": "git config --get remote.origin.url"
      }
    }
  ]
}
```

### System Information

```json
{
  "variables": [
    {
      "id": "nodeVersion",
      "value": {
        "type": "exec",
        "value": "node --version"
      }
    },
    {
      "id": "npmVersion",
      "value": {
        "type": "exec",
        "value": "npm --version"
      }
    },
    {
      "id": "platform",
      "value": {
        "type": "exec",
        "value": "node -e \"console.log(process.platform)\""
      }
    }
  ]
}
```

### Date and Time

```json
{
  "variables": [
    {
      "id": "currentYear",
      "value": {
        "type": "exec",
        "value": "node -e \"console.log(new Date().getFullYear())\""
      }
    },
    {
      "id": "timestamp",
      "value": {
        "type": "exec",
        "value": "node -e \"console.log(new Date().toISOString())\""
      }
    }
  ]
}
```

## Combining Variables and Prompts

Variables and prompts work together seamlessly. Use top-level `variables` for automatic system information and top-level `prompts` for user input:

```json
{
  "variables": [
    {
      "id": "currentYear",
      "value": {
        "type": "exec",
        "value": "node -e \"console.log(new Date().getFullYear())\""
      }
    },
    {
      "id": "gitUserName",
      "value": {
        "type": "exec",
        "value": "git config user.name"
      }
    }
  ],
  "prompts": [
    {
      "id": "projectName",
      "type": "input",
      "message": "Project name?",
      "required": true
    }
  ],
  "tasks": [
    {
      "id": "setup-project",
      "name": "Setup Project",
      "type": "update-json",
      "config": {
        "file": "package.json",
        "updates": {
          "name": "{{projectName}}",
          "author": "{{gitUserName}}",
          "year": "{{currentYear}}"
        }
      }
    }
  ]
}
```

In this example:

- `currentYear` and `gitUserName` are variables (automatic, no user input)
- `projectName` is a prompt (requires user input)
- All three are available to all tasks

## Variable Scoping

### Top-Level (Global) Variables

- Defined at the top level in the `variables` array
- Available to **all tasks**
- Resolved only once before any tasks run

### Task-Scoped Variables

- Defined within a specific task's `variables` array
- Available **only to that task**
- Can override top-level variables with the same ID

Example:

```json
{
  "variables": [
    {
      "id": "template",
      "value": "default"
    }
  ],
  "tasks": [
    {
      "id": "task1",
      "name": "Task 1",
      "type": "write",
      "variables": [
        {
          "id": "template",
          "value": "custom"
        }
      ],
      "config": {
        "file": "output.txt",
        "template": "Value: {{template}}"
      }
    }
  ]
}
```

In `task1`, `{{template}}` will be `"custom"`, overriding the global value.

## Error Handling

### Failed Commands

If an executable variable's command fails:

- A warning is logged
- The variable value is `undefined`
- Templates using that variable will show `undefined`

```json
{
  "id": "mayFail",
  "value": {
    "type": "exec",
    "value": "nonexistent-command"
  }
}
```

### Command Timeout

Commands have a 10-second timeout. If a command takes longer:

- The command is terminated
- The variable value is `undefined`
- A warning is logged

## Best Practices

### 1. Use Variables for Non-Interactive Values

```json
// ✅ Good: System information
{
  "id": "nodeVersion",
  "value": {
    "type": "exec",
    "value": "node --version"
  }
}

// ❌ Bad: User preferences (use prompts instead)
{
  "id": "projectName",
  "value": "my-project"
}
```

### 2. Validate Variable IDs

Variable IDs must be valid JavaScript identifiers:

```json
// ✅ Valid
{ "id": "myVar" }
{ "id": "my_var_123" }
{ "id": "$specialVar" }

// ❌ Invalid
{ "id": "my-var" }
{ "id": "my.var" }
{ "id": "123var" }
```

### 3. Keep Commands Simple

```json
// ✅ Good: Simple, fast commands
{
  "value": {
    "type": "exec",
    "value": "git config user.name"
  }
}

// ⚠️ Avoid: Complex, slow operations
{
  "value": {
    "type": "exec",
    "value": "npm list --depth=0 --json | node -e '...complex parsing...'"
  }
}
```

### 4. Provide Defaults

Combine with prompts for fallback values:

```json
{
  "prompts": [
    {
      "id": "author",
      "type": "input",
      "message": "Author name",
      "default": {
        "type": "exec",
        "value": "git config user.name"
      }
    }
  ]
}
```

## Complete Example

See [`examples/template-tasks-with-variables.json`](../packages/scaffoldfy/examples/template-tasks-with-variables.json) for a full working example.

## See Also

- [Prompts Documentation](./PROMPTS.md) - Interactive user input
- [Template Syntax](./HANDLEBARS_TEMPLATES.md) - Using variables in templates
- [Task Types](./TASK_TYPES.md) - Different task configurations
- [Getting Started](./GETTING_STARTED.md) - Basic usage guide

