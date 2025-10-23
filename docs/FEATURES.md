# Advanced Features

This guide covers the advanced features of **@pixpilot/scaffoldfy** that enable powerful and flexible template automation.

## Table of Contents

- [Template-Level Enabled](#template-level-enabled)
- [Conditional Execution](#conditional-execution)
- [Global Prompts](#global-prompts)
- [Handlebars Templates](#handlebars-templates)

---

## Template-Level Enabled

Control whether an entire template should be executed at the root level. This is useful for creating conditional templates that only run under specific circumstances.

### Overview

The root-level `enabled` property allows you to enable or disable an entire template, including all of its prompts, variables, and tasks. If the template is disabled, execution stops immediately without any user interaction or file operations.

### Basic Usage

#### Simple Boolean

```json
{
  "$schema": "https://scaffoldfy.dev/schema/tasks.schema.json",
  "name": "my-template",
  "enabled": true,
  "tasks": [...]
}
```

#### String Expression (Shorthand)

```json
{
  "$schema": "https://scaffoldfy.dev/schema/tasks.schema.json",
  "name": "conditional-template",
  "enabled": "process.env.NODE_ENV === 'development'",
  "tasks": [...]
}
```

#### Conditional Object

```json
{
  "$schema": "https://scaffoldfy.dev/schema/tasks.schema.json",
  "name": "conditional-template",
  "enabled": {
    "condition": "projectType === 'monorepo'"
  },
  "tasks": [...]
}
```

### Executable Enabled

Determine if a template should run by executing a shell command:

```json
{
  "$schema": "https://scaffoldfy.dev/schema/tasks.schema.json",
  "name": "git-template",
  "enabled": {
    "type": "exec",
    "value": "git rev-parse --is-inside-work-tree"
  },
  "tasks": [...]
}
```

The command output is parsed as a boolean:

- Empty string, `"0"`, `"false"`, or `"no"` (case-insensitive) = `false`
- Everything else = `true`
- Failed commands = `false`

### Use Cases

#### 1. Environment-Based Templates

Only run certain templates in specific environments:

```json
{
  "name": "development-tools",
  "enabled": {
    "type": "exec",
    "value": "test \"$NODE_ENV\" = \"development\" && echo true || echo false"
  },
  "tasks": [
    {
      "id": "install-dev-tools",
      "name": "Install Development Tools",
      "type": "exec",
      "config": {
        "command": "npm install --save-dev prettier eslint"
      }
    }
  ]
}
```

#### 2. Dependency-Based Templates

Enable templates only when certain dependencies exist:

```json
{
  "name": "react-setup",
  "description": "Setup React-specific configurations",
  "enabled": {
    "type": "exec",
    "value": "test -f node_modules/react/package.json && echo true || echo false"
  },
  "tasks": [...]
}
```

#### 3. Conditional Based on Other Templates

Enable templates based on variables from dependency templates:

```json
{
  "name": "typescript-config",
  "description": "TypeScript configuration",
  "dependencies": ["project-info"],
  "enabled": "useTypeScript === true",
  "tasks": [
    {
      "id": "create-tsconfig",
      "name": "Create tsconfig.json",
      "type": "write",
      "config": {
        "file": "tsconfig.json",
        "template": "{ \"compilerOptions\": { \"strict\": true } }"
      }
    }
  ]
}
```

In this example, if the `project-info` template has a prompt `useTypeScript`, this template will only run if the user answered `true`.

#### 4. Git Repository Check

Only run Git-related templates in Git repositories:

```json
{
  "name": "git-hooks",
  "enabled": {
    "type": "exec",
    "value": "git rev-parse --git-dir"
  },
  "tasks": [
    {
      "id": "setup-hooks",
      "name": "Setup Git Hooks",
      "type": "exec",
      "config": {
        "command": "npx husky install"
      }
    }
  ]
}
```

### Evaluation Timing

The template-level `enabled` property is evaluated **before** any other operations:

1. ✅ **Evaluated first** - Before variable resolution
2. ✅ **Evaluated first** - Before prompt collection
3. ✅ **Evaluated first** - Before task execution
4. ✅ **Evaluated first** - Before validation

If the template is disabled, **nothing** from that template will be processed or executed. This makes it efficient for conditional templates.

### Template Variables in Enabled

You can use variables in the `enabled` expression, but be aware that variables are resolved during execution. For exec-type enabled, you can use template interpolation:

```json
{
  "name": "conditional-template",
  "variables": [
    {
      "id": "targetEnv",
      "value": {
        "type": "exec",
        "value": "echo $NODE_ENV"
      }
    }
  ],
  "enabled": "targetEnv === 'production'",
  "tasks": [...]
}
```

However, for early evaluation, prefer using exec-type enabled directly:

```json
{
  "name": "conditional-template",
  "enabled": {
    "type": "exec",
    "value": "test \"$NODE_ENV\" = \"production\" && echo true || echo false"
  },
  "tasks": [...]
}
```

### Best Practices

1. **Use exec for external checks** - When checking file existence, environment variables, or system state
2. **Use conditions for prompt-based logic** - When the decision depends on user input from dependency templates
3. **Keep conditions simple** - Complex logic should be in scripts, not conditions
4. **Document dependencies** - If your template depends on variables from other templates, list them in `dependencies`

---

## Conditional Execution

Execute tasks conditionally based on user input, configuration values, or any JavaScript expression.

### Overview

Every task type supports an optional `condition` field that determines whether the task should be executed. If the condition evaluates to `false`, the task is skipped.

### Basic Usage

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

### Supported Task Types

Conditional execution is available for **all task types**:

- ✅ `update-json`
- ✅ `template`
- ✅ `regex-replace`
- ✅ `replace-in-file`
- ✅ `delete`
- ✅ `rename`
- ✅ `git-init`
- ✅ `exec`

### Condition Syntax

Conditions are JavaScript expressions that have access to all configuration variables:

**Supported Operators:**

- **Comparison:** `===`, `!==`, `<`, `>`, `<=`, `>=`
- **Logical:** `&&` (and), `||` (or), `!` (not)
- **Ternary:** `condition ? true : false`

**Available Variables:**

- Built-in config variables: `projectName`, `author`, `repoUrl`, etc.
- Prompt values: Any variable defined through prompts
- Global prompt values: Available across all tasks

### Using with Prompts

Combine conditional execution with interactive prompts for dynamic behavior:

```json
{
  "id": "setup-typescript",
  "prompts": [
    {
      "id": "useTypeScript",
      "type": "confirm",
      "message": "Use TypeScript?",
      "default": true,
      "global": true
    }
  ],
  "type": "write",
  "config": {
    "file": "tsconfig.json",
    "templateFile": ".templates/tsconfig.hbs",
    "condition": "useTypeScript === true"
  }
}
```

### Complex Conditions

Create sophisticated conditional logic:

```json
{
  "type": "delete",
  "config": {
    "paths": ["examples", "test-fixtures", "docs/api"],
    "condition": "!keepExamples && environment !== 'development'"
  }
}
```

### Numeric Comparisons

```json
{
  "prompts": [
    {
      "id": "nodeVersion",
      "type": "number",
      "message": "Minimum Node.js version?",
      "default": 18
    }
  ],
  "type": "exec",
  "config": {
    "command": "npm install --save-dev typescript@latest",
    "condition": "nodeVersion >= 16"
  }
}
```

### Multiple Conditions

Combine multiple conditions with logical operators:

```json
{
  "type": "write",
  "config": {
    "file": ".github/workflows/ci.yml",
    "templateFile": ".templates/ci-advanced.hbs",
    "condition": "enableCI === true && (useTypeScript === true || useLinting === true)"
  }
}
```

### Dry Run with Conditions

When using `--dry-run`, you'll see which tasks would be skipped:

```
✓ Task: Update Package Info
✗ Task: Setup TypeScript (condition not met: useTypeScript === false)
✓ Task: Create README
```

### Best Practices

1. **Keep conditions simple** - Complex logic is harder to debug
2. **Use global prompts** - Share condition variables across tasks
3. **Document conditions** - Add clear descriptions explaining why tasks are conditional
4. **Test both paths** - Run with conditions true and false to verify behavior
5. **Use meaningful prompt IDs** - Make conditions self-documenting (e.g., `enableFeatureX`)

### Examples

**Conditional cleanup:**

```json
{
  "id": "cleanup-template-files",
  "prompts": [
    {
      "id": "cleanupTemplate",
      "type": "confirm",
      "message": "Remove template files after initialization?",
      "default": true
    }
  ],
  "type": "delete",
  "config": {
    "paths": [".templates", "template-tasks.json"],
    "condition": "cleanupTemplate === true"
  }
}
```

**Environment-specific configuration:**

```json
{
  "prompts": [
    {
      "id": "environment",
      "type": "select",
      "message": "Deployment environment?",
      "choices": ["development", "staging", "production"],
      "global": true
    }
  ],
  "type": "write",
  "config": {
    "file": ".env",
    "templateFile": ".templates/env-production.hbs",
    "condition": "environment === 'production'"
  }
}
```

---

## Global Prompts

Share prompt values across all tasks for better user experience and cleaner configuration.

### Overview

By default, prompt values are only available within the task where they're defined. Global prompts allow you to mark any prompt with `"global": true"` so its value is available to **all tasks** throughout the initialization process.

### Why Use Global Prompts?

**Without Global Prompts:**

- Same question asked multiple times (poor UX)
- Values can't be shared between tasks
- Redundant prompt definitions

**With Global Prompts:**

- Ask once, use everywhere
- Cleaner configuration
- Better user experience

### Basic Usage

```json
{
  "id": "init-package",
  "prompts": [
    {
      "id": "projectName",
      "type": "input",
      "message": "What is your project name?",
      "required": true,
      "global": true
    },
    {
      "id": "version",
      "type": "input",
      "message": "Initial version?",
      "default": "0.1.0",
      "global": true
    }
  ],
  "config": {
    "file": "package.json",
    "updates": {
      "name": "{{projectName}}",
      "version": "{{version}}"
    }
  }
}
```

### Using Global Values in Other Tasks

Once defined as global, use the values in any subsequent task:

```json
{
  "id": "create-readme",
  "type": "write",
  "config": {
    "file": "README.md",
    "template": "# {{projectName}}\n\nVersion: {{version}}"
  }
}
```

```json
{
  "id": "create-changelog",
  "type": "write",
  "config": {
    "file": "CHANGELOG.md",
    "template": "# Changelog for {{projectName}}\n\n## [{{version}}]"
  }
}
```

### User Experience

Global prompts are clearly labeled when collected:

```
📋 Global prompts (available to all tasks):
? What is your project name? my-awesome-app
? Initial version? 1.0.0
? Choose a license: MIT

📋 Task-specific prompts:
? Enable debug mode? Yes
? Port number? 3000

Starting initialization tasks...
```

### Validation Rules

1. **Unique IDs**: Prompt IDs must be unique unless they're all marked as global
2. **No conflicts**: A prompt ID cannot be both global and task-specific
3. **Standard validation**: All standard prompt validation rules still apply

### Common Use Cases

**Project metadata:**

```json
{
  "prompts": [
    {
      "id": "projectName",
      "type": "input",
      "message": "Project name?",
      "required": true,
      "global": true
    },
    {
      "id": "description",
      "type": "input",
      "message": "Project description?",
      "global": true
    },
    {
      "id": "license",
      "type": "select",
      "message": "Choose a license:",
      "choices": ["MIT", "Apache-2.0", "GPL-3.0"],
      "default": "MIT",
      "global": true
    }
  ]
}
```

**Feature flags:**

```json
{
  "prompts": [
    {
      "id": "useTypeScript",
      "type": "confirm",
      "message": "Use TypeScript?",
      "default": true,
      "global": true
    },
    {
      "id": "enableTesting",
      "type": "confirm",
      "message": "Include testing setup?",
      "default": true,
      "global": true
    },
    {
      "id": "enableCI",
      "type": "confirm",
      "message": "Setup CI/CD?",
      "default": false,
      "global": true
    }
  ]
}
```

### Best Practices

1. **Use for shared values** - Project name, version, author, license, etc.
2. **Feature flags as global** - When multiple tasks depend on the same feature choice
3. **Collect early** - Global prompts are collected first, before any tasks run
4. **Clear naming** - Use descriptive IDs that make sense across tasks
5. **Document dependencies** - Note which tasks use which global prompts

### Complete Example

```json
{
  "tasks": [
    {
      "id": "project-setup",
      "name": "Project Setup",
      "prompts": [
        {
          "id": "projectName",
          "type": "input",
          "message": "Project name?",
          "required": true,
          "global": true
        },
        {
          "id": "useTypeScript",
          "type": "confirm",
          "message": "Use TypeScript?",
          "default": true,
          "global": true
        }
      ],
      "type": "update-json",
      "config": {
        "file": "package.json",
        "updates": {
          "name": "{{projectName}}"
        }
      }
    },
    {
      "id": "setup-typescript",
      "name": "Setup TypeScript",
      "type": "write",
      "config": {
        "file": "tsconfig.json",
        "templateFile": ".templates/tsconfig.hbs",
        "condition": "useTypeScript === true"
      }
    },
    {
      "id": "create-readme",
      "name": "Create README",
      "type": "write",
      "config": {
        "file": "README.md",
        "template": "# {{projectName}}\n\nTypeScript: {{useTypeScript}}"
      }
    }
  ]
}
```

In this example:

- `projectName` and `useTypeScript` are prompted once at the start
- All three tasks can use these values
- The TypeScript setup is conditional based on the global prompt

---

## Handlebars Templates

Use powerful Handlebars templating for advanced template generation with conditionals, loops, and helpers.

### Overview

Scaffoldfy automatically uses Handlebars for template files ending in `.hbs`. This gives you access to advanced templating features like conditionals, loops, and built-in helpers.

### Automatic Detection

**No configuration needed** - just use the `.hbs` extension:

```json
{
  "type": "write",
  "config": {
    "file": "README.md",
    "templateFile": ".templates/readme.hbs"
  }
}
```

### Template Processing Rules

| Template Type | Extension        | Processing                        |
| ------------- | ---------------- | --------------------------------- |
| Handlebars    | `.hbs`           | Full Handlebars templating        |
| Simple        | Other extensions | Simple `{{variable}}` replacement |
| Inline        | N/A              | Simple `{{variable}}` replacement |

### Basic Handlebars Template

Create `.templates/readme.hbs`:

````handlebars
#
{{projectName}}

{{description}}

## Installation ```sh npm install
{{projectName}}
````

## License

{{license}}

````

Use it in your task:

```json
{
  "type": "write",
  "config": {
    "file": "README.md",
    "templateFile": ".templates/readme.hbs"
  }
}
````

### Conditionals

Use `{{#if}}` and `{{#unless}}` for conditional content:

````handlebars
# {{projectName}}

{{#if description}}
{{description}}
{{/if}}

## Features

{{#if useTypeScript}}
- Written in TypeScript
- Full type safety
{{/if}}

{{#if enableTesting}}
- Comprehensive test coverage
{{/if}}

{{#unless isPrivate}}
## Installation

```sh
npm install {{projectName}}
````

{{/unless}}

````

### Loops

Use `{{#each}}` to iterate over arrays:

```handlebars
# Contributors

{{#each contributors}}
- {{this.name}} ({{this.email}})
{{/each}}

# Features

{{#each features}}
- {{this}}
{{/each}}
````

Pass arrays through prompts or config:

```json
{
  "prompts": [
    {
      "id": "features",
      "type": "input",
      "message": "List features (comma-separated):"
    }
  ]
}
```

### Nested Conditionals

Combine conditionals for complex logic:

```handlebars
{{#if useTypeScript}}
  ## TypeScript Configuration This project uses TypeScript.

  {{#if strict}}
    Strict mode is enabled for maximum type safety.
  {{else}}
    Standard TypeScript configuration.
  {{/if}}
{{/if}}
```

### Built-in Helpers

Handlebars provides useful built-in helpers:

```handlebars
{{!-- Comments (not included in output) --}}
{{! Single line comment }}

{{!-- Conditionals with else --}}
{{#if condition}}
  Content if true
{{else}}
  Content if false
{{/if}}

{{!-- Check for truthiness --}}
{{#unless condition}}
  Content if false
{{/unless}}

{{!-- Iterate arrays --}}
{{#each items}}
  {{@index}}: {{this}}
{{/each}}

{{!-- Access parent context --}}
{{#each items}}
  Parent: {{../parentProperty}}
  Current: {{this}}
{{/each}}
```

### Complex Example

`.templates/package-json.hbs`:

```handlebars
{ "name": "{{projectName}}", "version": "{{version}}", "description": "{{description}}",
{{#if isPrivate}}
  "private": true,
{{/if}}
"scripts": {
{{#if useTypeScript}}
  "build": "tsc", "dev": "tsc --watch",
{{/if}}
{{#if enableTesting}}
  "test": "vitest",
{{/if}}
"start": "node
{{#if useTypeScript}}dist/{{/if}}index.js" }, "devDependencies": {
{{#if useTypeScript}}
  "typescript": "^5.0.0", "@types/node": "^20.0.0"{{#if enableTesting}},{{/if}}
{{/if}}
{{#if enableTesting}}
  "vitest": "^1.0.0"
{{/if}}
} }
```

### File Organization

Recommended structure:

```
project-root/
├── .templates/
│   ├── readme.hbs
│   ├── package-json.hbs
│   ├── tsconfig.hbs
│   └── ci-workflow.hbs
└── template-tasks.json
```

### Complete Workflow Example

```json
{
  "tasks": [
    {
      "id": "collect-info",
      "name": "Collect Project Info",
      "prompts": [
        {
          "id": "projectName",
          "type": "input",
          "message": "Project name?",
          "required": true,
          "global": true
        },
        {
          "id": "description",
          "type": "input",
          "message": "Description?",
          "global": true
        },
        {
          "id": "useTypeScript",
          "type": "confirm",
          "message": "Use TypeScript?",
          "default": true,
          "global": true
        },
        {
          "id": "enableTesting",
          "type": "confirm",
          "message": "Include testing?",
          "default": true,
          "global": true
        }
      ],
      "type": "write",
      "config": {
        "file": "package.json",
        "templateFile": ".templates/package-json.hbs"
      }
    },
    {
      "id": "create-readme",
      "name": "Create README",
      "type": "write",
      "config": {
        "file": "README.md",
        "templateFile": ".templates/readme.hbs"
      }
    },
    {
      "id": "setup-typescript",
      "name": "Setup TypeScript",
      "type": "write",
      "config": {
        "file": "tsconfig.json",
        "templateFile": ".templates/tsconfig.hbs",
        "condition": "useTypeScript === true"
      }
    }
  ]
}
```

### Simple vs Handlebars

**When to use Handlebars (`.hbs`):**

- Need conditionals or loops
- Complex template logic
- Multiple variations of output
- Rich documentation generation

**When to use simple templates:**

- Basic variable replacement
- Inline templates
- Simple configuration files
- Quick file generation

### Best Practices

1. **Use `.hbs` extension** - Makes it clear which templates use Handlebars
2. **Organize templates** - Keep all `.hbs` files in a `.templates/` directory
3. **Test templates** - Use `--dry-run` to preview generated files
4. **Keep logic simple** - Complex logic belongs in prompts or conditions, not templates
5. **Document variables** - Comment what variables your templates expect
6. **Validate JSON** - When generating JSON files, ensure proper comma handling

### Troubleshooting

**Template not using Handlebars?**

- Ensure file ends with `.hbs`
- Check that `templateFile` (not `template`) is used

**Syntax errors?**

- Validate Handlebars syntax
- Check matching `{{#if}}` with `{{/if}}`
- Ensure proper nesting

**Missing variables?**

- Verify prompt IDs match template variables
- Check that prompts are marked as `global` if used across tasks
- Ensure built-in variables are spelled correctly

### Learn More

For complete Handlebars documentation:

- [Full Handlebars Templates Guide](HANDLEBARS_TEMPLATES.md)
- [Handlebars Official Documentation](https://handlebarsjs.com/)

---

## Combining Features

The real power comes from combining these features:

```json
{
  "tasks": [
    {
      "id": "setup",
      "prompts": [
        {
          "id": "framework",
          "type": "select",
          "message": "Choose framework:",
          "choices": ["react", "vue", "svelte"],
          "global": true
        },
        {
          "id": "useTypeScript",
          "type": "confirm",
          "message": "Use TypeScript?",
          "default": true,
          "global": true
        }
      ],
      "type": "write",
      "config": {
        "file": "package.json",
        "templateFile": ".templates/package-{{framework}}.hbs"
      }
    },
    {
      "id": "setup-typescript",
      "type": "write",
      "config": {
        "file": "tsconfig.json",
        "templateFile": ".templates/tsconfig-{{framework}}.hbs",
        "condition": "useTypeScript === true"
      }
    }
  ]
}
```

This example:

- Uses **global prompts** for shared values (`framework`, `useTypeScript`)
- Uses **conditional execution** to only setup TypeScript when needed
- Uses **Handlebars templates** with conditionals and dynamic file selection
- Creates a flexible, user-friendly template initialization

## Next Steps

- [Getting Started Guide](GETTING_STARTED.md) - Learn the basics
- [Task Types Reference](TASK_TYPES.md) - Explore all task types
- [Interactive Prompts](PROMPTS.md) - Master user input
- [Template Inheritance](TEMPLATE_INHERITANCE.md) - Compose templates
- [Plugin System](PLUGINS.md) - Create custom task types
- [Dry Run Mode](DRY_RUN.md) - Preview changes safely
