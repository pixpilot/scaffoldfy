---
layout: default
title: Configuration Inheritance - Scaffoldfy
---

# Configuration Inheritance

Configuration inheritance allows you to extend base configurations, promoting code reuse and modularity in your configuration files. Configurations can be loaded from local file paths or remote URLs (HTTP/HTTPS).

> **Terminology Note**: In Scaffoldfy, "configuration files" (`.json`/`.ts`) define tasks, prompts, and variables. These are what you extend using the `extends` field. The actual "template files" (`.hbs`) are Handlebars templates referenced within task configurations via the `templateFile` property.

## Overview

With configuration inheritance, you can:

- **Extend one or more base configurations** using the `extends` field
- **Load configurations from local files or remote URLs** (HTTP/HTTPS)
- **Override tasks, variables, and prompts** from base configurations using explicit merge strategies
- **Merge configurations intelligently** with smart conflict detection and resolution
- **Validate early** to catch configuration errors before user prompts
- **Create reusable configuration libraries** that can be shared across projects

## Basic Usage

### Single Inheritance

Create a base configuration file:

```json
// base-config.json
{
  "tasks": [
    {
      "id": "update-package",
      "name": "Update package.json",
      "description": "Update package information",
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
    }
  ]
}
```

Extend it in your configuration:

```json
// my-config.json
{
  "extends": "base-config.json",
  "tasks": [
    {
      "id": "cleanup-readme",
      "name": "Clean up README",
      "description": "Remove template instructions",
      "required": true,
      "enabled": true,
      "type": "write",
      "config": {
        "file": "README.md",
        "template": "# {{projectName}}\n\nYour project description here."
      }
    }
  ]
}
```

The resulting configuration will have both tasks from the base and your custom task.

### Multiple Inheritance

You can extend multiple base configurations:

```json
{
  "extends": ["base-common.json", "base-typescript.json"],
  "tasks": [
    {
      "id": "custom-task",
      "name": "Custom Task",
      "description": "Project-specific task",
      "required": true,
      "enabled": true,
      "type": "exec",
      "config": {
        "command": "echo 'Setup complete!'"
      }
    }
  ]
}
```

Tasks are merged in order, with later configs taking precedence.

## Override Strategies

**Important:** When a child configuration has a task, variable, or prompt with the same ID as a base configuration, you **must** explicitly specify an override strategy. This requirement was added to prevent accidental conflicts and make configuration inheritance more predictable.

### Available Strategies

There are two override strategies:

1. **`merge`** (default, recommended): Intelligently merges the child item with the base item
   - For tasks: Merges config, dependencies, and variables
   - For variables: Replaces the value

2. **`replace`**: Completely replaces the base item with the child item
   - No merging occurs - the base item is discarded entirely
   - Useful when you want to completely redefine an item

### Specifying Override Strategy

Add the `override` field to the conflicting task, variable, or prompt:

```json
{
  "extends": "base-config.json",
  "tasks": [
    {
      "id": "update-package",
      "name": "Custom Package Update",
      "description": "Updated description",
      "required": true,
      "enabled": true,
      "type": "update-json",
      "config": {
        "file": "package.json",
        "updates": {
          "name": "{{projectName}}",
          "version": "2.0.0"
        }
      },
      "override": "merge" // ← Required when ID conflicts with base
    }
  ]
}
```

### What Happens Without Override?

If you extend a configuration and use the same ID without specifying `override`, you'll get a clear error:

```
Task ID conflict: "update-package" is defined in multiple configurations.
  Base task from: base-config.json
  Child task from: my-config.json

You must specify an 'override' strategy ('merge' or 'replace') for the task in the child configuration.
  Override task from: my-config.json
  You must specify an override strategy: add "override": "merge" or "override": "replace" to the task.
```

### Merge Strategy in Detail

When using `override: "merge"` for tasks:

**Base configuration:**

```json
{
  "id": "setup",
  "name": "basic-setup",
  "description": "Base setup",
  "required": true,
  "enabled": true,
  "type": "write",
  "config": {
    "file": "README.md",
    "templateFile": "./base-readme.hbs"
  },
  "dependencies": ["task-a"]
}
```

**Child configuration:**

```json
{
  "id": "setup",
  "name": "enhanced-setup",
  "description": "Enhanced setup with more features",
  "required": true,
  "enabled": true,
  "type": "write",
  "config": {
    "file": "README.md",
    "template": "# {{projectName}}\n\nCustom readme"
  },
  "dependencies": ["task-b"],
  "override": "merge"
}
```

**Result after merge:**

- `name`: `"Enhanced Setup"` (from child)
- `description`: `"Enhanced setup with more features"` (from child)
- `dependencies`: `["task-a", "task-b"]` (merged from both)
- `config.file`: `"README.md"` (both have same value)
- `config.templateFile`: removed (child specified `template` instead)
- `config.template`: `"# {{projectName}}\n\nCustom readme"` (from child)

Note how the conflicting config fields (`templateFile` vs `template`) were intelligently handled - when you specify `template` in the child, it removes `templateFile` from the base to prevent validation errors.

### Replace Strategy in Detail

When using `override: "replace"`:

```json
{
  "id": "setup",
  "name": "completely-new-setup",
  "description": "Starts from scratch",
  "required": false,
  "enabled": true,
  "type": "exec",
  "config": {
    "command": "npm init -y"
  },
  "override": "replace" // Nothing from base is kept
}
```

The base task is completely ignored, and only the child task definition is used.

### Override for Variables

```json
{
  "extends": "base.json",
  "variables": [
    {
      "id": "buildDir",
      "value": "dist",
      "override": "merge" // Required when variable ID conflicts
    }
  ]
}
```

### Override for Prompts

```json
{
  "extends": "base.json",
  "prompts": [
    {
      "id": "projectName",
      "type": "input",
      "message": "Enter your awesome project name:",
      "override": "merge" // Required when prompt ID conflicts
    }
  ]
}
```

## Configurations with Only Prompts/Variables

The `tasks` array is optional. This allows you to create base configurations that only provide shared prompts and variables for child configurations to use.

### Use Case

This is particularly useful when you want to:

- Create reusable prompt collections across multiple configurations
- Define common variables that multiple child configurations should use
- Build composable configuration libraries without duplicating prompts
- Separate concerns between data collection (base) and task execution (child)

### Example: Shared Prompts Configuration

**Base configuration** (`shared-prompts.json`):

```json
{
  "prompts": [
    {
      "id": "projectName",
      "type": "input",
      "message": "What is your project name?",
      "required": true
    },
    {
      "id": "author",
      "type": "input",
      "message": "Author name?",
      "required": true
    },
    {
      "id": "useTypeScript",
      "type": "confirm",
      "message": "Use TypeScript?",
      "default": true
    }
  ],
  "variables": [
    {
      "id": "currentYear",
      "value": {
        "type": "exec",
        "value": "node -e \"console.log(new Date().getFullYear())\""
      }
    }
  ]
}
```

**Child config** that extends it:

```json
{
  "extends": "shared-prompts.json",
  "tasks": [
    {
      "id": "setup-project",
      "name": "Setup Project",
      "description": "Initialize project using shared prompts",
      "required": true,
      "enabled": true,
      "type": "update-json",
      "config": {
        "file": "package.json",
        "updates": {
          "name": "{{projectName}}",
          "author": "{{author}}",
          "year": "{{currentYear}}"
        }
      }
    }
  ]
}
```

The child configuration inherits all prompts and variables from the base configuration and can use them in its tasks without redefining them.

## Remote Configurations from URLs

Configurations can be loaded from remote URLs (HTTP or HTTPS), enabling you to share base configurations across projects and organizations.

### Loading from a URL

Specify a full URL in the `extends` field:

```json
{
  "extends": "https://raw.githubusercontent.com/your-org/congigs/main/base.json",
  "tasks": [
    {
      "id": "custom-task",
      "name": "Custom Task",
      "description": "Project-specific task",
      "required": true,
      "enabled": true,
      "type": "exec",
      "config": {
        "command": "echo 'Setup complete!'"
      }
    }
  ]
}
```

### GitHub Raw URLs

For configs stored in GitHub repositories, use the raw content URL:

```
https://raw.githubusercontent.com/owner/repo/branch/path/to/configs.json
```

Example:

```json
{
  "extends": [
    "https://raw.githubusercontent.com/your-org/configs/main/base-node.json",
    "https://raw.githubusercontent.com/your-org/configs/main/typescript.json"
  ],
  "tasks": []
}
```

### Relative URLs

When a remote config extends another config using a relative path, the path is resolved relative to the current config's URL:

```json
// https://example.com/configs/base.json
{
  "tasks": [
    {
      "id": "base-task",
      "name": "Base Task",
      "description": "Common task",
      "required": true,
      "enabled": true,
      "type": "write",
      "config": {}
    }
  ]
}

// https://example.com/configs/frameworks/react.json
{
  "extends": "../base.json",  // Resolves to https://example.com/configs/base.json
  "tasks": [
    {
      "id": "react-setup",
      "name": "React Setup",
      "description": "Setup React",
      "required": true,
      "enabled": true,
      "type": "exec",
      "config": {
        "command": "npm install react react-dom"
      }
    }
  ]
}
```

### Mixed Local and Remote Configurations

You can mix local file paths and remote URLs in your configuration inheritance:

```json
// Local configuration extending a remote base
{
  "extends": "https://example.com/org-configs/base.json",
  "tasks": [
    {
      "id": "local-task",
      "name": "Local Task",
      "description": "Project-specific task",
      "required": true,
      "enabled": true,
      "type": "write",
      "config": {}
    }
  ]
}
```

Or a remote config can extend local configs (though this is less common):

```json
// Remote config
{
  "extends": "./local-overrides.json",
  "tasks": []
}
```

### Benefits of Remote configs

- **Centralized Management**: Maintain organization-wide configs in one location
- **Version Control**: Use Git tags or branches to version your configs
- **Easy Updates**: Teams automatically get config updates without manual distribution
- **Sharing**: Share config publicly or within your organization
- **Consistency**: Ensure all projects follow the same patterns and best practices

### Caching

Remote configs are cached in memory during execution to avoid repeated network requests. Each URL is fetched only once per execution, even if multiple configs extend from it.

### Security Considerations

- Only use HTTPS URLs from trusted sources
- Review remote configs before using them in production
- Consider pinning to specific versions (e.g., Git tags) for stability
- Be aware that remote configs can change unless locked to a specific version

### Remote Template Files

When a remote configuration uses the `templateFile` property in a `template` task, the file path is automatically resolved relative to the remote configuration's location. This allows remote configurations to reference their own template files seamlessly.

#### How It Works

When you extend a remote configuration that contains tasks with `templateFile` references, the CLI automatically:

1. Tracks the source URL of each task
2. Resolves `templateFile` paths relative to the remote configuration's URL
3. Fetches the template file from the remote location
4. Processes it with the specified template engine (Handlebars for `.hbs` files)

#### Example: Remote Configuration with Template Files

**Remote base configuration** at `https://raw.githubusercontent.com/your-org/configs/main/base-node.json`:

```json
{
  "tasks": [
    {
      "id": "create-tsconfig",
      "name": "Create TypeScript Config",
      "description": "Generate tsconfig.json",
      "required": true,
      "enabled": true,
      "type": "write",
      "config": {
        "file": "tsconfig.json",
        "templateFile": "./tsconfig.hbs"
      }
    },
    {
      "id": "create-readme",
      "name": "Create README",
      "description": "Generate README.md",
      "required": true,
      "enabled": true,
      "type": "write",
      "config": {
        "file": "README.md",
        "templateFile": "../shared/readme.hbs"
      }
    }
  ]
}
```

**Template files hosted alongside the configuration:**

- `https://raw.githubusercontent.com/your-org/configs/main/tsconfig.hbs`
- `https://raw.githubusercontent.com/your-org/configs/shared/readme.hbs`

**Your local configuration** extending the remote one:

```json
{
  "extends": "https://raw.githubusercontent.com/your-org/configs/main/base-node.json",
  "tasks": [
    {
      "id": "custom-task",
      "name": "Custom Task",
      "description": "Your project-specific task",
      "required": true,
      "enabled": true,
      "type": "exec",
      "config": {
        "command": "npm install"
      }
    }
  ]
}
```

When you run this, the CLI will:

1. Fetch `base-node.json` from GitHub
2. For the `create-tsconfig` task, resolve `./tsconfig.hbs` → `https://raw.githubusercontent.com/your-org/configs/main/tsconfig.hbs`
3. For the `create-readme` task, resolve `../shared/readme.hbs` → `https://raw.githubusercontent.com/your-org/configs/shared/readme.hbs`
4. Fetch both template files from their remote locations
5. Process them with Handlebars to generate the output files

#### Path Resolution Rules

The `templateFile` paths are resolved using standard URL/path resolution:

- **Relative paths** (`./file.hbs`, `file.hbs`): Resolved relative to the configuration's directory
- **Parent directory paths** (`../file.hbs`): Navigate up from the configuration's directory
- **Absolute URLs** (`https://...`): Used as-is
- **Absolute local paths** (`/path/to/file.hbs`): Used as-is for local configurations

#### Mixed Remote and Local Template Files

You can combine remote configurations with local template files, though remote configurations with remote template files are more common for portability:

```json
{
  "extends": "https://example.com/configs/base.json",
  "tasks": [
    {
      "id": "custom-template",
      "name": "Custom Template",
      "description": "Use local template file",
      "required": true,
      "enabled": true,
      "type": "write",
      "config": {
        "file": "output.txt",
        "templateFile": "./local-template.hbs"
      }
    }
  ]
}
```

In this case, the `create-tsconfig` task from the remote configuration will fetch its template file from the remote location, while your `custom-template` task will use the local `./local-template.hbs` file.

## Task Overriding

If a child configuration defines a task with the same ID as a base configuration, the child's task completely replaces the base task:

```json
// base.json
{
  "tasks": [
    {
      "id": "setup-git",
      "name": "Initialize Git",
      "description": "Initialize git repository",
      "required": true,
      "enabled": true,
      "type": "git-init",
      "config": {
        "removeExisting": false,
        "initialCommit": true
      }
    }
  ]
}

// child.json
{
  "extends": "base.json",
  "tasks": [
    {
      "id": "setup-git",
      "name": "Custom Git Setup",
      "description": "Custom git initialization",
      "required": true,
      "enabled": true,
      "type": "git-init",
      "config": {
        "removeExisting": true,
        "initialCommit": true,
        "message": "🎉 Initial commit"
      }
    }
  ]
}
```

The child's `setup-git` task completely replaces the base version.

## Dependency and Prompt Merging

When overriding a task, dependencies are intelligently merged:

```json
// base.json
{
  "tasks": [
    {
      "id": "complex-task",
      "name": "Complex Task",
      "description": "Task with dependencies",
      "required": true,
      "enabled": true,
      "type": "write",
      "config": {},
      "dependencies": ["task-a"]
    }
  ]
}

// child.json
{
  "extends": "base.json",
  "tasks": [
    {
      "id": "complex-task",
      "name": "Enhanced Complex Task",
      "description": "Enhanced version",
      "required": true,
      "enabled": true,
      "type": "write",
      "config": { "enhanced": true },
      "dependencies": ["task-b", "task-c"]
    }
  ]
}
```

The resulting task will have:

- **Dependencies**: `["task-a", "task-b", "task-c"]` (merged and deduplicated)
- **Config**: `{ "enhanced": true }` (child overrides base)

## Relative Paths

Configs paths in `extends` are resolved relative to the config file containing them:

```
configs/
├── base/
│   └── common.json
├── typescript/
│   └── ts-base.json  (extends: "../base/common.json")
└── my-project.json    (extends: "typescript/ts-base.json")
```

## Programmatic Usage

```typescript
import { loadAndMergeConfig, loadTasksWithInheritance } from '@pixpilot/scaffoldfy';

// Load tasks with full inheritance resolution
const tasks = await loadTasksWithInheritance('./my-config.json');

// Or load and get the full configuration
const config = await loadAndMergeConfig('./my-config.json');
console.log(`Loaded ${config.tasks.length} tasks`);
```

## Advanced: Circular Dependency Detection

The system automatically detects and prevents circular dependencies:

```json
// config-a.json
{
  "extends": "config-b.json",
  "tasks": []
}

// config-b.json
{
  "extends": "config-a.json",  // ❌ Error: Circular dependency!
  "tasks": []
}
```

## Best Practices

1. **Create a library of base configurations** for common project types
2. **Use descriptive task IDs** to make overriding intentional and clear
3. **Document what can be overridden** in your base configurations
4. **Keep inheritance chains shallow** (2-3 levels max) for maintainability
5. **Version your base configurations** if they're shared across projects
6. **Test inheritance chains** to ensure tasks merge as expected
7. **Use unique IDs across all types** - All IDs must be unique across tasks, variables, and prompts. For example, you cannot have a task with ID `projectName` and a variable with the same ID `projectName`

## ID Uniqueness Validation

Starting from version 2.1, Scaffoldfy validates that all IDs are unique across tasks, variables, and prompts when configurations are merged during inheritance. This prevents naming conflicts and ensures clarity in your configuration files.

### Valid Example

```json
{
  "tasks": [
    {
      "id": "setup-project",
      "name": "Setup Project",
      "description": "Initialize the project",
      "required": true,
      "enabled": true,
      "type": "write",
      "config": {}
    }
  ],
  "variables": [
    {
      "id": "currentYear",
      "value": "2024"
    }
  ],
  "prompts": [
    {
      "id": "projectName",
      "type": "input",
      "message": "Project name?"
    }
  ]
}
```

All IDs are unique: `setup-project`, `currentYear`, and `projectName`.

### Invalid Example (Will Throw Error)

```json
{
  "tasks": [
    {
      "id": "projectName",
      "name": "Setup",
      "description": "Setup task",
      "required": true,
      "enabled": true,
      "type": "write",
      "config": {}
    }
  ],
  "prompts": [
    {
      "id": "projectName", // ❌ Error: Duplicate ID!
      "type": "input",
      "message": "Project name?"
    }
  ]
}
```

This will throw an error: `Duplicate ID "projectName" found in prompt. This ID is already used in task`

### With Inheritance

The validation also applies when configs are merged through inheritance:

```json
// base.json
{
  "variables": [
    {
      "id": "sharedId",
      "value": "base-value"
    }
  ]
}

// child.json
{
  "extends": "base.json",
  "tasks": [
    {
      "id": "sharedId",  // ❌ Error: Conflicts with variable from base!
      "name": "My Task",
      "description": "Task",
      "required": true,
      "enabled": true,
      "type": "write",
      "config": {}
    }
  ]
}
```

This will throw an error when loading the child config.

### Overriding is Allowed

Note that overriding items of the **same type** is allowed and intentional:

```json
// base.json
{
  "tasks": [
    {
      "id": "setup",
      "name": "Base Setup",
      "description": "Base setup task",
      "required": true,
      "enabled": true,
      "type": "write",
      "config": {}
    }
  ]
}

// child.json
{
  "extends": "base.json",
  "tasks": [
    {
      "id": "setup",  // ✅ OK: Overriding task with same ID
      "name": "Custom Setup",
      "description": "Customized setup",
      "required": true,
      "enabled": true,
      "type": "write",
      "config": { "custom": true }
    }
  ]
}
```

This is valid - the child's `setup` task will completely replace the base's `setup` task.

## Example: Organization Config Library

```
org-configs/
├── base.json           # Common tasks for all projects
├── node-base.json      # Node.js specific (extends: base.json)
├── ts-base.json        # TypeScript specific (extends: node-base.json)
└── react-base.json     # React specific (extends: ts-base.json)
```

Your project configuration:

```json
{
  "extends": "../org-configs/react-base.json",
  "tasks": [
    {
      "id": "project-specific-setup",
      "name": "Project Setup",
      "description": "Custom setup for this project",
      "required": true,
      "enabled": true,
      "type": "exec",
      "config": {
        "command": "npm run setup"
      }
    }
  ]
}
```

## CLI Usage

The CLI automatically handles configuration inheritance from both local files and remote URLs:

```bash
# Load configuration from local file with inheritance
scaffoldfy --config ./my-config.json

# Load configuration from remote URL
scaffoldfy --config https://example.com/configs/project-setup.json

# Dry run to see all inherited and merged tasks
scaffoldfy --config ./my-config.json --dry-run

# Dry run with remote configuration
scaffoldfy --config https://raw.githubusercontent.com/org/configs/main/base.json --dry-run
```

## API Reference

### `loadConfiguration(configPath: string): Promise<TasksConfiguration>`

Load a single configuration file from a local path or remote URL without processing inheritance.

**Parameters:**

- `configPath`: Local file path (absolute or relative) or remote URL (http/https)

**Example:**

```typescript
// Load from local file
const local = await loadConfiguration('./config.json');

// Load from URL
const remote = await loadConfiguration('https://example.com/config.json');
```

### `loadAndMergeConfiguration(configPath: string): Promise<TasksConfiguration>`

Load a configuration and recursively merge all extended configurations. Supports both local and remote configurations.

**Parameters:**

- `configPath`: Local file path or remote URL to the main configuration

**Example:**

```typescript
// Load and merge with inheritance from URL
const config = await loadAndMergeConfiguration('https://example.com/my-config.json');
console.log(`Loaded ${config.tasks.length} tasks`);
```

### `loadTasksWithInheritance(configFilePath: string): Promise<TaskDefinition[]>`

Load tasks from a file or URL, processing all inheritance, and return the final task array.

**Parameters:**

- `configFilePath`: Local file path or remote URL to the tasks configuration

**Example:**

```typescript
// Load from URL with full inheritance chain
const tasks = await loadTasksWithInheritance(
  'https://raw.githubusercontent.com/org/configs/main/nodejs.json',
);
```

### `mergeConfigurations(configs: TasksConfiguration[]): TasksConfiguration`

Merge multiple configurations manually.

### `clearConfigurationCache(): void`

Clear the internal configuration cache (useful for testing).

## Real-World Examples

### Example 1: Organization Configuration Library on GitHub

Host your organization's configurations on GitHub and reference them via raw URLs:

```json
// Your project's configuration
{
  "extends": [
    "https://raw.githubusercontent.com/acme-corp/project-configs/v1.0.0/base-node.json",
    "https://raw.githubusercontent.com/acme-corp/project-configs/v1.0.0/typescript.json"
  ],
  "tasks": [
    {
      "id": "install-deps",
      "name": "Install Project Dependencies",
      "description": "Install project-specific dependencies",
      "required": true,
      "enabled": true,
      "type": "exec",
      "config": {
        "command": "npm install"
      }
    }
  ]
}
```

**Benefits:**

- Version pinning with Git tags (v1.0.0)
- Easy updates across all projects
- Centralized maintenance

### Example 2: Public Configuration Ecosystem

Create and share public configurations:

```json
{
  "extends": "https://configs.scaffoldfy.dev/react-app/v2.json",
  "tasks": [
    {
      "id": "custom-setup",
      "name": "Custom Project Setup",
      "description": "Project-specific configuration",
      "required": true,
      "enabled": true,
      "type": "write",
      "config": {
        "file": "package.json",
        "template": "templates/package.hbs"
      }
    }
  ]
}
```

### Example 3: Private CDN for Configurations

Host configurations on a private CDN or internal server:

```json
{
  "extends": [
    "https://configs.internal.company.com/base/security.json",
    "https://configs.internal.company.com/base/compliance.json",
    "https://configs.internal.company.com/tech/nodejs-v18.json"
  ],
  "tasks": []
}
```

### Example 4: Mix of Local and Remote

Combine organization configurations with project-specific local configurations:

```json
// my-project-config.json
{
  "extends": [
    "https://raw.githubusercontent.com/org/configs/main/base.json",
    "./local-overrides.json"
  ],
  "tasks": [
    {
      "id": "project-init",
      "name": "Initialize Project",
      "description": "Project-specific initialization",
      "required": true,
      "enabled": true,
      "type": "exec",
      "config": {
        "command": "npm run init"
      }
    }
  ]
}
```

```json
// local-overrides.json (local file)
{
  "tasks": [
    {
      "id": "local-config",
      "name": "Local Configuration",
      "description": "Set up local environment",
      "required": true,
      "enabled": true,
      "type": "update-json",
      "config": {
        "file": ".env.local",
        "updates": {
          "API_URL": "http://localhost:3000"
        }
      }
    }
  ]
}
```

### Best Practices for Remote Configurations

1. **Use Version Tags**: Pin to specific versions using Git tags for stability

   ```
   https://raw.githubusercontent.com/org/configs/v1.2.3/base.json
   ```

2. **Use HTTPS**: Always use secure HTTPS URLs, never HTTP

3. **Document Dependencies**: Document what remote configurations your project depends on

4. **Test Before Deploying**: Test remote configuration changes in a staging environment

5. **Have Fallbacks**: Consider caching critical configurations locally as backups

6. **Monitor Changes**: If using branch references (like `main`), monitor for breaking changes

7. **Access Control**: For private configurations, use authenticated URLs or host on secure servers
