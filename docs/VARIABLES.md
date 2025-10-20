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

1. **Global variables**: Defined at the top level of the configuration, available to all tasks
2. **Task variables**: Defined within a specific task, available to that task and its subtasks

### Global Variables

```json
{
  "$schema": "../schema/tasks.schema.json",
  "variables": [
    {
      "id": "currentYear",
      "value": {
        "type": "exec",
        "value": "node -e \"console.log(new Date().getFullYear())\""
      },
      "global": true
    },
    {
      "id": "defaultLicense",
      "value": "MIT"
    }
  ],
  "tasks": [...]
}
```

### Task-Scoped Variables

```json
{
  "id": "create-readme",
  "name": "Create README",
  "type": "template",
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
  "type": "template",
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

Variables and prompts work together seamlessly:

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
  "tasks": [
    {
      "id": "setup-project",
      "name": "Setup Project",
      "type": "update-json",
      "prompts": [
        {
          "id": "projectName",
          "type": "input",
          "message": "Project name?",
          "required": true,
          "global": true
        }
      ],
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

## Variable Scoping

### Global Variables

- Defined at the top level or with `"global": true` in tasks
- Available to all tasks
- Collected/resolved only once

### Task-Scoped Variables

- Defined within a specific task
- Available only to that task
- Can override global variables with the same ID

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
      "variables": [
        {
          "id": "template",
          "value": "custom"
        }
      ],
      "config": {
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
